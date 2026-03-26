import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { updateTaskSchema } from '@/lib/validations/task';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '入力が不正です', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined)
    updateData.description = parsed.data.description;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.priority !== undefined)
    updateData.priority = parsed.data.priority;
  if (parsed.data.estimatedMinutes !== undefined)
    updateData.estimatedMinutes = parsed.data.estimatedMinutes;
  if (parsed.data.dueDate !== undefined)
    updateData.dueDate = parsed.data.dueDate
      ? new Date(parsed.data.dueDate)
      : null;

  const [updated] = await db
    .update(tasks)
    .set(updateData)
    .where(and(eq(tasks.id, id), eq(tasks.userId, session.user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json(
      { error: 'タスクが見つかりません' },
      { status: 404 }
    );
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }

  const { id } = await params;

  const [deleted] = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, session.user.id)))
    .returning();

  if (!deleted) {
    return NextResponse.json(
      { error: 'タスクが見つかりません' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
