import { z } from 'zod/v3';

export const extractedTaskSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW']),
  estimatedMinutes: z.number().int().positive(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export const taskExtractionResultSchema = z.object({
  tasks: z.array(extractedTaskSchema),
  overallReasoning: z.string(),
});

export type ExtractedTask = z.infer<typeof extractedTaskSchema>;
export type TaskExtractionResult = z.infer<typeof taskExtractionResultSchema>;

export const schedulePlacementSchema = z.object({
  placements: z.array(
    z.object({
      taskTitle: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      reasoning: z.string(),
    })
  ),
  overallStrategy: z.string(),
});

export type SchedulePlacement = z.infer<typeof schedulePlacementSchema>;

export interface CalendarEventInput {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
}

export interface FreeSlot {
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface TaskInput {
  title: string;
  description?: string;
  priority: string;
  estimatedMinutes: number;
}

export interface AIProvider {
  extractTasks(events: CalendarEventInput[]): Promise<TaskExtractionResult>;
  placeSchedule(
    tasks: TaskInput[],
    freeSlots: FreeSlot[]
  ): Promise<SchedulePlacement>;
}
