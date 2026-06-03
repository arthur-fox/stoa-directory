'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const ff = 'var(--font-space-grotesk), system-ui, sans-serif';

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
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="agora-spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ fontFamily: ff, fontSize: 13, color: 'var(--text-secondary)' }}>
          Signing you in…
        </p>
      </div>
    </main>
  );
}
