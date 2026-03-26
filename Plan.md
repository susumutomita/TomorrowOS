# Development Plan

## 実行計画 (Exec Plans)

### フェーズ 1 MVP - 2026-03-26

**目的 (Objective)**:
- AI が「明日の仕事」を自動設計するワークオーケストレーションツールの MVP を構築する

**制約 (Guardrails)**:
- 無料で動かせること (クレカ不要)
- AI API 呼び出しは最小限に。ロジックでできる部分はコードで実装する
- ローカルは Claude Code ゲートウェイ、クラウドは Gemini API で AI プロバイダーを切り替え可能にする

**タスク (TODOs)**:
- [x] Next.js App Router プロジェクト初期化
- [x] Drizzle ORM セットアップとデータモデル定義
- [x] NextAuth.js (Google OAuth + Drizzle Adapter) 認証基盤構築
- [x] AI プロバイダー抽象化レイヤー (Claude + Gemini 切り替え)
- [x] Claude Code Keychain OAuth トークン対応 (DeepForm 参考)
- [x] Google Calendar 連携 API (sync / events)
- [x] タスク管理 CRUD API
- [x] AI タスク分析 API
- [x] スケジューラー (優先度ベースの空き時間配置アルゴリズム)
- [x] スケジュール生成 API
- [x] Slack 通知 (Block Kit メッセージ + Webhook)
- [x] ダッシュボード UI (3 カラム: カレンダー / タスク / スケジュール)
- [x] 設定ページ (Slack Webhook 設定)
- [x] CI を Next.js 対応に更新
- [ ] Supabase プロジェクト作成とマイグレーション実行
- [ ] Google Cloud Console で OAuth 設定
- [ ] Vercel デプロイ

**検証手順 (Validation)**:
```bash
bun run lint      # ESLint
bun run typecheck # TypeScript strict mode
bun run test      # Vitest (19 tests)
bun run build     # Next.js production build
```

**進捗ログ (Progress Log)**:
- [2026-03-26 09:25] 初期プロジェクト構造を分析。テンプレートから Next.js への移行を決定
- [2026-03-26 09:35] 技術スタック決定: Next.js + NextAuth + Drizzle + Supabase + Claude/Gemini
- [2026-03-26 09:40] Next.js プロジェクト初期化、Tailwind CSS v4 セットアップ
- [2026-03-26 09:42] Drizzle ORM スキーマ定義 (9 テーブル、4 enum)
- [2026-03-26 09:45] NextAuth.js 認証基盤、ログインページ、middleware 構築
- [2026-03-26 09:47] AI プロバイダー抽象化 (Claude + Gemini 切り替え)
- [2026-03-26 09:48] スケジューラーをロジックベースで実装 (AI 非依存)
- [2026-03-26 09:50] Claude Provider を DeepForm 参考に Keychain OAuth 対応
- [2026-03-26 09:52] 全 API エンドポイント実装 (calendar, tasks, ai, schedule, slack, settings)
- [2026-03-26 09:55] ダッシュボード UI (3 カラム + アクションバー) と設定ページ実装
- [2026-03-26 09:55] lint/typecheck/test/build すべて Green 確認
