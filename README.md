# 🏛️ Stoa Member Project Directory

A public directory of Stoa community members and what they're building.

**Live site:** https://arthur-fox.github.io/stoa-directory/

---

## Adding or editing members

All member data lives in [`data/members.json`](data/members.json). Each entry follows this shape:

```json
{
  "id": "unique-id",
  "slug": "firstname-lastname",
  "name": "Full Name",
  "avatar": null,
  "bio": "Short bio.",
  "location": "City, Country",
  "social": {
    "twitter": "handle",
    "linkedin": "profile-slug",
    "website": "https://..."
  },
  "tags": ["founder", "developer"],
  "visibility": "public",
  "projects": [
    {
      "id": "unique-id",
      "title": "Project Name",
      "description": "One line description.",
      "url": "https://...",
      "type": "saas",
      "tags": ["ai", "productivity"],
      "visibility": "public",
      "status": "active",
      "thumbnail": null,
      "seekingFeedback": false
    }
  ]
}
```

`visibility` can be `"public"` (visible to everyone) or `"community"` (reserved for the logged-in phase). Default to `"public"` for now.

`status` can be `"active"`, `"shipped"`, or `"wip"`.

Edit the file and push to `main` — GitHub Actions will redeploy automatically.

---

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000/stoa-directory](http://localhost:3000/stoa-directory).

---

## Tech stack

- **Next.js 16** (App Router, static export)
- **Tailwind CSS**
- **GitHub Pages** via GitHub Actions

---

## Roadmap

### Phase 1 — Static public showcase ✅
Hand-curated member tiles, deployed to GitHub Pages. Data lives in `members.json`.

### Phase 2 — Auth + member dashboard
- Migrate data layer to **Supabase** (Postgres + Auth)
- Members can log in and edit their own profile and projects
- Visibility toggle per project (default: community-only)
- Row-level security: members can only edit their own rows

### Phase 3 — Feedback
- Members can flag a project as "seeking feedback"
- Structured feedback prompts (design, idea validation, growth, technical)
- Feedback is community-only and public within Stoa

### Phase 4 — Self-onboarding + search
- Members can request to join and add themselves
- Client-side search (Fuse.js)
- Filter by tags and project type
