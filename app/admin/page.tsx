'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AgoraHeader from '@/components/AgoraHeader';

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="agora-spinner" />
      </div>
    );
  }

  const publicCount = members.filter(m => m.visibility === 'public').length;
  const linkedCount = members.filter(m => m.user_id).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AgoraHeader right={
        <Link href="/dashboard" className="font-sans text-[11px] text-muted no-underline">
          My profile →
        </Link>
      } />

      <div className="max-w-[900px] mx-auto px-6 py-9 w-full">

        {/* Page title */}
        <div className="mb-6">
          <h1 className="font-display text-[26px] font-normal text-foreground m-0">Admin</h1>
          <p className="font-sans text-[11px] text-muted mt-1 m-0">
            {members.length} members · {publicCount} public · {linkedCount} accounts linked
          </p>
        </div>

        {/* Add member */}
        <div className="agora-card p-5 mb-4">
          <h2 className="font-sans text-[11px] font-semibold text-muted m-0 mb-3 uppercase tracking-[.5px]">
            Add member
          </h2>
          <div className="flex gap-2">
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
              className="agora-btn-primary shrink-0 whitespace-nowrap"
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
          {addError && (
            <p className="font-sans text-[11px] mt-2 m-0" style={{ color: '#c0392b' }}>{addError}</p>
          )}
        </div>

        {/* Members table */}
        <div className="agora-card overflow-hidden">
          <table className="w-full border-collapse font-sans text-[13px]">
            <thead>
              <tr className="border-b border-section bg-well">
                {['Name', 'Email', 'Visibility', 'Linked', ''].map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-[10px] font-sans text-[10px] font-semibold uppercase tracking-[.6px] text-muted"
                    style={{ textAlign: i === 3 ? 'center' : i === 4 ? 'right' : 'left' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, idx) => (
                <tr key={m.id} className={idx < members.length - 1 ? 'border-b border-section' : ''}>

                  {/* Name */}
                  <td className="px-4 py-[10px]">
                    <span className="text-foreground font-medium">{m.name}</span>
                    {m.is_admin && (
                      <span className="ml-2 font-sans text-[10px] font-semibold text-gold border border-gold rounded-full px-[7px] py-[2px] opacity-85">
                        admin
                      </span>
                    )}
                  </td>

                  {/* Email */}
                  <td className="px-4 py-[10px] text-secondary">
                    {editingEmail === m.id ? (
                      <div className="flex items-center gap-1.5">
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
                        <button onClick={() => saveEmail(m)} className="font-sans text-[11px] text-gold bg-transparent border-none cursor-pointer">Save</button>
                        <button onClick={() => setEditingEmail(null)} className="font-sans text-[11px] text-muted bg-transparent border-none cursor-pointer">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingEmail(m.id); setEmailDraft(m.email ?? ''); }}
                        className="font-sans text-[13px] bg-transparent border-none cursor-pointer p-0"
                        style={{
                          color: m.email ? 'var(--text-secondary)' : 'var(--text-muted)',
                          fontStyle: m.email ? 'normal' : 'italic',
                        }}
                      >
                        {m.email ?? 'no email'} <span className="opacity-40 text-[11px]">✎</span>
                      </button>
                    )}
                  </td>

                  {/* Visibility */}
                  <td className="px-4 py-[10px]">
                    <button
                      onClick={() => toggleVisibility(m)}
                      className="font-sans text-[10px] font-semibold tracking-[.5px] uppercase rounded-full px-[10px] py-[3px] cursor-pointer"
                      style={{
                        background: m.visibility === 'public' ? 'rgba(74,222,128,.12)' : 'var(--bg-chip)',
                        color: m.visibility === 'public' ? '#4ade80' : 'var(--text-muted)',
                        border: `1px solid ${m.visibility === 'public' ? '#4ade80' : 'var(--border-card)'}`,
                      }}
                    >
                      {m.visibility === 'public' ? 'Public' : 'Community'}
                    </button>
                  </td>

                  {/* Linked indicator */}
                  <td className="px-4 py-[10px] text-center">
                    <span
                      title={m.user_id ? 'Account linked' : 'Not yet signed in'}
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: m.user_id ? '#4ade80' : 'var(--border-card)' }}
                    />
                  </td>

                  {/* Delete */}
                  <td className="px-4 py-[10px] text-right">
                    <button
                      onClick={() => deleteMember(m)}
                      className="font-sans text-[11px] text-muted bg-transparent border-none cursor-pointer hover:text-red-600 transition-colors"
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
