# Stoa Member Project Directory — project context

## What this is
A community member directory for Stoa. Members get tiles showing their name, bio, and up to 3 projects. Built with Next.js + Tailwind, deployed to GitHub Pages as a static export.

## Current state: Phase 2
- Data lives in **Supabase** (Postgres). `data/members.json` is now legacy — do not use it as a source of truth.
- Auth via Supabase magic link (email). Members log in at `/login`.
- Deployed at https://arthur-fox.github.io/stoa-directory/

## Supabase
- Project URL: https://jnzxmfnbuigyemewvwas.supabase.co
- Tables: `members`, `projects`
- RLS: public rows visible to all; authenticated users see everything; members write only their own rows
- Schema SQL: `supabase/schema.sql` — run once in Supabase SQL editor to set up tables + seed data
- `seeking_feedback` is snake_case in the DB; mapped to `seekingFeedback` in the `toMember()` transform in each page

## Key architectural decisions to preserve

**DB column names are snake_case; TS types are camelCase.** The `toMember()` helper (defined in `app/page.tsx` and `components/MemberDetailClient.tsx`) handles the mapping. Keep these in sync.

**`visibility` on both members and projects.** `"public"` = visible to all. `"community"` = logged-in only. Default for new projects is `"community"` (safe, opt-in to public).

**`seekingFeedback` / `seeking_feedback` is a first-class field.** Phase 3 will surface these in a dedicated section. Keep it everywhere.

**Static export + client-side data fetching.** Pages fetch from Supabase in the browser. `generateStaticParams` for `[slug]` fetches slugs from Supabase at build time — new members' detail pages won't appear until next deploy.

**GitHub Pages requires `basePath: "/stoa-directory"`** in `next.config.ts`. Don't remove it.

**Auth redirect URL** is set via `NEXT_PUBLIC_SITE_URL` env var. Local: `http://localhost:3000/stoa-directory`. Production: `https://arthur-fox.github.io/stoa-directory`.

## Environment variables
Required in `.env.local` locally and as GitHub Actions secrets for deployment:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

## Routes
- `/` — public directory, fetches from Supabase client-side
- `/members/[slug]` — member detail, client-side fetch via `MemberDetailClient`
- `/login` — magic link email form
- `/auth/callback` — handles magic link redirect, sends to `/dashboard`
- `/dashboard` — member edits own profile + projects (auth required)

## Phase roadmap
1. ✅ Static JSON-driven directory, GitHub Pages
2. ✅ Supabase (auth + DB), member dashboard, visibility controls
3. Feedback requests with structured prompts (community-only)
4. Self-onboarding, client-side search (Fuse.js), tag filtering

## Adding a member (for now)
Insert directly into Supabase `members` + `projects` tables, or run a SQL snippet. Once a member is linked (user_id set), they can manage their own profile via the dashboard.
