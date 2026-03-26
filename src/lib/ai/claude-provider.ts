import { execFileSync } from 'node:child_process';
import type {
  AIProvider,
  CalendarEventInput,
  FreeSlot,
  TaskExtractionResult,
  TaskInput,
  SchedulePlacement,
} from './types';
import { taskExtractionResultSchema, schedulePlacementSchema } from './types';
import {
  TASK_EXTRACTION_SYSTEM_PROMPT,
  buildTaskExtractionPrompt,
  SCHEDULE_PLACEMENT_SYSTEM_PROMPT,
  buildSchedulePlacementPrompt,
} from './prompts';

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
const LLM_GATEWAY = 'http://169.254.169.254/gateway/llm/anthropic/v1/messages';
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const CLAUDE_CODE_PREFIX =
  "You are Claude Code, Anthropic's official CLI for Claude.";

interface ClaudeResponse {
  content: Array<{ type: string; text?: string }>;
  error?: { message: string };
}

// --- Token Management ---

let cachedToken: string | null = null;

function isOAuthToken(key: string): boolean {
  return key.startsWith('sk-ant-oat');
}

function readKeychainToken(): string | null {
  try {
    const raw = execFileSync(
      'security',
      ['find-generic-password', '-s', 'Claude Code-credentials', '-w'],
      { encoding: 'utf-8', timeout: 5000 }
    ).trim();
    const creds = JSON.parse(raw);
    return creds?.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
}

function getAPIKey(): string | null {
  if (cachedToken) return cachedToken;

  const keychainToken = readKeychainToken();
  if (keychainToken) {
    cachedToken = keychainToken;
    return cachedToken;
  }

  cachedToken = process.env.ANTHROPIC_API_KEY ?? null;
  return cachedToken;
}

function refreshAPIKey(): string | null {
  const old = cachedToken;
  cachedToken = null;
  const fresh = readKeychainToken();
  if (fresh && fresh !== old) {
    cachedToken = fresh;
    return cachedToken;
  }
  return null;
}

// --- Endpoint Selection ---

function resolveEndpoint(): { url: string; apiKey: string | null } {
  const apiKey = getAPIKey();

  if (apiKey) {
    const endpoint = process.env.ANTHROPIC_ENDPOINT ?? ANTHROPIC_API;
    let urlStr = endpoint;
    if (isOAuthToken(apiKey) && !urlStr.includes('beta=true')) {
      urlStr += urlStr.includes('?') ? '&beta=true' : '?beta=true';
    }
    return { url: urlStr, apiKey };
  }

  return { url: LLM_GATEWAY, apiKey: null };
}

function buildHeaders(apiKey: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
  };

  if (apiKey) {
    if (isOAuthToken(apiKey)) {
      headers.Authorization = `Bearer ${apiKey}`;
      headers['anthropic-beta'] =
        'oauth-2025-04-20,interleaved-thinking-2025-05-14';
      headers['User-Agent'] = 'claude-cli/2.1.2 (external, cli)';
    } else {
      headers['x-api-key'] = apiKey;
    }
  }

  return headers;
}

function buildSystemPrompt(
  apiKey: string | null,
  system: string
): string | Array<{ type: string; text: string }> {
  if (apiKey && isOAuthToken(apiKey)) {
    return [
      { type: 'text', text: CLAUDE_CODE_PREFIX },
      { type: 'text', text: system },
    ];
  }
  return system;
}

// --- API Call ---

async function callClaude(
  system: string,
  userMessage: string
): Promise<string> {
  const endpoint = resolveEndpoint();
  const body = JSON.stringify({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0.3,
    system: buildSystemPrompt(endpoint.apiKey, system),
    messages: [{ role: 'user', content: userMessage }],
  });

  const doFetch = async (ep: { url: string; apiKey: string | null }) => {
    const response = await fetch(ep.url, {
      method: 'POST',
      headers: buildHeaders(ep.apiKey),
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[${response.status}] ${errorText}`);
    }

    const data = (await response.json()) as ClaudeResponse;
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('');
  };

  try {
    return await doFetch(endpoint);
  } catch (err) {
    // 401 + OAuth: refresh token and retry once
    if (
      endpoint.apiKey &&
      isOAuthToken(endpoint.apiKey) &&
      err instanceof Error &&
      err.message.includes('401')
    ) {
      const newKey = refreshAPIKey();
      if (newKey) {
        return doFetch(resolveEndpoint());
      }
      throw new Error('OAuth token expired and refresh failed');
    }
    throw err;
  }
}

// --- Provider Implementation ---

export class ClaudeProvider implements AIProvider {
  async extractTasks(
    events: CalendarEventInput[]
  ): Promise<TaskExtractionResult> {
    const text = await callClaude(
      TASK_EXTRACTION_SYSTEM_PROMPT,
      buildTaskExtractionPrompt(events)
    );
    return this.parseJSON(text, taskExtractionResultSchema);
  }

  async placeSchedule(
    tasks: TaskInput[],
    freeSlots: FreeSlot[]
  ): Promise<SchedulePlacement> {
    const text = await callClaude(
      SCHEDULE_PLACEMENT_SYSTEM_PROMPT,
      buildSchedulePlacementPrompt(tasks, freeSlots)
    );
    return this.parseJSON(text, schedulePlacementSchema);
  }

  private parseJSON<T>(
    text: string,
    schema: { parse: (data: unknown) => T }
  ): T {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
    const parsed = JSON.parse(jsonStr);
    return schema.parse(parsed);
  }
}
