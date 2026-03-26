import type { CalendarEventInput, FreeSlot, TaskInput } from './types';

export const TASK_EXTRACTION_SYSTEM_PROMPT = `あなたはワークオーケストレーション AI です。
カレンダーの予定情報から、ユーザーが翌日に取り組むべきタスクを抽出し、優先順位を付けてください。

ルール:
- 会議の準備・フォローアップタスクを抽出する
- 予定のタイトルや説明から具体的なアクションアイテムを推測する
- 各タスクに所要時間の見積もりを付ける
- 優先度は URGENT/HIGH/MEDIUM/LOW で付ける
- confidence は 0-1 の数値で、抽出の確信度を示す

必ず以下の JSON 形式で返してください。JSON 以外のテキストは含めないでください:
{
  "tasks": [
    {
      "title": "タスク名",
      "description": "具体的な内容",
      "priority": "URGENT|HIGH|MEDIUM|LOW",
      "estimatedMinutes": 30,
      "confidence": 0.85,
      "reasoning": "このタスクを抽出した理由"
    }
  ],
  "overallReasoning": "全体的な分析"
}`;

export function buildTaskExtractionPrompt(
  events: CalendarEventInput[]
): string {
  const eventsText = events
    .map(
      (e) =>
        `- ${e.startTime}〜${e.endTime}: ${e.title}${e.description ? ` (${e.description})` : ''}${e.location ? ` @${e.location}` : ''}`
    )
    .join('\n');

  return `以下は明日のカレンダー予定です:\n\n${eventsText}\n\nこれらの予定から、準備すべきタスクやアクションアイテムを抽出してください。`;
}

export const SCHEDULE_PLACEMENT_SYSTEM_PROMPT = `あなたはスケジュール最適化 AI です。
タスク一覧と空き時間スロットを受け取り、最適なスケジュール配置を提案してください。

ルール:
- 優先度の高いタスクを集中力の高い午前中に配置する
- 類似タスクをまとめて配置する
- タスクの推定時間がスロットに収まるように配置する
- すべてのタスクが配置できない場合は、優先度の高いものから配置する

必ず以下の JSON 形式で返してください。JSON 以外のテキストは含めないでください:
{
  "placements": [
    {
      "taskTitle": "タスク名",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "reasoning": "この時間帯に配置した理由"
    }
  ],
  "overallStrategy": "全体的な配置戦略の説明"
}`;

export function buildSchedulePlacementPrompt(
  tasks: TaskInput[],
  freeSlots: FreeSlot[]
): string {
  const tasksText = tasks
    .map(
      (t) =>
        `- ${t.title} (優先度: ${t.priority}, 推定: ${t.estimatedMinutes}分)${t.description ? `: ${t.description}` : ''}`
    )
    .join('\n');

  const slotsText = freeSlots
    .map((s) => `- ${s.startTime}〜${s.endTime} (${s.durationMinutes}分)`)
    .join('\n');

  return `以下のタスクを空き時間に配置してください:\n\nタスク:\n${tasksText}\n\n空き時間:\n${slotsText}`;
}
