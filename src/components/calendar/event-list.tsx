'use client';

import { useState } from 'react';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  isAllDay: boolean;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function CalendarEventList({ date }: { date: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const syncRes = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });
      if (!syncRes.ok) {
        const err = await syncRes.json();
        alert(err.error || '同期に失敗しました');
        return;
      }

      const eventsRes = await fetch(`/api/calendar/events?date=${date}`);
      if (eventsRes.ok) {
        setEvents(await eventsRes.json());
        setSynced(true);
      }
    } catch {
      alert('同期中にエラーが発生しました');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">カレンダー予定</h3>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-lg bg-foreground/10 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-foreground/20 disabled:opacity-50"
        >
          {syncing ? '同期中...' : '同期'}
        </button>
      </div>

      {!synced && events.length === 0 && (
        <p className="text-sm text-foreground/50">
          Google Calendar を同期して予定を表示
        </p>
      )}

      <div className="space-y-2">
        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-lg border border-foreground/5 bg-foreground/[0.02] p-3"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium">{event.title}</p>
              {!event.isAllDay && (
                <span className="text-xs text-foreground/50">
                  {formatTime(event.startTime)}-{formatTime(event.endTime)}
                </span>
              )}
            </div>
            {event.location && (
              <p className="mt-1 text-xs text-foreground/40">
                @ {event.location}
              </p>
            )}
          </div>
        ))}
      </div>

      {synced && events.length === 0 && (
        <p className="text-sm text-foreground/50">この日の予定はありません</p>
      )}
    </div>
  );
}
