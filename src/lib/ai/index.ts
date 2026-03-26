import type { AIProvider } from './types';
import { ClaudeProvider } from './claude-provider';
import { GeminiProvider } from './gemini-provider';

export type { AIProvider } from './types';
export type {
  ExtractedTask,
  TaskExtractionResult,
  SchedulePlacement,
  CalendarEventInput,
  FreeSlot,
  TaskInput,
} from './types';

let providerInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (providerInstance) return providerInstance;

  const provider = process.env.AI_PROVIDER || 'claude';

  switch (provider) {
    case 'gemini':
      providerInstance = new GeminiProvider();
      break;
    case 'claude':
    default:
      providerInstance = new ClaudeProvider();
      break;
  }

  return providerInstance;
}
