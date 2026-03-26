import { google } from 'googleapis';
import { getGoogleAccessToken } from '@/lib/auth';

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  isAllDay: boolean;
  status: string;
  calendarId: string;
}

/**
 * Google Calendar API からイベントを取得する
 */
export async function fetchCalendarEvents(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<GoogleCalendarEvent[]> {
  const accessToken = await getGoogleAccessToken(userId);
  if (!accessToken) {
    throw new Error(
      'Google Calendar のアクセストークンが見つかりません。再ログインしてください。'
    );
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  });

  const events = response.data.items ?? [];

  return events.map((event) => {
    const isAllDay = !event.start?.dateTime;
    const startTime = isAllDay
      ? new Date(event.start?.date ?? '')
      : new Date(event.start?.dateTime ?? '');
    const endTime = isAllDay
      ? new Date(event.end?.date ?? '')
      : new Date(event.end?.dateTime ?? '');

    return {
      id: event.id ?? '',
      title: event.summary ?? '(無題)',
      description: event.description ?? undefined,
      startTime,
      endTime,
      location: event.location ?? undefined,
      isAllDay,
      status: event.status ?? 'confirmed',
      calendarId: 'primary',
    };
  });
}

/**
 * 指定日の就業時間の開始・終了を返す
 */
export function getWorkdayBounds(
  date: Date,
  startHour = 9,
  endHour = 18
): { workdayStart: Date; workdayEnd: Date } {
  const workdayStart = new Date(date);
  workdayStart.setHours(startHour, 0, 0, 0);

  const workdayEnd = new Date(date);
  workdayEnd.setHours(endHour, 0, 0, 0);

  return { workdayStart, workdayEnd };
}

/**
 * 指定日のカレンダー取得用の日付範囲を返す (日の始まりから終わりまで)
 */
export function getDayRange(date: Date): { startDate: Date; endDate: Date } {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}
