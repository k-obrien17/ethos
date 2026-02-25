# Phase 5 Research: Distribution

**Date:** 2026-02-25
**Requirements:** ANS-05, QUES-04, FEED-05, INFR-03, INFR-04, INFR-05

## Current State

### Metadata (generateMetadata)

All dynamic pages have basic metadata but NO OpenGraph or Twitter card structure:

| Page | Title | Description | OG/Twitter |
|------|-------|-------------|-----------|
| `/q/[slug]` | `${body} — Ethos` | Category-based | Missing |
| `/answers/[id]` | `${expert} on "${question}" — Ethos` | First 150 chars of body | Missing |
| `/expert/[handle]` | `${name} — Ethos` | Headline or bio excerpt | Missing |
| Root layout | `Ethos` | Tagline | Missing |
| `/questions` | Basic | Basic | Missing |
| `/dashboard` | Title only | — | Missing |

### Root Layout

```javascript
export const metadata = {
  title: 'Ethos',
  description: 'What you choose to answer reveals what you stand for.',
}
```

No `viewport` export. No base OpenGraph or Twitter defaults. No icons.

### Dependencies

`@vercel/og` NOT installed. Need to add for social card image generation.

### Mobile Responsiveness Gaps

**Critical grid issues — no responsive breakpoints:**
- `dashboard/page.jsx`: `grid grid-cols-3` — 3 columns on ALL screens
- `expert/[handle]/page.jsx`: `grid grid-cols-3` — 3 columns on ALL screens
- `admin/page.jsx`: `grid grid-cols-4` — 4 columns on ALL screens

**Good patterns already in place:**
- Root layout: `max-w-2xl mx-auto px-4` container (responsive)
- Header: flex with gap (responsive)
- Forms: `w-full` inputs (responsive)
- Profile header: `flex items-start gap-4` with `min-w-0` (prevents overflow)
- Login: `max-w-xs` (good for mobile)

**Missing:** viewport metadata in root layout.

### Account Deletion Infrastructure

**Database supports cascading deletes:**
```
auth.users → profiles (ON DELETE CASCADE) → answers (ON DELETE CASCADE)
```

- `created_by` on questions is nullable FK — no cascade issue
- RLS has no DELETE policy for profiles (comment says "future: account deletion via server action")
- Need service role key to call `supabase.auth.admin.deleteUser(userId)`
- `SUPABASE_SERVICE_ROLE_KEY` already in `.env.example`

### URL Routing (Already Built)

- `/q/[slug]` — question detail with answers ✓
- `/answers/[id]` — individual answer page ✓
- `/expert/[handle]` — public profile ✓

Phase 5 enriches these with OG meta tags and social card images.

## Technical Approach

### OG Image Generation

Use `@vercel/og` with `ImageResponse` at `/api/og`:
- Query params: `type` (question|answer|expert), `id`
- Renders styled card with warm palette
- Returns 1200×630 PNG for social platforms

### Account Deletion

1. Server Action calls `supabase.auth.admin.deleteUser(userId)` via service role client
2. This triggers auth.users row deletion
3. ON DELETE CASCADE propagates to profiles → answers
4. Sign out client-side and redirect to homepage

### Legal Pages

Static pages at `/privacy` and `/terms` with basic legal copy appropriate for beta.

## Plan Structure

| Plan | Title | Wave | Requirements | Files Modified |
|------|-------|------|-------------|----------------|
| 01 | OG meta + social cards + mobile responsive | 1 | ANS-05, QUES-04, FEED-05, INFR-03 | layout, q/[slug], answers/[id], expert/[handle], dashboard, admin, api/og, package.json |
| 02 | Account deletion + legal pages + footer | 2 | INFR-04, INFR-05 | profile.js, dashboard, /privacy, /terms, layout |

Wave 2 depends on Wave 1 because both modify dashboard/page.jsx (responsive grid fix vs. delete account section).
