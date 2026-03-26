import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SlackSettingsForm } from '@/components/settings/slack-settings-form';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-foreground/10 px-6 py-4">
        <div className="flex items-center gap-4">
          <a
            href="/dashboard"
            className="text-sm text-foreground/60 transition-colors hover:text-foreground"
          >
            &larr; ダッシュボード
          </a>
          <h1 className="text-xl font-bold">設定</h1>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          <section>
            <h2 className="mb-4 text-lg font-semibold">Google Calendar</h2>
            <div className="rounded-xl border border-foreground/10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">接続済み</p>
                  <p className="text-xs text-foreground/50">
                    {session.user.email}
                  </p>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-300">
                  接続中
                </span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">Slack 通知</h2>
            <SlackSettingsForm />
          </section>
        </div>
      </main>
    </div>
  );
}
