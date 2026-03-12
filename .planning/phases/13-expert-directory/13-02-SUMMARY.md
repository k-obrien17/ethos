---
phase: 13-expert-directory
plan: 02
subsystem: ui
tags: [next.js, supabase, admin, featured-expert, site-settings]

requires:
  - phase: 13-expert-directory
    provides: expert directory page, expertise derivation pattern
provides:
  - site_settings key-value table
  - admin featured expert management page
  - homepage featured expert spotlight section
affects: []

tech-stack:
  added: []
  patterns: [site-settings-key-value, admin-featured-selection]

key-files:
  created: [supabase/migrations/00023_featured_expert.sql, src/app/actions/settings.js, src/app/admin/experts/page.jsx, src/app/admin/experts/SetFeaturedButton.jsx]
  modified: [src/app/admin/layout.jsx, src/app/page.jsx]

key-decisions:
  - "Used site_settings key-value table instead of column on profiles — cleaner for future site-wide settings"
  - "SetFeaturedButton uses optimistic state + useTransition, matching FollowTopicButton pattern"
  - "Featured expert spotlight placed between trending and recent questions on homepage"

patterns-established:
  - "site_settings table for key-value config (extensible for future settings)"
  - "Admin feature controls: server component page + client component button with server action"

requirements-completed: [EXPR-03]

duration: 3min
completed: 2026-03-11
---

# Plan 13-02: Featured Expert Spotlight Summary

**Admin-curated featured expert spotlight with site_settings table, admin selection page, and homepage card showing profile, stats, and expertise**

## Performance

- **Duration:** 3 min
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created site_settings table with RLS for public read / admin write
- Admin /admin/experts page lists experts with feature/clear controls and current featured indicator
- Homepage renders featured expert spotlight with avatar, name, headline, bio excerpt, stats, and expertise pills
- Section conditionally hidden when no featured expert is set

## Task Commits

1. **Task 1: Migration + admin page** - `11c3604` (feat)
2. **Task 2: Homepage spotlight section** - `1366402` (feat)

## Files Created/Modified
- `supabase/migrations/00023_featured_expert.sql` - site_settings table with featured_expert_id
- `src/app/actions/settings.js` - Server actions for set/clear featured expert
- `src/app/admin/experts/page.jsx` - Admin expert list with feature controls
- `src/app/admin/experts/SetFeaturedButton.jsx` - Client component with optimistic updates
- `src/app/admin/layout.jsx` - Added Experts link to admin nav
- `src/app/page.jsx` - Featured expert spotlight section

## Decisions Made
- Used site_settings key-value table for extensibility over adding column to profiles
- Spotlight queries run conditionally only when featured_expert_id is set
- revalidatePath('/') called on feature change to bust homepage cache

## Deviations from Plan
None - plan executed as specified.

## Issues Encountered
None.

## Next Phase Readiness
- Phase 13 (Expert Directory) fully complete
- Migration 00023_featured_expert.sql must be applied to Supabase

---
*Phase: 13-expert-directory*
*Completed: 2026-03-11*
