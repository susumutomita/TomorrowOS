import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  tasks,
  calendarEvents,
  schedules,
  scheduleSlots,
} from '@/lib/db/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import {
  calculateFreeSlots,
  placeTasks,
  type TimeSlot,
  type TaskToSchedule,
} from '@/lib/scheduler';
import { getWorkdayBounds } from '@/lib/google-calendar';
import { z } from 'zod/v3';

const generateRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = generateRequestSchema.safeParse(body);
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

    // カレンダーイベントを取得
    const events = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, session.user.id),
          gte(calendarEvents.startTime, startOfDay),
          lte(calendarEvents.startTime, endOfDay),
          eq(calendarEvents.isAllDay, false)
        )
      )
      .orderBy(calendarEvents.startTime);

    // 未完了タスクを取得
    const pendingTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, session.user.id),
          inArray(tasks.status, ['PENDING', 'SCHEDULED'])
        )
      );

    if (pendingTasks.length === 0) {
      return NextResponse.json(
        { error: 'スケジュールに配置するタスクがありません' },
        { status: 400 }
      );
    }

    // 空き時間を計算
    const { workdayStart, workdayEnd } = getWorkdayBounds(targetDate);
    const eventSlots: TimeSlot[] = events.map((e) => ({
      startTime: e.startTime,
      endTime: e.endTime,
    }));
    const freeSlots = calculateFreeSlots(eventSlots, workdayStart, workdayEnd);

    // タスクを空き時間に配置
    const tasksToSchedule: TaskToSchedule[] = pendingTasks
      .filter((t) => t.estimatedMinutes != null && t.estimatedMinutes > 0)
      .map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        estimatedMinutes: t.estimatedMinutes!,
      }));

    const { scheduled, unscheduled } = placeTasks(tasksToSchedule, freeSlots);

    // スケジュールを DB に保存 (既存があれば置き換え)
    const existingSchedule = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.userId, session.user.id),
          eq(schedules.date, parsed.data.date)
        )
      )
      .limit(1);

    let scheduleId: string;

    if (existingSchedule.length > 0) {
      scheduleId = existingSchedule[0].id;
      // 既存スロットを削除
      await db
        .delete(scheduleSlots)
        .where(eq(scheduleSlots.scheduleId, scheduleId));
      // ステータスをリセット
      await db
        .update(schedules)
        .set({ status: 'DRAFT', updatedAt: new Date() })
        .where(eq(schedules.id, scheduleId));
    } else {
      const [newSchedule] = await db
        .insert(schedules)
        .values({
          userId: session.user.id,
          date: parsed.data.date,
          status: 'DRAFT',
        })
        .returning();
      scheduleId = newSchedule.id;
    }

    // スロットを保存
    for (const slot of scheduled) {
      await db.insert(scheduleSlots).values({
        scheduleId,
        taskId: slot.taskId,
        startTime: slot.startTime,
        endTime: slot.endTime,
        order: slot.order,
      });

      // タスクのステータスを SCHEDULED に更新
      await db
        .update(tasks)
        .set({ status: 'SCHEDULED', updatedAt: new Date() })
        .where(eq(tasks.id, slot.taskId));
    }

    // 結果を取得して返す
    const resultSlots = await db
      .select()
      .from(scheduleSlots)
      .where(eq(scheduleSlots.scheduleId, scheduleId))
      .orderBy(scheduleSlots.order);

    return NextResponse.json({
      scheduleId,
      date: parsed.data.date,
      slots: resultSlots,
      unscheduledTasks: unscheduled.map((t) => ({
        id: t.id,
        title: t.title,
        reason: '空き時間が不足しています',
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'スケジュール生成に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
