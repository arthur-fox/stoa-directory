'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        subscription.unsubscribe();
        router.replace('/dashboard');
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="agora-spinner mx-auto mb-4" />
        <p className="font-sans text-[13px] text-secondary">
          Signing you in…
        </p>
      </div>
    </main>
  );
}
