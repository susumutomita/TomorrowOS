'use client';

import { useState, useEffect } from 'react';

interface SlackConfig {
  webhookUrl: string;
  channel: string | null;
  notifyTime: string;
  isEnabled: boolean;
}

export function SlackSettingsForm() {
  const [config, setConfig] = useState<SlackConfig>({
    webhookUrl: '',
    channel: '',
    notifyTime: '21:00',
    isEnabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      const res = await fetch('/api/settings/slack');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setConfig({
            webhookUrl: data.webhookUrl,
            channel: data.channel ?? '',
            notifyTime: data.notifyTime,
            isEnabled: data.isEnabled,
          });
        }
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings/slack', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: config.webhookUrl,
          channel: config.channel || undefined,
          notifyTime: config.notifyTime,
          isEnabled: config.isEnabled,
        }),
      });

      if (res.ok) {
        setMessage('保存しました');
      } else {
        const data = await res.json();
        setMessage(`エラー: ${data.error}`);
      }
    } catch {
      setMessage('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotify = async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const date = tomorrow.toISOString().split('T')[0];

    const res = await fetch('/api/slack/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    });

    if (res.ok) {
      setMessage('テスト通知を送信しました');
    } else {
      const data = await res.json();
      setMessage(`エラー: ${data.error}`);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="rounded-xl border border-foreground/10 p-6 space-y-4"
    >
      <div>
        <label className="mb-1 block text-sm font-medium">Webhook URL</label>
        <input
          type="url"
          value={config.webhookUrl}
          onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
          placeholder="https://hooks.slack.com/services/..."
          className="w-full rounded-lg border border-foreground/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/30"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          チャンネル (任意)
        </label>
        <input
          type="text"
          value={config.channel ?? ''}
          onChange={(e) => setConfig({ ...config, channel: e.target.value })}
          placeholder="#general"
          className="w-full rounded-lg border border-foreground/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/30"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">通知時刻</label>
        <input
          type="time"
          value={config.notifyTime}
          onChange={(e) => setConfig({ ...config, notifyTime: e.target.value })}
          className="rounded-lg border border-foreground/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/30"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isEnabled"
          checked={config.isEnabled}
          onChange={(e) =>
            setConfig({ ...config, isEnabled: e.target.checked })
          }
          className="rounded"
        />
        <label htmlFor="isEnabled" className="text-sm">
          通知を有効にする
        </label>
      </div>

      {message && (
        <p
          className={`text-sm ${message.startsWith('エラー') ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}
        >
          {message}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存'}
        </button>
        <button
          type="button"
          onClick={handleTestNotify}
          className="rounded-lg border border-foreground/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-foreground/5"
        >
          テスト通知
        </button>
      </div>
    </form>
  );
}
