interface ScheduleSlotForNotify {
  startTime: Date;
  endTime: Date;
  task: {
    title: string;
    priority: string;
  };
}

const PRIORITY_EMOJI: Record<string, string> = {
  URGENT: '\u{1f534}',
  HIGH: '\u{1f7e0}',
  MEDIUM: '\u{1f7e1}',
  LOW: '\u26aa',
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Slack Block Kit 形式の通知メッセージを構築する
 */
export function buildSlackMessage(
  date: string,
  slots: ScheduleSlotForNotify[]
) {
  const totalMinutes = slots.reduce(
    (sum, s) =>
      sum + (s.endTime.getTime() - s.startTime.getTime()) / (1000 * 60),
    0
  );
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  const scheduleLines = slots
    .map((s) => {
      const emoji = PRIORITY_EMOJI[s.task.priority] ?? '\u26aa';
      return `${emoji} ${formatTime(s.startTime)}-${formatTime(s.endTime)} | ${s.task.title}`;
    })
    .join('\n');

  const timeText =
    totalHours > 0
      ? `${totalHours}時間${remainingMinutes > 0 ? `${remainingMinutes}分` : ''}`
      : `${remainingMinutes}分`;

  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `\u{1f4cb} 明日の計画 (${date})`,
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: scheduleLines || '_タスクがありません_',
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `タスク数: ${slots.length} | 合計: ${timeText}`,
          },
        ],
      },
    ],
  };
}

/**
 * Slack Webhook にメッセージを送信する
 */
export async function sendSlackNotification(
  webhookUrl: string,
  date: string,
  slots: ScheduleSlotForNotify[]
): Promise<void> {
  const message = buildSlackMessage(date, slots);

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Slack 通知の送信に失敗しました: ${errorText}`);
  }
}
