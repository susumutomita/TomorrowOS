import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createTaskSchema } from '@/lib/validations/task';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const conditions = [eq(tasks.userId, session.user.id)];

  if (status) {
    const validStatuses = [
      'PENDING',
      'SCHEDULED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
    ] as const;
    if (validStatuses.includes(status as (typeof validStatuses)[number])) {
      conditions.push(
        eq(tasks.status, status as (typeof validStatuses)[number])
      );
    }
  }

  const userTasks = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(desc(tasks.createdAt));

  return NextResponse.json(userTasks);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '入力が不正です', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [task] = await db
    .insert(tasks)
    .values({
      userId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      priority: parsed.data.priority,
      estimatedMinutes: parsed.data.estimatedMinutes ?? null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      sourceType: 'MANUAL',
    })
    .returning();

  return NextResponse.json(task, { status: 201 });
}
