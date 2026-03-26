import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { calendarEvents } from '@/lib/db/schema';
import { fetchCalendarEvents, getDayRange } from '@/lib/google-calendar';
import { z } from 'zod/v3';

const syncRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = syncRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '日付の形式が正しくありません (YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  try {
    const targetDate = new Date(parsed.data.date);
    const { startDate, endDate } = getDayRange(targetDate);

    const events = await fetchCalendarEvents(
      session.user.id,
      startDate,
      endDate
    );

    let created = 0;
    let updated = 0;

    for (const event of events) {
      const result = await db
        .insert(calendarEvents)
        .values({
          userId: session.user.id,
          googleEventId: event.id,
          title: event.title,
          description: event.description ?? null,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location ?? null,
          isAllDay: event.isAllDay,
          status: event.status,
          calendarId: event.calendarId,
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [calendarEvents.userId, calendarEvents.googleEventId],
          set: {
            title: event.title,
            description: event.description ?? null,
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location ?? null,
            isAllDay: event.isAllDay,
            status: event.status,
            lastSyncedAt: new Date(),
          },
        })
        .returning();

      if (result.length > 0) {
        // If the record was just created, it won't have an updatedAt different from createdAt
        const record = result[0];
        if (record.lastSyncedAt.getTime() - new Date().getTime() < 1000) {
          created++;
        } else {
          updated++;
        }
      }
    }

    return NextResponse.json({
      synced: events.length,
      created,
      updated,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '同期に失敗しました';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
