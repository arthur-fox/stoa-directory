# Stoa Member Project Directory — project context

## What this is
A community member directory for Stoa. Members get tiles showing their name, bio, and up to 3 projects. Built with Next.js + Tailwind, deployed to GitHub Pages as a static export.

## Current state: Phase 1
- Data is hand-curated in `data/members.json` — this is the single source of truth
- No auth, no database yet
- Deployed at https://arthur-fox.github.io/stoa-directory/

## Key architectural decisions to preserve

**The data model is Supabase-ready.** Every field in `lib/types.ts` maps directly to a future Postgres schema. When Phase 2 comes, the migration is swapping the JSON import for a Supabase query — not a redesign. Don't flatten or simplify the types.

**`visibility` fields exist on both members and projects.** `"public"` = visible to everyone. `"community"` = logged-in members only (not enforced yet, but the field must stay). Default new entries to `"public"` for now.

**`seekingFeedback` is a first-class field on projects.** Phase 3 will surface these in a dedicated section. Keep it in the data model even though the UI doesn't use it yet.

**GitHub Pages requires `basePath: "/stoa-directory"`** in `next.config.ts`. Don't remove it. The local dev server also uses this path, so local URLs are `localhost:3000/stoa-directory`.

## Phase roadmap
1. ✅ Static JSON-driven directory, GitHub Pages
2. Supabase (auth + DB), member dashboard, visibility controls
3. Feedback requests with structured prompts (community-only)
4. Self-onboarding, client-side search (Fuse.js), tag filtering

## Adding a member
Edit `data/members.json`. Push to `main`. GitHub Actions redeploys automatically (~1 min).
