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

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY!;
    this.model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  }

  async extractTasks(
    events: CalendarEventInput[]
  ): Promise<TaskExtractionResult> {
    const text = await this.callGemini(
      TASK_EXTRACTION_SYSTEM_PROMPT,
      buildTaskExtractionPrompt(events)
    );
    return this.parseJSON(text, taskExtractionResultSchema);
  }

  async placeSchedule(
    tasks: TaskInput[],
    freeSlots: FreeSlot[]
  ): Promise<SchedulePlacement> {
    const text = await this.callGemini(
      SCHEDULE_PLACEMENT_SYSTEM_PROMPT,
      buildSchedulePlacementPrompt(tasks, freeSlots)
    );
    return this.parseJSON(text, schedulePlacementSchema);
  }

  private async callGemini(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${error}`);
    }

    const data = (await response.json()) as {
      candidates: Array<{
        content: { parts: Array<{ text: string }> };
      }>;
    };

    return data.candidates[0].content.parts[0].text;
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
