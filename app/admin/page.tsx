'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AgoraHeader from '@/components/AgoraHeader';

const ff = 'var(--font-space-grotesk), system-ui, sans-serif';
const fd = 'var(--font-cormorant), Georgia, serif';

interface MemberRow {
  id: string;
  slug: string;
  name: string;
  email: string | null;
  visibility: 'public' | 'community';
  user_id: string | null;
  is_admin: boolean;
}

export default function AdminPage() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [newMember, setNewMember] = useState({ name: '', email: '' });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return; }
      const user = session.user;

      const { data: me } = await supabase
        .from('members')
        .select('is_admin')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!me?.is_admin) { router.replace('/dashboard'); return; }

      const { data } = await supabase
        .from('members')
        .select('id, slug, name, email, visibility, user_id, is_admin')
        .order('name', { ascending: true });

      setMembers(data ?? []);
      setLoading(false);
    });
  }, [router]);

  async function toggleVisibility(m: MemberRow) {
    const vis: 'public' | 'community' = m.visibility === 'public' ? 'community' : 'public';
    const { error } = await supabase.from('members').update({ visibility: vis }).eq('id', m.id);
    if (!error) setMembers(ms => ms.map(r => r.id === m.id ? { ...r, visibility: vis } : r));
  }

  async function saveEmail(m: MemberRow) {
    const email = emailDraft.trim() || null;
    const { error } = await supabase.from('members').update({ email }).eq('id', m.id);
    if (!error) {
      setMembers(ms => ms.map(r => r.id === m.id ? { ...r, email } : r));
      setEditingEmail(null);
    }
  }

  async function deleteMember(m: MemberRow) {
    if (!confirm(`Delete ${m.name}? This also removes all their projects.`)) return;
    const { error } = await supabase.from('members').delete().eq('id', m.id);
    if (!error) setMembers(ms => ms.filter(r => r.id !== m.id));
  }

  async function addMember() {
    if (!newMember.name.trim()) return;
    setAdding(true);
    setAddError(null);
    const slug = newMember.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { data, error } = await supabase
      .from('members')
      .insert({
        slug,
        name: newMember.name.trim(),
        email: newMember.email.trim() || null,
        visibility: 'community',
      })
      .select('id, slug, name, email, visibility, user_id, is_admin')
      .single();
    if (error) {
      setAddError(error.message);
    } else if (data) {
      setMembers(ms => [...ms, data]);
      setNewMember({ name: '', email: '' });
    }
    setAdding(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="agora-spinner" />
      </div>
    );
  }

  const publicCount = members.filter(m => m.visibility === 'public').length;
  const linkedCount = members.filter(m => m.user_id).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      <AgoraHeader right={
        <Link href="/dashboard" style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none' }}>
          My profile →
        </Link>
      } />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 24px', width: '100%' }}>

        {/* Page title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: fd, fontSize: 26, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>Admin</h1>
          <p style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {members.length} members · {publicCount} public · {linkedCount} accounts linked
          </p>
        </div>

        {/* Add member */}
        <div className="agora-card" style={{ padding: 20, marginBottom: 16 }}>
          <h2 style={{ fontFamily: ff, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Add member
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Full name"
              value={newMember.name}
              onChange={e => setNewMember({ ...newMember, name: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && addMember()}
              className="agora-input"
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={newMember.email}
              onChange={e => setNewMember({ ...newMember, email: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && addMember()}
              className="agora-input"
            />
            <button
              onClick={addMember}
              disabled={adding || !newMember.name.trim()}
              className="agora-btn-primary"
              style={{ flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
          {addError && (
            <p style={{ fontFamily: ff, fontSize: 11, color: '#c0392b', margin: '8px 0 0' }}>{addError}</p>
          )}
        </div>

        {/* Members table */}
        <div className="agora-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: ff, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-section)', background: 'var(--bg-chip)' }}>
                {['Name', 'Email', 'Visibility', 'Linked', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '10px 16px', textAlign: i === 3 ? 'center' : i === 4 ? 'right' : 'left',
                    fontFamily: ff, fontSize: 10, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '.6px',
                    color: 'var(--text-muted)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, idx) => (
                <tr key={m.id} style={{ borderBottom: idx < members.length - 1 ? '1px solid var(--border-section)' : 'none' }}>

                  {/* Name */}
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.name}</span>
                    {m.is_admin && (
                      <span style={{
                        marginLeft: 8, fontFamily: ff, fontSize: 10, fontWeight: 600,
                        color: 'var(--gold)', border: '1px solid var(--gold)',
                        borderRadius: 20, padding: '2px 7px', opacity: 0.85,
                      }}>
                        admin
                      </span>
                    )}
                  </td>

                  {/* Email */}
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                    {editingEmail === m.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          autoFocus
                          type="email"
                          value={emailDraft}
                          onChange={e => setEmailDraft(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') saveEmail(m);
                            if (e.key === 'Escape') setEditingEmail(null);
                          }}
                          className="agora-input"
                          style={{ maxWidth: 200, padding: '4px 8px', fontSize: 12 }}
                        />
                        <button onClick={() => saveEmail(m)} style={{ fontFamily: ff, fontSize: 11, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditingEmail(null)} style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingEmail(m.id); setEmailDraft(m.email ?? ''); }}
                        style={{
                          fontFamily: ff, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer',
                          color: m.email ? 'var(--text-secondary)' : 'var(--text-muted)',
                          fontStyle: m.email ? 'normal' : 'italic', padding: 0,
                        }}
                      >
                        {m.email ?? 'no email'} <span style={{ opacity: 0.4, fontSize: 11 }}>✎</span>
                      </button>
                    )}
                  </td>

                  {/* Visibility */}
                  <td style={{ padding: '10px 16px' }}>
                    <button
                      onClick={() => toggleVisibility(m)}
                      style={{
                        fontFamily: ff, fontSize: 10, fontWeight: 600, letterSpacing: '.5px',
                        textTransform: 'uppercase', borderRadius: 20, padding: '3px 10px',
                        cursor: 'pointer',
                        background: m.visibility === 'public' ? 'rgba(74,222,128,.12)' : 'var(--bg-chip)',
                        color: m.visibility === 'public' ? '#4ade80' : 'var(--text-muted)',
                        border: `1px solid ${m.visibility === 'public' ? '#4ade80' : 'var(--border-card)'}`,
                      }}
                    >
                      {m.visibility === 'public' ? 'Public' : 'Community'}
                    </button>
                  </td>

                  {/* Linked indicator */}
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <span
                      title={m.user_id ? 'Account linked' : 'Not yet signed in'}
                      style={{
                        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        background: m.user_id ? '#4ade80' : 'var(--border-card)',
                      }}
                    />
                  </td>

                  {/* Delete */}
                  <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => deleteMember(m)}
                      style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                      onMouseOver={e => (e.currentTarget.style.color = '#c0392b')}
                      onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
