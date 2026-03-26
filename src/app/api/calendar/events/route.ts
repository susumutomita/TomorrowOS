import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { calendarEvents } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
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

  const targetDate = new Date(parsed.data.date);
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

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

  return NextResponse.json(events);
}
