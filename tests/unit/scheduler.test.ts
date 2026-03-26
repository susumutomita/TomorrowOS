import { describe, it, expect } from "vitest";
import {
  calculateFreeSlots,
  placeTasks,
  type TimeSlot,
  type TaskToSchedule,
} from "@/lib/scheduler";

function makeDate(hour: number, minute = 0): Date {
  return new Date(2026, 2, 27, hour, minute);
}

describe("スケジューラー", () => {
  describe("calculateFreeSlots", () => {
    const workdayStart = makeDate(9);
    const workdayEnd = makeDate(18);

    it("イベントがない場合、就業時間全体が空きスロットになるべき", () => {
      const result = calculateFreeSlots([], workdayStart, workdayEnd);

      expect(result).toHaveLength(1);
      expect(result[0].startTime).toEqual(workdayStart);
      expect(result[0].endTime).toEqual(workdayEnd);
    });

    it("イベントの前後と間の空き時間を正しく計算するべき", () => {
      const events: TimeSlot[] = [
        { startTime: makeDate(10), endTime: makeDate(11) },
        { startTime: makeDate(14), endTime: makeDate(15) },
      ];

      const result = calculateFreeSlots(events, workdayStart, workdayEnd);

      expect(result).toHaveLength(3);
      // 9:00-10:00
      expect(result[0].startTime).toEqual(makeDate(9));
      expect(result[0].endTime).toEqual(makeDate(10));
      // 11:00-14:00
      expect(result[1].startTime).toEqual(makeDate(11));
      expect(result[1].endTime).toEqual(makeDate(14));
      // 15:00-18:00
      expect(result[2].startTime).toEqual(makeDate(15));
      expect(result[2].endTime).toEqual(makeDate(18));
    });

    it("就業開始時刻から始まるイベントがある場合、先頭の空きスロットがないべき", () => {
      const events: TimeSlot[] = [
        { startTime: makeDate(9), endTime: makeDate(10) },
      ];

      const result = calculateFreeSlots(events, workdayStart, workdayEnd);

      expect(result).toHaveLength(1);
      expect(result[0].startTime).toEqual(makeDate(10));
      expect(result[0].endTime).toEqual(makeDate(18));
    });

    it("連続するイベントの間に空きがない場合、スロットを作らないべき", () => {
      const events: TimeSlot[] = [
        { startTime: makeDate(10), endTime: makeDate(11) },
        { startTime: makeDate(11), endTime: makeDate(12) },
      ];

      const result = calculateFreeSlots(events, workdayStart, workdayEnd);

      expect(result).toHaveLength(2);
      expect(result[0].startTime).toEqual(makeDate(9));
      expect(result[0].endTime).toEqual(makeDate(10));
      expect(result[1].startTime).toEqual(makeDate(12));
      expect(result[1].endTime).toEqual(makeDate(18));
    });

    it("ソートされていないイベントも正しく処理するべき", () => {
      const events: TimeSlot[] = [
        { startTime: makeDate(14), endTime: makeDate(15) },
        { startTime: makeDate(10), endTime: makeDate(11) },
      ];

      const result = calculateFreeSlots(events, workdayStart, workdayEnd);

      expect(result).toHaveLength(3);
    });
  });

  describe("placeTasks", () => {
    it("優先度の高いタスクを先に配置するべき", () => {
      const tasks: TaskToSchedule[] = [
        {
          id: "1",
          title: "低優先度タスク",
          priority: "LOW",
          estimatedMinutes: 30,
        },
        {
          id: "2",
          title: "緊急タスク",
          priority: "URGENT",
          estimatedMinutes: 30,
        },
        {
          id: "3",
          title: "高優先度タスク",
          priority: "HIGH",
          estimatedMinutes: 30,
        },
      ];

      const freeSlots: TimeSlot[] = [
        { startTime: makeDate(9), endTime: makeDate(12) },
      ];

      const { scheduled } = placeTasks(tasks, freeSlots);

      expect(scheduled).toHaveLength(3);
      expect(scheduled[0].taskId).toBe("2"); // URGENT first
      expect(scheduled[1].taskId).toBe("3"); // HIGH second
      expect(scheduled[2].taskId).toBe("1"); // LOW last
    });

    it("空きスロットに収まらないタスクは未スケジュールリストに入るべき", () => {
      const tasks: TaskToSchedule[] = [
        {
          id: "1",
          title: "長いタスク",
          priority: "HIGH",
          estimatedMinutes: 120,
        },
        {
          id: "2",
          title: "短いタスク",
          priority: "MEDIUM",
          estimatedMinutes: 30,
        },
      ];

      const freeSlots: TimeSlot[] = [
        { startTime: makeDate(9), endTime: makeDate(10) }, // 60 min only
      ];

      const { scheduled, unscheduled } = placeTasks(tasks, freeSlots);

      expect(scheduled).toHaveLength(1);
      expect(scheduled[0].taskId).toBe("2");
      expect(unscheduled).toHaveLength(1);
      expect(unscheduled[0].id).toBe("1");
    });

    it("複数のスロットにまたがってタスクを配置するべき", () => {
      const tasks: TaskToSchedule[] = [
        {
          id: "1",
          title: "タスク A",
          priority: "HIGH",
          estimatedMinutes: 60,
        },
        {
          id: "2",
          title: "タスク B",
          priority: "MEDIUM",
          estimatedMinutes: 60,
        },
      ];

      const freeSlots: TimeSlot[] = [
        { startTime: makeDate(9), endTime: makeDate(10) }, // 60 min
        { startTime: makeDate(11), endTime: makeDate(12) }, // 60 min
      ];

      const { scheduled } = placeTasks(tasks, freeSlots);

      expect(scheduled).toHaveLength(2);
      expect(scheduled[0].startTime).toEqual(makeDate(9));
      expect(scheduled[1].startTime).toEqual(makeDate(11));
    });

    it("タスクが空の場合、空の結果を返すべき", () => {
      const freeSlots: TimeSlot[] = [
        { startTime: makeDate(9), endTime: makeDate(18) },
      ];

      const { scheduled, unscheduled } = placeTasks([], freeSlots);

      expect(scheduled).toHaveLength(0);
      expect(unscheduled).toHaveLength(0);
    });

    it("空きスロットが空の場合、全タスクが未スケジュールになるべき", () => {
      const tasks: TaskToSchedule[] = [
        {
          id: "1",
          title: "タスク",
          priority: "HIGH",
          estimatedMinutes: 30,
        },
      ];

      const { scheduled, unscheduled } = placeTasks(tasks, []);

      expect(scheduled).toHaveLength(0);
      expect(unscheduled).toHaveLength(1);
    });
  });
});
