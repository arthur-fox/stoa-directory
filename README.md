# 🏛️ Stoa Member Project Directory

A directory of Stoa community members and what they're building.

**Live site:** https://arthur-fox.github.io/stoa-directory/

---

## Roadmap

### Phase 1 — Static public showcase ✅
Hand-curated member tiles deployed to GitHub Pages. Data lived in a static `members.json` file.

### Phase 2 — Auth + member dashboard ✅
- Data migrated to **Supabase** (Postgres + Auth)
- Magic link login via email (powered by Resend)
- Members can log in and edit their own bio, location, social links, and visibility
- Members can add, edit, and delete their own projects
- Visibility controls: **Public** (everyone) or **Community only** (logged-in members)
- Admin page for managing the full member list
- 90+ members pre-loaded; profiles appear in the directory once filled out
- Row-level security: members can only edit their own rows

### Phase 3 — Feedback ⬜
- Members can flag a project as "seeking feedback"
- Structured feedback prompts (design, idea validation, growth, technical)
- Feedback visible to community members only

### Phase 4 — Self-onboarding + search ⬜
- Members can request to join and add themselves
- Client-side search (Fuse.js)
- Filter by tags and project type

---

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000/stoa-directory](http://localhost:3000/stoa-directory).

Copy `.env.local.example` to `.env.local` and fill in the Supabase credentials.

---

## Tech stack

- **Next.js 15** (App Router, static export)
- **Tailwind CSS**
- **Supabase** (Postgres + Auth)
- **Resend** (transactional email for magic links)
- **GitHub Pages** via GitHub Actions (auto-deploys on push to `main`, plus nightly rebuild)
