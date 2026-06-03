'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import AgoraHeader from '@/components/AgoraHeader';

const ff = 'var(--font-space-grotesk), system-ui, sans-serif';
const fd = 'var(--font-cormorant), Georgia, serif';

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
      .update({ bio: member.bio, location: member.location, social: member.social, visibility: member.visibility })
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
      url: project.url || null,
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
      url:              newProject.url || null,
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
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="agora-spinner" />
      </div>
    );
  }

  if (!member) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <p style={{ fontFamily: ff, fontSize: 13, color: 'var(--text-secondary)' }}>
          No member profile linked to <strong>{user?.email}</strong>.
        </p>
        <p style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{user?.id}</p>
        {lookupError && <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#c0392b', maxWidth: 400, textAlign: 'center' }}>{lookupError}</p>}
        <p style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)' }}>Ask an admin to link your account.</p>
        <button onClick={signOut} style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
          Sign out
        </button>
      </div>
    );
  }

  const unreadCount = feedback.filter(fb => !fb.read_at).length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>
      <AgoraHeader right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {member.is_admin && (
            <Link href="/admin" style={{ fontFamily: ff, fontSize: 11, color: 'var(--gold)', textDecoration: 'none', letterSpacing: '.3px' }}>
              Admin →
            </Link>
          )}
          <button onClick={signOut} style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Sign out
          </button>
        </div>
      } />

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '36px 24px', width: '100%' }}>

        {/* Page title */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontFamily: fd, fontSize: 26, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
              My profile
            </h1>
            {unreadCount > 0 && (
              <span style={{
                fontFamily: ff, fontSize: 10, fontWeight: 700, letterSpacing: '.5px',
                background: 'var(--gold)', color: 'var(--bg-page)',
                borderRadius: 20, padding: '3px 10px',
              }}>
                {unreadCount} new feedback
              </span>
            )}
          </div>
          <p style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>{user?.email}</p>
        </div>

        {/* Feedback — unread (shown at top) */}
        {feedback.length > 0 && unreadCount > 0 && (
          <section ref={feedbackSectionRef} className="agora-card" style={{ padding: 24, marginBottom: 16, borderColor: 'var(--gold)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <h2 style={{ fontFamily: fd, fontSize: 18, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>
                Feedback received
              </h2>
              <span style={{
                fontFamily: ff, fontSize: 10, fontWeight: 700, letterSpacing: '.5px',
                background: 'var(--gold)', color: 'var(--bg-page)', borderRadius: 20, padding: '2px 8px',
              }}>
                {unreadCount} new
              </span>
            </div>
            <FeedbackList feedback={feedback} />
            <button
              onClick={() => { markFeedbackAsRead(); }}
              style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 12, textDecoration: 'underline' }}
            >
              Mark all as read
            </button>
          </section>
        )}

        {/* Profile */}
        <section className="agora-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: fd, fontSize: 18, fontWeight: 400, color: 'var(--text-primary)', margin: '0 0 16px' }}>
            Profile
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                style={{ position: 'relative', width: 60, height: 60, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, overflow: 'hidden' }}
              >
                {member.avatar ? (
                  <img src={member.avatar} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: '100%', height: '100%', background: 'var(--avatar-bg)',
                    border: '1.5px solid var(--avatar-border)', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: fd, fontSize: 20, color: 'var(--avatar-text)',
                  }}>
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </button>
              <div>
                <p style={{ fontFamily: ff, fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>{member.name}</p>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  style={{ fontFamily: ff, fontSize: 11, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}
                >
                  {uploadingAvatar ? 'Uploading…' : 'Change photo'}
                </button>
                {avatarError && <p style={{ fontFamily: ff, fontSize: 11, color: '#c0392b', margin: '4px 0 0' }}>{avatarError}</p>}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
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
            <div className="agora-chip-row" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ fontFamily: ff, fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>Profile visibility</p>
                <p style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                  {member.visibility === 'public'
                    ? 'Visible to everyone, including logged-out visitors'
                    : 'Visible to Stoa members only'}
                </p>
              </div>
              <button
                onClick={() => setMember({ ...member, visibility: member.visibility === 'public' ? 'community' : 'public' })}
                style={{
                  fontFamily: ff, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase',
                  borderRadius: 20, padding: '4px 12px', cursor: 'pointer', flexShrink: 0,
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
              className="agora-btn-primary"
              style={{ alignSelf: 'flex-end' }}
            >
              {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </section>

        {/* Projects */}
        <section className="agora-card" style={{ padding: 24, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontFamily: fd, fontSize: 18, fontWeight: 400, color: 'var(--text-primary)', margin: 0 }}>Projects</h2>
              <p style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0' }}>
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
            <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#c0392b', background: 'var(--bg-chip)', border: '1px solid var(--border-card)', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
              {projectError}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                <div key={project.id} className="agora-chip-row" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <button onClick={() => moveProject(project.id, 'up')} disabled={idx === 0}
                      style={{ fontFamily: ff, fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, opacity: idx === 0 ? 0 : 1 }}>▲</button>
                    <button onClick={() => moveProject(project.id, 'down')} disabled={idx === sorted.length - 1}
                      style={{ fontFamily: ff, fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, opacity: idx === sorted.length - 1 ? 0 : 1 }}>▼</button>
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontFamily: ff, fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>{project.title}</p>
                      <p style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        {project.visibility === 'public' ? 'Public' : 'Community only'} · {project.status}
                        {project.seeking_feedback && ' · seeking feedback'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={() => setEditingProject(project.id)}
                        style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => deleteProject(project.id)}
                        style={{ fontFamily: ff, fontSize: 11, color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
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
          <section ref={feedbackSectionRef} className="agora-card" style={{ padding: 24, marginTop: 16 }}>
            <h2 style={{ fontFamily: fd, fontSize: 18, fontWeight: 400, color: 'var(--text-primary)', margin: '0 0 16px' }}>
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
  const ff = 'var(--font-space-grotesk), system-ui, sans-serif';
  return (
    <div>
      <label style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function FeedbackList({ feedback }: { feedback: FeedbackRow[] }) {
  const ff = 'var(--font-space-grotesk), system-ui, sans-serif';
  const CATEGORY_LABELS: Record<string, string> = {
    general: 'General', design: 'Design & UX',
    'idea-validation': 'Idea validation', growth: 'Growth & traction', technical: 'Technical',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {feedback.map((fb) => (
        <div key={fb.id} className="agora-chip-row" style={{ padding: '12px 14px', borderColor: fb.read_at ? 'var(--border-section)' : 'var(--gold)', opacity: fb.read_at ? 0.7 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {!fb.read_at && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />}
              <span style={{
                fontFamily: ff, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px',
                color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: 20, padding: '2px 8px', opacity: 0.85,
              }}>
                {CATEGORY_LABELS[fb.category] ?? fb.category}
              </span>
              {fb.project && <span style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)' }}>on {fb.project.title}</span>}
            </div>
            <span style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)' }}>
              {new Date(fb.created_at).toLocaleDateString()}
            </span>
          </div>
          <p style={{ fontFamily: ff, fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{fb.content}</p>
          {fb.from_member && (
            <p style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 0' }}>
              from{' '}
              <Link href={`/members/${fb.from_member.slug}`} style={{ color: 'var(--gold)', textDecoration: 'none' }}>
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
  const ff = 'var(--font-space-grotesk), system-ui, sans-serif';
  return (
    <div className="agora-chip-row" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, borderColor: 'var(--gold)' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>Status</label>
          <select value={value.status} onChange={(e) => onChange({ ...value, status: e.target.value as Project['status'] })} className="agora-input">
            <option value="live">Live</option>
            <option value="wip">WIP</option>
          </select>
        </div>
        <div>
          <label style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>Visibility</label>
          <select value={value.visibility} onChange={(e) => onChange({ ...value, visibility: e.target.value as Project['visibility'] })} className="agora-input">
            <option value="community">Community only</option>
            <option value="public">Public</option>
          </select>
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: ff, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
        <button onClick={onCancel} style={{ fontFamily: ff, fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
        <button onClick={onSave} disabled={!value.title} className="agora-btn-primary">Save</button>
      </div>
    </div>
  );
}
