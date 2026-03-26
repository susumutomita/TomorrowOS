import { describe, it, expect } from "vitest";
import {
  buildTaskExtractionPrompt,
  buildSchedulePlacementPrompt,
} from "@/lib/ai/prompts";
import {
  taskExtractionResultSchema,
  schedulePlacementSchema,
} from "@/lib/ai/types";

describe("AI プロンプト構築", () => {
  describe("buildTaskExtractionPrompt", () => {
    it("カレンダーイベントからプロンプトを正しく構築するべき", () => {
      const events = [
        {
          title: "プロジェクト A 定例",
          description: "進捗報告と次週の計画",
          startTime: "10:00",
          endTime: "11:00",
          location: "会議室 B",
        },
        {
          title: "ランチ",
          startTime: "12:00",
          endTime: "13:00",
        },
      ];

      const prompt = buildTaskExtractionPrompt(events);

      expect(prompt).toContain("プロジェクト A 定例");
      expect(prompt).toContain("進捗報告と次週の計画");
      expect(prompt).toContain("@会議室 B");
      expect(prompt).toContain("ランチ");
      expect(prompt).not.toContain("undefined");
    });

    it("説明や場所がないイベントも正しく処理するべき", () => {
      const events = [
        {
          title: "朝会",
          startTime: "09:00",
          endTime: "09:15",
        },
      ];

      const prompt = buildTaskExtractionPrompt(events);

      expect(prompt).toContain("朝会");
      expect(prompt).not.toContain("undefined");
      expect(prompt).not.toContain("@");
    });
  });

  describe("buildSchedulePlacementPrompt", () => {
    it("タスクと空きスロットからプロンプトを正しく構築するべき", () => {
      const tasks = [
        {
          title: "提案書作成",
          description: "クライアント向け",
          priority: "HIGH",
          estimatedMinutes: 60,
        },
        {
          title: "コードレビュー",
          priority: "MEDIUM",
          estimatedMinutes: 30,
        },
      ];

      const freeSlots = [
        {
          startTime: "09:00",
          endTime: "10:00",
          durationMinutes: 60,
        },
        {
          startTime: "14:00",
          endTime: "16:00",
          durationMinutes: 120,
        },
      ];

      const prompt = buildSchedulePlacementPrompt(tasks, freeSlots);

      expect(prompt).toContain("提案書作成");
      expect(prompt).toContain("HIGH");
      expect(prompt).toContain("60分");
      expect(prompt).toContain("09:00");
      expect(prompt).toContain("120分");
    });
  });
});

describe("AI レスポンススキーマ", () => {
  describe("taskExtractionResultSchema", () => {
    it("有効なレスポンスをパースするべき", () => {
      const validResponse = {
        tasks: [
          {
            title: "議事録の準備",
            description: "定例会議用の議事録テンプレートを準備する",
            priority: "HIGH",
            estimatedMinutes: 15,
            confidence: 0.9,
            reasoning: "会議の前に準備が必要",
          },
        ],
        overallReasoning: "会議の準備タスクを抽出しました",
      };

      const result = taskExtractionResultSchema.parse(validResponse);
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].priority).toBe("HIGH");
    });

    it("無効な優先度でエラーを投げるべき", () => {
      const invalidResponse = {
        tasks: [
          {
            title: "test",
            priority: "INVALID",
            estimatedMinutes: 10,
            confidence: 0.5,
            reasoning: "test",
          },
        ],
        overallReasoning: "test",
      };

      expect(() =>
        taskExtractionResultSchema.parse(invalidResponse),
      ).toThrow();
    });
  });

  describe("schedulePlacementSchema", () => {
    it("有効な配置レスポンスをパースするべき", () => {
      const validResponse = {
        placements: [
          {
            taskTitle: "提案書作成",
            startTime: "09:00",
            endTime: "10:00",
            reasoning: "午前中の集中力が高い時間帯",
          },
        ],
        overallStrategy: "優先度の高いタスクを午前に配置",
      };

      const result = schedulePlacementSchema.parse(validResponse);
      expect(result.placements).toHaveLength(1);
    });
  });
});
