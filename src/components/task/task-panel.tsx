'use client';

import { useState } from 'react';
import { useFetch } from '@/lib/hooks/use-fetch';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  estimatedMinutes: number | null;
  aiConfidence: number | null;
  sourceType: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  MEDIUM:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  LOW: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: '未着手',
  SCHEDULED: '配置済',
  IN_PROGRESS: '進行中',
  COMPLETED: '完了',
  CANCELLED: '取消',
};

export function TaskPanel({ targetDate }: { targetDate: string }) {
  const { data: tasks, refetch } = useFetch<Task[]>(
    '/api/tasks?status=PENDING'
  );
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newMinutes, setNewMinutes] = useState('');

  void targetDate;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        priority: newPriority,
        estimatedMinutes: newMinutes ? parseInt(newMinutes, 10) : undefined,
      }),
    });

    if (res.ok) {
      setNewTitle('');
      setNewMinutes('');
      setShowForm(false);
      refetch();
    }
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    refetch();
  };

  const handleDelete = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    refetch();
  };

  const taskList = tasks ?? [];

  return (
    <div className="rounded-xl border border-foreground/10 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">タスク</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-foreground/5 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-foreground/10"
        >
          {showForm ? '閉じる' : '+ 追加'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 space-y-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="タスク名"
            className="w-full rounded-lg border border-foreground/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground/30"
          />
          <div className="flex gap-2">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="rounded-lg border border-foreground/10 bg-transparent px-2 py-1.5 text-xs outline-none"
            >
              <option value="URGENT">緊急</option>
              <option value="HIGH">高</option>
              <option value="MEDIUM">中</option>
              <option value="LOW">低</option>
            </select>
            <input
              type="number"
              value={newMinutes}
              onChange={(e) => setNewMinutes(e.target.value)}
              placeholder="推定 (分)"
              min="1"
              className="w-24 rounded-lg border border-foreground/10 bg-transparent px-2 py-1.5 text-xs outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
            >
              作成
            </button>
          </div>
        </form>
      )}

      {taskList.length === 0 ? (
        <p className="text-sm text-foreground/50">
          タスクがありません。手動で追加するか、AI で抽出してください
        </p>
      ) : (
        <ul className="space-y-2">
          {taskList.map((task) => (
            <li key={task.id} className="group rounded-lg bg-foreground/5 p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{task.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_COLORS[task.priority]}`}
                    >
                      {task.priority}
                    </span>
                    {task.sourceType === 'CALENDAR' && (
                      <span className="text-[10px] text-foreground/40">AI</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-foreground/50">
                    <span>{STATUS_LABELS[task.status] ?? task.status}</span>
                    {task.estimatedMinutes && (
                      <span>{task.estimatedMinutes}分</span>
                    )}
                    {task.aiConfidence != null && (
                      <span>確信度 {Math.round(task.aiConfidence * 100)}%</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {task.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleStatusChange(task.id, 'COMPLETED')}
                      className="rounded px-2 py-1 text-[10px] text-foreground/50 hover:bg-foreground/10"
                    >
                      完了
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="rounded px-2 py-1 text-[10px] text-red-500 hover:bg-red-500/10"
                  >
                    削除
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
