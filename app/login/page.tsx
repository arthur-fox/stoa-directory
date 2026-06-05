'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import AgoraHeader from '@/components/AgoraHeader';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AgoraHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[360px]">
          <h1 className="font-display text-[30px] font-normal text-foreground m-0 mb-1.5">
            Member login
          </h1>
          <p className="font-sans text-[13px] text-secondary m-0 mb-6 leading-relaxed">
            Enter your email and we&apos;ll send you a magic link.
          </p>

          {sent ? (
            <div className="border border-gold rounded-[6px] px-4 py-[14px] bg-well font-sans text-[13px] text-foreground leading-relaxed">
              Check your inbox — a login link is on its way to <strong>{email}</strong>.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-[10px]">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="agora-input"
              />
              {error && (
                <p className="font-sans text-[12px] m-0" style={{ color: '#c0392b' }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="agora-btn-primary mt-1"
              >
                {loading ? 'Sending…' : 'Send magic link'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
