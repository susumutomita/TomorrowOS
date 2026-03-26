'use client';

import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="rounded-lg border border-foreground/10 px-3 py-1.5 text-sm text-foreground/60 transition-colors hover:bg-foreground/5"
    >
      ログアウト
    </button>
  );
}
