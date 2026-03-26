import { describe, it, expect } from "vitest";
import { buildSlackMessage } from "@/lib/slack";

describe("Slack 通知", () => {
  describe("buildSlackMessage", () => {
    it("スケジュールスロットから正しいメッセージを構築するべき", () => {
      const slots = [
        {
          startTime: new Date(2026, 2, 27, 9, 0),
          endTime: new Date(2026, 2, 27, 10, 0),
          task: { title: "提案書作成", priority: "HIGH" },
        },
        {
          startTime: new Date(2026, 2, 27, 10, 30),
          endTime: new Date(2026, 2, 27, 11, 30),
          task: { title: "コードレビュー", priority: "MEDIUM" },
        },
      ];

      const message = buildSlackMessage("2026-03-27", slots);

      expect(message.blocks).toHaveLength(5);
      expect(message.blocks[0].type).toBe("header");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scheduleBlock = message.blocks[2] as any;
      expect(scheduleBlock.text.text).toContain("提案書作成");
      expect(scheduleBlock.text.text).toContain("コードレビュー");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const contextBlock = message.blocks[4] as any;
      expect(contextBlock.elements[0].text).toContain("タスク数: 2");
      expect(contextBlock.elements[0].text).toContain("2時間");
    });

    it("スロットが空の場合、タスクなしメッセージを表示するべき", () => {
      const message = buildSlackMessage("2026-03-27", []);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scheduleBlock = message.blocks[2] as any;
      expect(scheduleBlock.text.text).toContain("タスクがありません");
    });
  });
});
