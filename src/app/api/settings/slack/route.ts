import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { slackConfigs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod/v3';

const slackConfigSchema = z.object({
  webhookUrl: z.string().url('有効な URL を入力してください'),
  channel: z.string().optional(),
  notifyTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'HH:MM 形式で入力してください')
    .default('21:00'),
  isEnabled: z.boolean().default(true),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const [config] = await db
    .select()
    .from(slackConfigs)
    .where(eq(slackConfigs.userId, session.user.id))
    .limit(1);

  return NextResponse.json(config ?? null);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = slackConfigSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '入力が不正です', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [config] = await db
    .insert(slackConfigs)
    .values({
      userId: session.user.id,
      webhookUrl: parsed.data.webhookUrl,
      channel: parsed.data.channel ?? null,
      notifyTime: parsed.data.notifyTime,
      isEnabled: parsed.data.isEnabled,
    })
    .onConflictDoUpdate({
      target: slackConfigs.userId,
      set: {
        webhookUrl: parsed.data.webhookUrl,
        channel: parsed.data.channel ?? null,
        notifyTime: parsed.data.notifyTime,
        isEnabled: parsed.data.isEnabled,
      },
    })
    .returning();

  return NextResponse.json(config);
}
