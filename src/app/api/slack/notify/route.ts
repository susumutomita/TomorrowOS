import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { slackConfigs, schedules, scheduleSlots, tasks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendSlackNotification } from '@/lib/slack';
import { z } from 'zod/v3';

const notifyRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = notifyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '日付の形式が正しくありません (YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  try {
    // Slack 設定を取得
    const [config] = await db
      .select()
      .from(slackConfigs)
      .where(eq(slackConfigs.userId, session.user.id))
      .limit(1);

    if (!config || !config.isEnabled) {
      return NextResponse.json(
        { error: 'Slack 通知が設定されていません' },
        { status: 400 }
      );
    }

    // スケジュールを取得
    const [schedule] = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.userId, session.user.id),
          eq(schedules.date, parsed.data.date)
        )
      )
      .limit(1);

    if (!schedule) {
      return NextResponse.json(
        { error: 'この日のスケジュールがありません' },
        { status: 400 }
      );
    }

    // スロットとタスクを取得
    const slots = await db
      .select({
        startTime: scheduleSlots.startTime,
        endTime: scheduleSlots.endTime,
        taskTitle: tasks.title,
        taskPriority: tasks.priority,
      })
      .from(scheduleSlots)
      .innerJoin(tasks, eq(scheduleSlots.taskId, tasks.id))
      .where(eq(scheduleSlots.scheduleId, schedule.id))
      .orderBy(scheduleSlots.order);

    const slotsForNotify = slots.map((s) => ({
      startTime: s.startTime,
      endTime: s.endTime,
      task: {
        title: s.taskTitle,
        priority: s.taskPriority,
      },
    }));

    // Slack に送信
    await sendSlackNotification(
      config.webhookUrl,
      parsed.data.date,
      slotsForNotify
    );

    // スケジュールの通知日時を更新
    const notifiedAt = new Date();
    await db
      .update(schedules)
      .set({ status: 'NOTIFIED', notifiedAt, updatedAt: notifiedAt })
      .where(eq(schedules.id, schedule.id));

    return NextResponse.json({
      success: true,
      notifiedAt: notifiedAt.toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '通知の送信に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
