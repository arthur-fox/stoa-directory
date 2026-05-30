'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Project {
  id: string;
  title: string;
  description: string;
  url: string | null;
  status: 'active' | 'shipped' | 'wip';
  visibility: 'public' | 'community';
  seeking_feedback: boolean;
  feedback_prompt: string;
  tags: string[];
}

interface MemberRow {
  id: string;
  slug: string;
  name: string;
  bio: string;
  location: string | null;
  visibility: 'public' | 'community';
  social: { twitter?: string; linkedin?: string; website?: string };
  is_admin: boolean;
  projects: Project[];
}

interface FeedbackRow {
  id: string;
  project_id: string;
  category: string;
  content: string;
  created_at: string;
  read_at: string | null;
  from_member: { name: string; slug: string } | null;
  project: { title: string } | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  design: 'Design & UX',
  'idea-validation': 'Idea validation',
  growth: 'Growth & traction',
  technical: 'Technical',
};

const emptyProject = (): Omit<Project, 'id'> => ({
  title: '',
  description: '',
  url: '',
  status: 'active',
  visibility: 'community',
  seeking_feedback: false,
  feedback_prompt: '',
  tags: [],
});

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<MemberRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [newProject, setNewProject] = useState<Omit<Project, 'id'> | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const feedbackSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return; }
      const user = session.user;
      setUser(user);

      // Primary lookup: by user_id (set by trigger on first sign-in)
      const { data, error } = await supabase
        .from('members')
        .select('*, projects(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) setLookupError(error.message);

      // Fallback: look up by email and self-claim the row
      let resolved = data;
      if (!resolved && user.email) {
        const { data: byEmail, error: emailError } = await supabase
          .from('members')
          .select('*, projects(*)')
          .ilike('email', user.email)
          .is('user_id', null)
          .maybeSingle();
        if (emailError) setLookupError(prev => (prev ?? '') + ' | ' + emailError.message);
        if (byEmail) {
          await supabase.from('members').update({ user_id: user.id }).eq('id', byEmail.id);
          resolved = { ...byEmail, user_id: user.id };
        }
      }

      setMember(resolved);
      setLoading(false);

      // Fetch feedback received on my projects
      if (resolved && resolved.projects.length > 0) {
        const projectIds = resolved.projects.map((p: Project) => p.id);
        const { data: feedbackData } = await supabase
          .from('feedback')
          .select('id, project_id, category, content, created_at, read_at, from_member:from_member_id(name, slug), project:project_id(title)')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false });
        setFeedback((feedbackData ?? []) as unknown as FeedbackRow[]);
      }
    });
  }, [router]);

  async function markFeedbackAsRead() {
    const unreadIds = feedback.filter(fb => !fb.read_at).map(fb => fb.id);
    if (unreadIds.length === 0) return;
    await supabase.from('feedback').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
    setFeedback(prev => prev.map(fb => fb.read_at ? fb : { ...fb, read_at: new Date().toISOString() }));
  }

  async function saveProfile() {
    if (!member) return;
    setSaving(true);
    await supabase
      .from('members')
      .update({ bio: member.bio, location: member.location, social: member.social, visibility: member.visibility })
      .eq('id', member.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function saveProject(project: Project) {
    if (!member) return;
    await supabase.from('projects').update({
      title: project.title,
      description: project.description,
      url: project.url || null,
      status: project.status,
      visibility: project.visibility,
      seeking_feedback: project.seeking_feedback,
      feedback_prompt: project.feedback_prompt || null,
    }).eq('id', project.id);
    setMember((m) => m ? {
      ...m,
      projects: m.projects.map((p) => p.id === project.id ? project : p),
    } : m);
    setEditingProject(null);
  }

  async function addProject() {
    if (!member || !newProject) return;
    setProjectError(null);
    const { data, error } = await supabase.from('projects').insert({
      member_id:        member.id,
      title:            newProject.title,
      description:      newProject.description,
      url:              newProject.url || null,
      status:           newProject.status,
      visibility:       newProject.visibility,
      seeking_feedback: newProject.seeking_feedback,
      feedback_prompt:  newProject.feedback_prompt || null,
      tags:             newProject.tags,
    }).select().maybeSingle();
    if (error) { setProjectError(error.message); return; }
    if (data) {
      setMember((m) => m ? { ...m, projects: [...m.projects, data] } : m);
      setNewProject(null);
    }
  }

  async function deleteProject(id: string) {
    await supabase.from('projects').delete().eq('id', id);
    setMember((m) => m ? { ...m, projects: m.projects.filter((p) => p.id !== id) } : m);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-violet-600" />
      </main>
    );
  }

  if (!member) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white">
        <p className="text-zinc-500 text-sm">No member profile linked to <strong>{user?.email}</strong>.</p>
        <p className="font-mono text-xs text-zinc-300">{user?.id}</p>
        {lookupError && <p className="max-w-sm text-center font-mono text-xs text-red-400">{lookupError}</p>}
        <p className="text-xs text-zinc-400">Ask an admin to link your account.</p>
        <button onClick={signOut} className="mt-2 text-xs text-zinc-400 hover:text-zinc-700 underline">Sign out</button>
      </main>
    );
  }

  const unreadCount = feedback.filter(fb => !fb.read_at).length;

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-700">← Directory</Link>
            <div className="mt-2 flex items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-900">My profile</h1>
              {unreadCount > 0 && (
                <span className="animate-pulse rounded-full bg-violet-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                  {unreadCount} new feedback
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">{user?.email}</p>
          </div>
          <div className="flex items-center gap-4">
            {member.is_admin && (
              <Link href="/admin" className="text-xs font-medium text-violet-600 hover:text-violet-800">
                Admin →
              </Link>
            )}
            <button onClick={signOut} className="text-xs text-zinc-400 hover:text-zinc-700 underline">
              Sign out
            </button>
          </div>
        </div>

        {/* Feedback received — shown at the top when there's unread feedback */}
        {feedback.length > 0 && unreadCount > 0 && (
          <section ref={feedbackSectionRef} className="mb-6 rounded-xl border-2 border-violet-300 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="font-semibold text-zinc-900">Feedback received</h2>
              <span className="rounded-full bg-violet-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                {unreadCount} new
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {feedback.map((fb) => (
                <div
                  key={fb.id}
                  className={`rounded-lg border p-4 ${fb.read_at ? 'border-zinc-100 bg-zinc-50' : 'border-violet-200 bg-violet-50/50'}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {!fb.read_at && <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />}
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600">
                        {CATEGORY_LABELS[fb.category] ?? fb.category}
                      </span>
                      {fb.project && <span className="text-xs text-zinc-400">on {fb.project.title}</span>}
                    </div>
                    <span className="text-xs text-zinc-300">{new Date(fb.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-zinc-700">{fb.content}</p>
                  {fb.from_member && (
                    <p className="mt-2 text-xs text-zinc-400">
                      from{' '}
                      <Link href={`/members/${fb.from_member.slug}`} className="hover:text-zinc-700 hover:underline">
                        {fb.from_member.name}
                      </Link>
                    </p>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => { markFeedbackAsRead(); }}
              className="mt-4 text-xs text-zinc-400 hover:text-zinc-600"
            >
              Mark all as read
            </button>
          </section>
        )}

        {/* Profile */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-zinc-900">Profile</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Bio</label>
              <textarea
                rows={2}
                value={member.bio}
                onChange={(e) => setMember({ ...member, bio: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 resize-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Location</label>
              <input
                type="text"
                value={member.location ?? ''}
                onChange={(e) => setMember({ ...member, location: e.target.value })}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['website', 'twitter', 'linkedin'] as const).map((key) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-zinc-500 capitalize">{key}</label>
                  <input
                    type="text"
                    value={member.social[key] ?? ''}
                    onChange={(e) => setMember({ ...member, social: { ...member.social, [key]: e.target.value } })}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-zinc-700">Profile visibility</p>
                <p className="text-xs text-zinc-400">
                  {member.visibility === 'public'
                    ? 'Visible to everyone, including logged-out visitors'
                    : 'Visible to Stoa members only'}
                </p>
              </div>
              <button
                onClick={() => setMember({ ...member, visibility: member.visibility === 'public' ? 'community' : 'public' })}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  member.visibility === 'public'
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-zinc-200 text-zinc-500 hover:bg-zinc-300'
                }`}
              >
                {member.visibility === 'public' ? 'Public' : 'Community only'}
              </button>
            </div>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="self-end rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </section>

        {/* Projects */}
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900">Projects</h2>
            <button
              onClick={() => { setNewProject(emptyProject()); setProjectError(null); }}
              className="text-xs font-medium text-violet-600 hover:text-violet-800"
            >
              + Add project
            </button>
          </div>
          {projectError && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 font-mono text-xs text-red-500">{projectError}</p>
          )}

          <div className="flex flex-col gap-3">
            {member.projects.map((project) =>
              editingProject === project.id ? (
                <ProjectForm
                  key={project.id}
                  value={project}
                  onChange={(updated) => setMember({ ...member, projects: member.projects.map((p) => p.id === project.id ? updated : p) })}
                  onSave={() => saveProject(project)}
                  onCancel={() => setEditingProject(null)}
                />
              ) : (
                <div key={project.id} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-zinc-800">{project.title}</p>
                    <p className="text-xs text-zinc-400">
                      {project.visibility === 'public' ? 'Public' : 'Community only'} · {project.status}
                      {project.seeking_feedback && ' · seeking feedback'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingProject(project.id)} className="text-xs text-zinc-400 hover:text-zinc-700">Edit</button>
                    <button onClick={() => deleteProject(project.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                  </div>
                </div>
              )
            )}

            {newProject && (
              <ProjectForm
                value={{ ...newProject, id: '' }}
                onChange={(updated) => setNewProject(updated)}
                onSave={addProject}
                onCancel={() => setNewProject(null)}
              />
            )}
          </div>
        </section>

        {/* Feedback received — quiet state, shown at bottom once all are read */}
        {feedback.length > 0 && unreadCount === 0 && (
          <section ref={feedbackSectionRef} className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-zinc-900">Feedback received</h2>
            <div className="flex flex-col gap-3">
              {feedback.map((fb) => (
                <div
                  key={fb.id}
                  className={`rounded-lg border p-4 ${
                    fb.read_at
                      ? 'border-zinc-100 bg-zinc-50'
                      : 'border-violet-200 bg-violet-50/50'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {!fb.read_at && (
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                      )}
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600">
                        {CATEGORY_LABELS[fb.category] ?? fb.category}
                      </span>
                      {fb.project && (
                        <span className="text-xs text-zinc-400">on {fb.project.title}</span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-300">
                      {new Date(fb.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-700">{fb.content}</p>
                  {fb.from_member && (
                    <p className="mt-2 text-xs text-zinc-400">
                      from{' '}
                      <Link href={`/members/${fb.from_member.slug}`} className="hover:text-zinc-700 hover:underline">
                        {fb.from_member.name}
                      </Link>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function ProjectForm({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: Project;
  onChange: (p: Project) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-violet-200 bg-violet-50/40 p-3">
      <input
        type="text"
        placeholder="Project title"
        value={value.title}
        onChange={(e) => onChange({ ...value, title: e.target.value })}
        className="w-full rounded border border-zinc-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
      />
      <input
        type="text"
        placeholder="Short description"
        value={value.description}
        onChange={(e) => onChange({ ...value, description: e.target.value })}
        className="w-full rounded border border-zinc-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
      />
      <input
        type="url"
        placeholder="URL (optional)"
        value={value.url ?? ''}
        onChange={(e) => onChange({ ...value, url: e.target.value })}
        className="w-full rounded border border-zinc-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Status</label>
          <select
            value={value.status}
            onChange={(e) => onChange({ ...value, status: e.target.value as Project['status'] })}
            className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
          >
            <option value="active">Active</option>
            <option value="wip">WIP</option>
            <option value="shipped">Shipped</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Visibility</label>
          <select
            value={value.visibility}
            onChange={(e) => onChange({ ...value, visibility: e.target.value as Project['visibility'] })}
            className="w-full rounded border border-zinc-200 px-2 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
          >
            <option value="community">Community only</option>
            <option value="public">Public</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs font-medium text-zinc-600">
        <input
          type="checkbox"
          checked={value.seeking_feedback}
          onChange={(e) => onChange({ ...value, seeking_feedback: e.target.checked })}
          className="rounded"
        />
        Seeking feedback from the community
      </label>
      {value.seeking_feedback && (
        <textarea
          rows={2}
          placeholder="What feedback are you looking for? e.g. Does the pricing make sense? Is the onboarding clear?"
          value={value.feedback_prompt ?? ''}
          onChange={(e) => onChange({ ...value, feedback_prompt: e.target.value })}
          className="w-full resize-none rounded border border-zinc-200 px-3 py-1.5 text-sm focus:border-violet-400 focus:outline-none"
        />
      )}
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="text-xs text-zinc-400 hover:text-zinc-700">Cancel</button>
        <button
          onClick={onSave}
          disabled={!value.title}
          className="rounded bg-violet-600 px-3 py-1 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}
