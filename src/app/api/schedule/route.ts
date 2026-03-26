import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { schedules, scheduleSlots, tasks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod/v3';

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({ date: searchParams.get('date') });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'date パラメータが必要です (YYYY-MM-DD)' },
      { status: 400 }
    );
  }

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
    return NextResponse.json(null);
  }

  const slots = await db
    .select({
      slot: scheduleSlots,
      task: tasks,
    })
    .from(scheduleSlots)
    .innerJoin(tasks, eq(scheduleSlots.taskId, tasks.id))
    .where(eq(scheduleSlots.scheduleId, schedule.id))
    .orderBy(scheduleSlots.order);

  return NextResponse.json({
    ...schedule,
    slots: slots.map((s) => ({
      ...s.slot,
      task: s.task,
    })),
  });
}
