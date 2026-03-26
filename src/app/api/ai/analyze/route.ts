import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { calendarEvents, tasks } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { getAIProvider } from '@/lib/ai';
import type { CalendarEventInput } from '@/lib/ai';
import { z } from 'zod/v3';

const analyzeRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = analyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '日付の形式が正しくありません (YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  try {
    const targetDate = new Date(parsed.data.date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // DB から同期済みのカレンダーイベントを取得
    const events = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, session.user.id),
          gte(calendarEvents.startTime, startOfDay),
          lte(calendarEvents.startTime, endOfDay)
        )
      )
      .orderBy(calendarEvents.startTime);

    if (events.length === 0) {
      return NextResponse.json(
        {
          error:
            'カレンダーイベントが見つかりません。先にカレンダーを同期してください。',
        },
        { status: 400 }
      );
    }

    // AI プロバイダーでタスク抽出
    const aiInput: CalendarEventInput[] = events.map((e) => ({
      title: e.title,
      description: e.description ?? undefined,
      startTime: e.startTime.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      endTime: e.endTime.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      location: e.location ?? undefined,
    }));

    const aiProvider = getAIProvider();
    const result = await aiProvider.extractTasks(aiInput);

    // 抽出されたタスクを DB に保存
    const savedTasks = [];
    for (const extracted of result.tasks) {
      const [task] = await db
        .insert(tasks)
        .values({
          userId: session.user.id,
          title: extracted.title,
          description: extracted.description ?? null,
          priority: extracted.priority,
          estimatedMinutes: extracted.estimatedMinutes,
          sourceType: 'CALENDAR',
          aiConfidence: extracted.confidence,
          aiReasoning: extracted.reasoning,
        })
        .returning();
      savedTasks.push(task);
    }

    return NextResponse.json({
      tasks: savedTasks,
      reasoning: result.overallReasoning,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'AI 分析に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
