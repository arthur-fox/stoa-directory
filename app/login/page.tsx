'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import AgoraHeader from '@/components/AgoraHeader';

const ff = 'var(--font-space-grotesk), system-ui, sans-serif';
const fd = 'var(--font-cormorant), Georgia, serif';

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
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      <AgoraHeader />
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 16px',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h1 style={{ fontFamily: fd, fontSize: 30, fontWeight: 400, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            Member login
          </h1>
          <p style={{ fontFamily: ff, fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.6 }}>
            Enter your email and we&apos;ll send you a magic link.
          </p>

          {sent ? (
            <div style={{
              border: '1px solid var(--gold)',
              borderRadius: 6,
              padding: '14px 16px',
              background: 'var(--bg-chip)',
              fontFamily: ff,
              fontSize: 13,
              color: 'var(--text-primary)',
              lineHeight: 1.6,
            }}>
              Check your inbox — a login link is on its way to <strong>{email}</strong>.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="agora-input"
              />
              {error && (
                <p style={{ fontFamily: ff, fontSize: 12, color: '#c0392b', margin: 0 }}>{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="agora-btn-primary"
                style={{ marginTop: 4 }}
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
