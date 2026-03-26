'use client';

import { useState } from 'react';

export function ActionBar({ targetDate }: { targetDate: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAction = async (
    action: string,
    url: string,
    successMessage: string
  ) => {
    setLoading(action);
    setMessage(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: targetDate }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(`エラー: ${data.error}`);
        return;
      }

      setMessage(successMessage);

      // ページを再読み込みして最新の状態を反映
      window.location.reload();
    } catch {
      setMessage('エラーが発生しました');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-6">
      {message && (
        <p
          className={`mb-3 text-sm ${message.startsWith('エラー') ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}
        >
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() =>
            handleAction(
              'sync',
              '/api/calendar/sync',
              'カレンダーを同期しました'
            )
          }
          disabled={loading !== null}
          className="rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-foreground/5 disabled:opacity-50"
        >
          {loading === 'sync' ? '同期中...' : 'カレンダー同期'}
        </button>

        <button
          onClick={() =>
            handleAction(
              'analyze',
              '/api/ai/analyze',
              'AI がタスクを抽出しました'
            )
          }
          disabled={loading !== null}
          className="rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-foreground/5 disabled:opacity-50"
        >
          {loading === 'analyze' ? '分析中...' : 'AI でタスク抽出'}
        </button>

        <button
          onClick={() =>
            handleAction(
              'generate',
              '/api/schedule/generate',
              'スケジュールを生成しました'
            )
          }
          disabled={loading !== null}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading === 'generate' ? '生成中...' : 'スケジュール生成'}
        </button>

        <button
          onClick={() =>
            handleAction('notify', '/api/slack/notify', 'Slack に通知しました')
          }
          disabled={loading !== null}
          className="rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-foreground/5 disabled:opacity-50"
        >
          {loading === 'notify' ? '送信中...' : 'Slack に通知'}
        </button>
      </div>
    </div>
  );
}
