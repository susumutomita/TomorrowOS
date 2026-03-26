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

export function CalendarPanel({ targetDate }: { targetDate: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const syncRes = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: targetDate }),
      });

      if (!syncRes.ok) {
        const data = await syncRes.json();
        throw new Error(data.error || '同期に失敗しました');
      }

      // 同期後にイベントを取得
      const eventsRes = await fetch(`/api/calendar/events?date=${targetDate}`);
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '同期に失敗しました');
    } finally {
      setSyncing(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="rounded-xl border border-foreground/10 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">カレンダー予定</h3>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-lg bg-foreground/5 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-foreground/10 disabled:opacity-50"
        >
          {syncing ? '同期中...' : '同期'}
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      {events.length === 0 ? (
        <p className="text-sm text-foreground/50">
          Google Calendar を同期して予定を取得してください
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li key={event.id} className="rounded-lg bg-foreground/5 p-3">
              <div className="flex items-start justify-between">
                <span className="text-sm font-medium">{event.title}</span>
                {event.isAllDay ? (
                  <span className="text-xs text-foreground/50">終日</span>
                ) : (
                  <span className="text-xs text-foreground/50">
                    {formatTime(event.startTime)}〜{formatTime(event.endTime)}
                  </span>
                )}
              </div>
              {event.location && (
                <p className="mt-1 text-xs text-foreground/40">
                  @ {event.location}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
