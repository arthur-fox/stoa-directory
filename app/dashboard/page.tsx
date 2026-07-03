'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import AgoraHeader from '@/components/AgoraHeader';
import { safeUrl } from '@/lib/utils';

interface Project {
  id: string;
  title: string;
  description: string;
  url: string | null;
  status: 'wip' | 'live';
  visibility: 'public' | 'community';
  seeking_feedback: boolean;
  feedback_prompt: string;
  position: number;
  tags: string[];
}

interface MemberRow {
  id: string;
  slug: string;
  name: string;
  avatar: string | null;
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

const emptyProject = (position = 0): Omit<Project, 'id'> => ({
  title: '',
  description: '',
  url: '',
  status: 'live',
  visibility: 'community',
  seeking_feedback: false,
  feedback_prompt: '',
  position,
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const feedbackSectionRef = useRef<HTMLElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return; }
      const user = session.user;
      setUser(user);

      const { data, error } = await supabase
        .from('members')
        .select('*, projects(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) setLookupError(error.message);

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

  async function uploadAvatar(file: File) {
    if (!member || !user) return;
    if (file.size > 5 * 1024 * 1024) { setAvatarError('Image must be under 5 MB.'); return; }
    setUploadingAvatar(true);
    setAvatarError(null);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (uploadError) { setAvatarError(uploadError.message); setUploadingAvatar(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('members').update({ avatar: publicUrl }).eq('id', member.id);
    setMember({ ...member, avatar: publicUrl });
    setUploadingAvatar(false);
  }

  async function saveProfile() {
    if (!member) return;
    setSaving(true);
    await supabase
      .from('members')
      .update({ bio: member.bio, location: member.location, social: { ...member.social, website: member.social.website ? safeUrl(member.social.website) : undefined }, visibility: member.visibility })
      .eq('id', member.id);
    await supabase.rpc('bump_listed_at');
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function saveProject(project: Project) {
    if (!member) return;
    await supabase.from('projects').update({
      title: project.title,
      description: project.description,
      url: project.url ? safeUrl(project.url) : null,
      status: project.status,
      visibility: project.visibility,
      seeking_feedback: project.seeking_feedback,
      feedback_prompt: project.feedback_prompt || null,
    }).eq('id', project.id);
    setMember((m) => m ? { ...m, projects: m.projects.map((p) => p.id === project.id ? project : p) } : m);
    setEditingProject(null);
  }

  async function addProject() {
    if (!member || !newProject) return;
    setProjectError(null);
    const { data, error } = await supabase.from('projects').insert({
      member_id:        member.id,
      title:            newProject.title,
      description:      newProject.description,
      url:              newProject.url ? safeUrl(newProject.url) : null,
      status:           newProject.status,
      visibility:       newProject.visibility,
      seeking_feedback: newProject.seeking_feedback,
      feedback_prompt:  newProject.feedback_prompt || null,
      position:         newProject.position,
      tags:             newProject.tags,
    }).select().maybeSingle();
    if (error) { setProjectError(error.message); return; }
    if (data) {
      setMember((m) => m ? { ...m, projects: [...m.projects, data] } : m);
      setNewProject(null);
      await supabase.rpc('bump_listed_at');
    }
  }

  async function moveProject(projectId: string, direction: 'up' | 'down') {
    if (!member) return;
    const sorted = [...member.projects].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex(p => p.id === projectId);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const curr = sorted[idx];
    const swap = sorted[swapIdx];
    await Promise.all([
      supabase.from('projects').update({ position: swap.position }).eq('id', curr.id),
      supabase.from('projects').update({ position: curr.position }).eq('id', swap.id),
    ]);
    setMember(m => m ? {
      ...m,
      projects: m.projects.map(p => {
        if (p.id === curr.id) return { ...p, position: swap.position };
        if (p.id === swap.id) return { ...p, position: curr.position };
        return p;
      }),
    } : m);
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="agora-spinner" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-[10px]">
        <p className="font-sans text-[13px] text-secondary">
          No member profile linked to <strong>{user?.email}</strong>.
        </p>
        <p className="font-mono text-[11px] text-muted">{user?.id}</p>
        {lookupError && <p className="font-mono text-[11px] max-w-[400px] text-center" style={{ color: '#c0392b' }}>{lookupError}</p>}
        <p className="font-sans text-[11px] text-muted">Ask an admin to link your account.</p>
        <button onClick={signOut} className="font-sans text-[11px] text-muted bg-transparent border-none cursor-pointer underline">
          Sign out
        </button>
      </div>
    );
  }

  const unreadCount = feedback.filter(fb => !fb.read_at).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AgoraHeader right={
        <div className="flex items-center gap-4">
          {member.is_admin && (
            <Link href="/admin" className="font-sans text-[11px] text-gold no-underline tracking-[.3px]">
              Admin →
            </Link>
          )}
          <button onClick={signOut} className="font-sans text-[11px] text-muted bg-transparent border-none cursor-pointer underline">
            Sign out
          </button>
        </div>
      } />

      <div className="max-w-[640px] mx-auto px-6 py-9 w-full">

        {/* Page title */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[26px] font-normal text-foreground m-0">
              My profile
            </h1>
            {unreadCount > 0 && (
              <span className="font-sans text-[10px] font-bold tracking-[.5px] bg-gold text-background rounded-full px-[10px] py-[3px]">
                {unreadCount} new feedback
              </span>
            )}
          </div>
          <p className="font-sans text-[11px] text-muted mt-1 m-0">{user?.email}</p>
        </div>

        {/* Feedback — unread (shown at top) */}
        {feedback.length > 0 && unreadCount > 0 && (
          <section ref={feedbackSectionRef} className="agora-card p-6 mb-4 border-gold">
            <div className="flex items-center gap-[10px] mb-4">
              <h2 className="font-display text-[18px] font-normal text-foreground m-0">
                Feedback received
              </h2>
              <span className="font-sans text-[10px] font-bold tracking-[.5px] bg-gold text-background rounded-full px-2 py-[2px]">
                {unreadCount} new
              </span>
            </div>
            <FeedbackList feedback={feedback} />
            <button
              onClick={() => { markFeedbackAsRead(); }}
              className="font-sans text-[11px] text-muted bg-transparent border-none cursor-pointer mt-3 underline"
            >
              Mark all as read
            </button>
          </section>
        )}

        {/* Profile */}
        <section className="agora-card p-6">
          <h2 className="font-display text-[18px] font-normal text-foreground m-0 mb-4">
            Profile
          </h2>
          <div className="flex flex-col gap-3">

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="relative w-[60px] h-[60px] rounded-full border-none p-0 cursor-pointer shrink-0 overflow-hidden"
              >
                {member.avatar ? (
                  <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full bg-avatar border-[1.5px] border-avatar rounded-full flex items-center justify-center font-display text-[20px]"
                    style={{ color: 'var(--avatar-text)' }}
                  >
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </button>
              <div>
                <p className="font-sans text-[13px] text-foreground m-0">{member.name}</p>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="font-sans text-[11px] text-gold bg-transparent border-none cursor-pointer p-0 mt-0.5"
                >
                  {uploadingAvatar ? 'Uploading…' : 'Change photo'}
                </button>
                {avatarError && <p className="font-sans text-[11px] mt-1 m-0" style={{ color: '#c0392b' }}>{avatarError}</p>}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ''; }}
              />
            </div>

            <Field label="Bio">
              <textarea
                rows={2}
                value={member.bio}
                onChange={(e) => setMember({ ...member, bio: e.target.value })}
                className="agora-input"
                style={{ resize: 'none' }}
              />
            </Field>
            <Field label="Location">
              <input
                type="text"
                value={member.location ?? ''}
                onChange={(e) => setMember({ ...member, location: e.target.value })}
                className="agora-input"
              />
            </Field>
            <div className="grid grid-cols-3 gap-2">
              {(['website', 'twitter', 'linkedin'] as const).map((key) => (
                <Field key={key} label={key}>
                  <input
                    type="text"
                    value={member.social[key] ?? ''}
                    onChange={(e) => setMember({ ...member, social: { ...member.social, [key]: e.target.value } })}
                    className="agora-input"
                  />
                </Field>
              ))}
            </div>

            {/* Visibility toggle */}
            <div className="agora-chip-row px-[14px] py-[10px] flex items-center justify-between gap-3">
              <div>
                <p className="font-sans text-[13px] text-foreground m-0">Profile visibility</p>
                <p className="font-sans text-[11px] text-muted mt-0.5 m-0">
                  {member.visibility === 'public'
                    ? 'Visible to everyone, including logged-out visitors'
                    : 'Visible to Stoa members only'}
                </p>
              </div>
              <button
                onClick={() => setMember({ ...member, visibility: member.visibility === 'public' ? 'community' : 'public' })}
                className="font-sans text-[10px] font-semibold tracking-[.5px] uppercase rounded-full px-3 py-1 cursor-pointer shrink-0"
                style={{
                  background: member.visibility === 'public' ? 'rgba(74,222,128,.15)' : 'var(--bg-chip)',
                  color: member.visibility === 'public' ? '#4ade80' : 'var(--text-muted)',
                  border: `1px solid ${member.visibility === 'public' ? '#4ade80' : 'var(--border-card)'}`,
                }}
              >
                {member.visibility === 'public' ? 'Public' : 'Community only'}
              </button>
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="agora-btn-primary self-end"
            >
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </section>

        {/* Projects */}
        <section className="agora-card p-6 mt-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-display text-[18px] font-normal text-foreground m-0">Projects</h2>
              <p className="font-sans text-[11px] text-muted mt-[3px] m-0">
                First 3 public projects appear on your tile.
              </p>
            </div>
            <button
              onClick={() => {
                const nextPos = member.projects.length > 0 ? Math.max(...member.projects.map(p => p.position)) + 1 : 0;
                setNewProject(emptyProject(nextPos));
                setProjectError(null);
              }}
              className="agora-btn-ghost"
            >
              + Add project
            </button>
          </div>

          {projectError && (
            <p className="font-mono text-[11px] bg-well border border-card rounded-[6px] px-3 py-2 mb-3" style={{ color: '#c0392b' }}>
              {projectError}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {[...member.projects].sort((a, b) => a.position - b.position).map((project, idx, sorted) =>
              editingProject === project.id ? (
                <ProjectForm
                  key={project.id}
                  value={project}
                  onChange={(updated) => setMember({ ...member, projects: member.projects.map((p) => p.id === project.id ? updated : p) })}
                  onSave={() => saveProject(project)}
                  onCancel={() => setEditingProject(null)}
                />
              ) : (
                <div key={project.id} className="agora-chip-row px-[14px] py-[10px] flex items-center gap-[10px]">
                  <div className="flex flex-col gap-[1px]">
                    <button onClick={() => moveProject(project.id, 'up')} disabled={idx === 0}
                      className="font-sans text-[10px] text-muted bg-transparent border-none cursor-pointer p-0 leading-none"
                      style={{ opacity: idx === 0 ? 0 : 1 }}>▲</button>
                    <button onClick={() => moveProject(project.id, 'down')} disabled={idx === sorted.length - 1}
                      className="font-sans text-[10px] text-muted bg-transparent border-none cursor-pointer p-0 leading-none"
                      style={{ opacity: idx === sorted.length - 1 ? 0 : 1 }}>▼</button>
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <p className="font-sans text-[13px] text-foreground m-0">{project.title}</p>
                      <p className="font-sans text-[11px] text-muted mt-0.5 m-0">
                        {project.visibility === 'public' ? 'Public' : 'Community only'} · {project.status}
                        {project.seeking_feedback && ' · seeking feedback'}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setEditingProject(project.id)}
                        className="font-sans text-[11px] text-muted bg-transparent border-none cursor-pointer">Edit</button>
                      <button onClick={() => deleteProject(project.id)}
                        className="font-sans text-[11px] bg-transparent border-none cursor-pointer" style={{ color: '#c0392b' }}>Delete</button>
                    </div>
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

        {/* Feedback — quiet state (all read, shown at bottom) */}
        {feedback.length > 0 && unreadCount === 0 && (
          <section ref={feedbackSectionRef} className="agora-card p-6 mt-4">
            <h2 className="font-display text-[18px] font-normal text-foreground m-0 mb-4">
              Feedback received
            </h2>
            <FeedbackList feedback={feedback} />
          </section>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="font-sans text-[11px] text-muted block mb-1 uppercase tracking-[.5px]">
        {label}
      </label>
      {children}
    </div>
  );
}

function FeedbackList({ feedback }: { feedback: FeedbackRow[] }) {
  const LABELS: Record<string, string> = {
    general: 'General', design: 'Design & UX',
    'idea-validation': 'Idea validation', growth: 'Growth & traction', technical: 'Technical',
  };
  return (
    <div className="flex flex-col gap-2">
      {feedback.map((fb) => (
        <div
          key={fb.id}
          className="agora-chip-row px-[14px] py-3"
          style={{ borderColor: fb.read_at ? 'var(--border-section)' : 'var(--gold)', opacity: fb.read_at ? 0.7 : 1 }}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {!fb.read_at && <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />}
              <span className="font-sans text-[10px] font-semibold uppercase tracking-[.5px] text-gold border border-gold rounded-full px-2 py-[2px] opacity-85">
                {LABELS[fb.category] ?? fb.category}
              </span>
              {fb.project && <span className="font-sans text-[11px] text-muted">on {fb.project.title}</span>}
            </div>
            <span className="font-sans text-[11px] text-muted">
              {new Date(fb.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="font-sans text-[13px] text-secondary m-0 leading-[1.6]">{fb.content}</p>
          {fb.from_member && (
            <p className="font-sans text-[11px] text-muted mt-2 m-0">
              from{' '}
              <Link href={`/members/${fb.from_member.slug}`} className="text-gold no-underline">
                {fb.from_member.name}
              </Link>
            </p>
          )}
        </div>
      ))}
    </div>
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
    <div className="agora-chip-row p-[14px] flex flex-col gap-2 border-gold">
      <input
        type="text"
        placeholder="Project title"
        value={value.title}
        onChange={(e) => onChange({ ...value, title: e.target.value })}
        className="agora-input"
      />
      <input
        type="text"
        placeholder="Short description"
        value={value.description}
        onChange={(e) => onChange({ ...value, description: e.target.value })}
        className="agora-input"
      />
      <input
        type="url"
        placeholder="URL (optional)"
        value={value.url ?? ''}
        onChange={(e) => onChange({ ...value, url: e.target.value })}
        className="agora-input"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="font-sans text-[11px] text-muted block mb-1 uppercase tracking-[.5px]">Status</label>
          <select value={value.status} onChange={(e) => onChange({ ...value, status: e.target.value as Project['status'] })} className="agora-input">
            <option value="live">Live</option>
            <option value="wip">WIP</option>
          </select>
        </div>
        <div>
          <label className="font-sans text-[11px] text-muted block mb-1 uppercase tracking-[.5px]">Visibility</label>
          <select value={value.visibility} onChange={(e) => onChange({ ...value, visibility: e.target.value as Project['visibility'] })} className="agora-input">
            <option value="community">Community only</option>
            <option value="public">Public</option>
          </select>
        </div>
      </div>
      <label className="flex items-center gap-2 font-sans text-[12px] text-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={value.seeking_feedback}
          onChange={(e) => onChange({ ...value, seeking_feedback: e.target.checked })}
        />
        Seeking feedback from the community
      </label>
      {value.seeking_feedback && (
        <textarea
          rows={2}
          placeholder="What feedback are you looking for?"
          value={value.feedback_prompt ?? ''}
          onChange={(e) => onChange({ ...value, feedback_prompt: e.target.value })}
          className="agora-input"
          style={{ resize: 'none' }}
        />
      )}
      <div className="flex justify-end gap-[10px] pt-1">
        <button onClick={onCancel} className="font-sans text-[11px] text-muted bg-transparent border-none cursor-pointer">Cancel</button>
        <button onClick={onSave} disabled={!value.title} className="agora-btn-primary">Save</button>
      </div>
    </div>
  );
}
