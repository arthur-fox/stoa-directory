'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

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
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-violet-600" />
      </main>
    );
  }

  const publicCount = members.filter(m => m.visibility === 'public').length;
  const linkedCount = members.filter(m => m.user_id).length;

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-700">← Directory</Link>
            <h1 className="mt-2 text-2xl font-bold text-zinc-900">Admin</h1>
            <p className="mt-1 text-xs text-zinc-400">
              {members.length} members · {publicCount} public · {linkedCount} accounts linked
            </p>
          </div>
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-700">
            My profile →
          </Link>
        </div>

        {/* Add member */}
        <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-zinc-700">Add member</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Full name"
              value={newMember.name}
              onChange={e => setNewMember({ ...newMember, name: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && addMember()}
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={newMember.email}
              onChange={e => setNewMember({ ...newMember, email: e.target.value })}
              onKeyDown={e => e.key === 'Enter' && addMember()}
              className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
            />
            <button
              onClick={addMember}
              disabled={adding || !newMember.name.trim()}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {adding ? 'Adding…' : 'Add'}
            </button>
          </div>
          {addError && <p className="mt-2 text-xs text-red-500">{addError}</p>}
        </section>

        {/* Members table */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3 text-center">Linked</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-zinc-50/60">
                  <td className="px-4 py-3">
                    <span className="font-medium text-zinc-800">{m.name}</span>
                    {m.is_admin && (
                      <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600">
                        admin
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-zinc-500">
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
                          className="w-52 rounded border border-violet-300 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400"
                        />
                        <button onClick={() => saveEmail(m)} className="text-xs text-violet-600 hover:text-violet-800">Save</button>
                        <button onClick={() => setEditingEmail(null)} className="text-xs text-zinc-400 hover:text-zinc-600">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingEmail(m.id); setEmailDraft(m.email ?? ''); }}
                        className="group flex items-center gap-1.5 text-left hover:text-zinc-800"
                      >
                        <span className={m.email ? '' : 'italic text-zinc-300'}>
                          {m.email ?? 'no email'}
                        </span>
                        <span className="text-xs text-zinc-300 opacity-0 group-hover:opacity-100">✎</span>
                      </button>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleVisibility(m)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        m.visibility === 'public'
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                      }`}
                    >
                      {m.visibility === 'public' ? 'Public' : 'Community'}
                    </button>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span
                      title={m.user_id ? 'Account linked' : 'Not yet signed in'}
                      className={`inline-block h-2 w-2 rounded-full ${m.user_id ? 'bg-green-400' : 'bg-zinc-200'}`}
                    />
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteMember(m)}
                      className="text-xs text-zinc-300 transition-colors hover:text-red-500"
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
    </main>
  );
}
