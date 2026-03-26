/**
 * スケジュール配置ロジック
 * AI を使わず、優先度ベースのアルゴリズムでタスクを空き時間に配置する
 */

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

export interface TaskToSchedule {
  id: string;
  title: string;
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedMinutes: number;
}

export interface ScheduledSlot {
  taskId: string;
  taskTitle: string;
  startTime: Date;
  endTime: Date;
  order: number;
}

const PRIORITY_ORDER: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

/**
 * カレンダーイベントの間の空き時間を計算する
 */
export function calculateFreeSlots(
  events: TimeSlot[],
  workdayStart: Date,
  workdayEnd: Date
): TimeSlot[] {
  if (events.length === 0) {
    return [{ startTime: workdayStart, endTime: workdayEnd }];
  }

  // イベントを開始時刻でソート
  const sorted = [...events].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  const freeSlots: TimeSlot[] = [];

  // 就業開始から最初のイベントまで
  if (sorted[0].startTime > workdayStart) {
    freeSlots.push({
      startTime: workdayStart,
      endTime: sorted[0].startTime,
    });
  }

  // イベント間の空き時間
  for (let i = 0; i < sorted.length - 1; i++) {
    const currentEnd = sorted[i].endTime;
    const nextStart = sorted[i + 1].startTime;

    if (currentEnd < nextStart) {
      freeSlots.push({
        startTime: currentEnd,
        endTime: nextStart,
      });
    }
  }

  // 最後のイベントから就業終了まで
  const lastEvent = sorted[sorted.length - 1];
  if (lastEvent.endTime < workdayEnd) {
    freeSlots.push({
      startTime: lastEvent.endTime,
      endTime: workdayEnd,
    });
  }

  return freeSlots;
}

/**
 * タスクを優先度順にソートし、空き時間スロットに配置する
 *
 * アルゴリズム:
 * 1. タスクを優先度順にソート (URGENT > HIGH > MEDIUM > LOW)
 * 2. 各タスクを最も早い空きスロットに配置 (First Fit)
 * 3. スロットに収まらないタスクはスキップ
 */
export function placeTasks(
  tasks: TaskToSchedule[],
  freeSlots: TimeSlot[]
): { scheduled: ScheduledSlot[]; unscheduled: TaskToSchedule[] } {
  // 優先度でソート
  const sortedTasks = [...tasks].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );

  // 空きスロットを可変リストとして管理 (配置するたびに残り時間を更新)
  const availableSlots = freeSlots.map((s) => ({
    startTime: new Date(s.startTime),
    endTime: new Date(s.endTime),
    remainingMinutes:
      (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60),
    nextAvailableTime: new Date(s.startTime),
  }));

  const scheduled: ScheduledSlot[] = [];
  const unscheduled: TaskToSchedule[] = [];
  let order = 0;

  for (const task of sortedTasks) {
    let placed = false;

    for (const slot of availableSlots) {
      if (slot.remainingMinutes >= task.estimatedMinutes) {
        const startTime = new Date(slot.nextAvailableTime);
        const endTime = new Date(
          startTime.getTime() + task.estimatedMinutes * 60 * 1000
        );

        scheduled.push({
          taskId: task.id,
          taskTitle: task.title,
          startTime,
          endTime,
          order,
        });

        slot.nextAvailableTime = endTime;
        slot.remainingMinutes -= task.estimatedMinutes;
        order++;
        placed = true;
        break;
      }
    }

    if (!placed) {
      unscheduled.push(task);
    }
  }

  return { scheduled, unscheduled };
}
