'use client';

import { createClient } from '@/src/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.replace('/dashboard');
      }
    });

    // Fallback: if auth doesn't complete within 5 seconds, redirect to login
    const timeout = setTimeout(() => {
      router.replace('/login?error=auth_timeout');
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-[var(--color-neutral-700)]">認証中...</p>
    </main>
  );
}
