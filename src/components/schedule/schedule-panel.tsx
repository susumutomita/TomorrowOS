'use client';

import { useFetch } from '@/lib/hooks/use-fetch';

interface ScheduleSlotWithTask {
  id: string;
  startTime: string;
  endTime: string;
  order: number;
  task: {
    id: string;
    title: string;
    priority: string;
    estimatedMinutes: number | null;
  };
}

interface Schedule {
  id: string;
  date: string;
  status: string;
  notifiedAt: string | null;
  slots: ScheduleSlotWithTask[];
}

const PRIORITY_BAR_COLORS: Record<string, string> = {
  URGENT: 'bg-red-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-yellow-500',
  LOW: 'bg-gray-400',
};

export function SchedulePanel({ targetDate }: { targetDate: string }) {
  const { data: schedule } = useFetch<Schedule>(
    `/api/schedule?date=${targetDate}`
  );

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: '下書き',
    CONFIRMED: '確定',
    NOTIFIED: '通知済',
  };

  return (
    <div className="rounded-xl border border-foreground/10 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">スケジュール</h3>
        {schedule && (
          <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px]">
            {STATUS_LABELS[schedule.status] ?? schedule.status}
          </span>
        )}
      </div>

      {!schedule || !schedule.slots || schedule.slots.length === 0 ? (
        <p className="text-sm text-foreground/50">
          タスクを配置してスケジュールを生成してください
        </p>
      ) : (
        <ul className="space-y-1">
          {schedule.slots.map((slot) => (
            <li
              key={slot.id}
              className="flex items-center gap-3 rounded-lg bg-foreground/5 p-3"
            >
              <div
                className={`h-8 w-1 rounded-full ${PRIORITY_BAR_COLORS[slot.task.priority]}`}
              />
              <div className="flex-1">
                <span className="text-sm font-medium">{slot.task.title}</span>
                <div className="text-xs text-foreground/50">
                  {formatTime(slot.startTime)}〜{formatTime(slot.endTime)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
