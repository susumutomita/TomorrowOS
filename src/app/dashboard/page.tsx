import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SignOutButton } from '@/components/ui/sign-out-button';
import { CalendarPanel } from '@/components/calendar/calendar-panel';
import { TaskPanel } from '@/components/task/task-panel';
import { SchedulePanel } from '@/components/schedule/schedule-panel';
import { ActionBar } from '@/components/ui/action-bar';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  // デフォルトは明日の日付
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const targetDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-foreground/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">Tomorrow OS</h1>
            <span className="rounded-full bg-foreground/5 px-3 py-1 text-xs text-foreground/50">
              beta
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-foreground/60">
              {session.user.name}
            </span>
            <a
              href="/settings"
              className="rounded-lg border border-foreground/10 px-3 py-1.5 text-sm text-foreground/60 transition-colors hover:bg-foreground/5"
            >
              設定
            </a>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              明日の計画
              <span className="ml-3 text-base font-normal text-foreground/50">
                {targetDate}
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <CalendarPanel targetDate={targetDate} />
            <TaskPanel targetDate={targetDate} />
            <SchedulePanel targetDate={targetDate} />
          </div>

          <ActionBar targetDate={targetDate} />
        </div>
      </main>
    </div>
  );
}
