# Phase 3: Expert Identity — Research

**Phase goal:** Give experts editable profiles with public answer archives, enabling the browse-by-person feed that makes selectivity patterns visible.

**Requirements:** PROF-02, PROF-03, PROF-04, PROF-05, FEED-02

---

## 1. Current State Analysis

### Schema: profiles table (from 00001_initial_schema.sql)

Fields that exist:
- `id` UUID PK → auth.users
- `handle` TEXT UNIQUE (auto-generated with random suffix, e.g., `keith-obrien-a3f2`)
- `display_name` TEXT NOT NULL
- `bio` TEXT (nullable, currently unused)
- `avatar_url` TEXT (nullable, from OAuth)
- `linkedin_url` TEXT (nullable, currently unused)
- `role` TEXT DEFAULT 'user'
- `answer_limit` INTEGER DEFAULT 3
- `created_at`, `updated_at` TIMESTAMPTZ

**Missing for Phase 3:**
- `headline` — short tagline (e.g., "VP of Engineering at Acme")
- `organization` — company/org name

**Already present but unused:**
- `bio` — ready for Phase 3 profile editing
- `linkedin_url` — can display on profile page

### RLS Policies (from 00002_rls_policies.sql)

- `SELECT`: public (anyone can read profiles) ✅
- `UPDATE`: own profile only (`auth.uid() = id`) ✅
- No INSERT (trigger-only) ✅
- No DELETE ✅

**No RLS changes needed for Phase 3.**

### Indexes

- `idx_profiles_handle` on `profiles(handle)` — lookup by handle ✅
- `idx_answers_expert` on `answers(expert_id, created_at DESC)` — expert's answer feed ✅

**No new indexes needed for Phase 3.**

### Existing Patterns

AnswerCard currently receives `expert` with: `display_name, handle, avatar_url, answer_limit` — but no link to `/expert/[handle]`.

Question detail page (`/q/[slug]`) joins answers → profiles with:
```javascript
.select(`*, profiles!inner (id, display_name, handle, avatar_url, answer_limit)`)
```

Homepage joins similarly but without `id`.

---

## 2. Technical Details

### 2.1 Schema Migration

Add `headline` and `organization` columns to profiles:

```sql
-- supabase/migrations/00004_profile_fields.sql
ALTER TABLE public.profiles
  ADD COLUMN headline TEXT,
  ADD COLUMN organization TEXT;
```

Both nullable. No default needed. Lightweight migration — no data backfill required.

### 2.2 Profile Edit Server Action

Pattern follows existing `submitAnswer` action:

```javascript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(prevState, formData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'You must be signed in.' }

  const updates = {
    display_name: formData.get('display_name')?.trim(),
    headline: formData.get('headline')?.trim() || null,
    bio: formData.get('bio')?.trim() || null,
    organization: formData.get('organization')?.trim() || null,
    handle: formData.get('handle')?.trim()?.toLowerCase(),
  }

  // Validate display_name
  if (!updates.display_name || updates.display_name.length < 2) {
    return { error: 'Display name must be at least 2 characters.' }
  }

  // Validate handle
  if (!updates.handle || !/^[a-z0-9-]+$/.test(updates.handle)) {
    return { error: 'Handle must contain only lowercase letters, numbers, and hyphens.' }
  }
  if (updates.handle.length < 3 || updates.handle.length > 40) {
    return { error: 'Handle must be 3-40 characters.' }
  }

  // Length limits
  if (updates.headline && updates.headline.length > 120) {
    return { error: 'Headline must be under 120 characters.' }
  }
  if (updates.bio && updates.bio.length > 500) {
    return { error: 'Bio must be under 500 characters.' }
  }
  if (updates.organization && updates.organization.length > 100) {
    return { error: 'Organization must be under 100 characters.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    if (error.message.includes('profiles_handle_key')) {
      return { error: 'That handle is already taken.' }
    }
    return { error: 'Failed to update profile.' }
  }

  // Revalidate profile page and pages that show profile data
  revalidatePath(`/expert/${updates.handle}`)
  revalidatePath('/dashboard')
  revalidatePath('/')

  return { success: true }
}
```

**Handle editing:** Users can change their auto-generated handle to something custom. The UNIQUE constraint on `profiles(handle)` prevents collisions. If the new handle is taken, the unique constraint error is caught and a friendly message returned.

### 2.3 Public Profile Page

Route: `/expert/[handle]/page.jsx`

Server Component that:
1. Looks up profile by handle (single query)
2. Fetches all answers by this expert, joined with question data
3. Computes selectivity stats:
   - Total answers this month
   - Total published questions this month
   - Selectivity ratio: "Answered X of Y questions this month"

```javascript
// Fetch profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('handle', handle)
  .single()

// Fetch all answers with question context
const { data: answers } = await supabase
  .from('answers')
  .select(`
    *,
    questions!inner (
      id, body, slug, category, publish_date
    )
  `)
  .eq('expert_id', profile.id)
  .order('created_at', { ascending: false })

// Monthly stats
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
const monthlyAnswers = answers.filter(a => a.created_at >= startOfMonth)

const { count: totalQuestionsThisMonth } = await supabase
  .from('questions')
  .select('*', { count: 'exact', head: true })
  .lte('publish_date', now.toISOString().slice(0, 10))
  .gte('publish_date', startOfMonth.slice(0, 10))
  .in('status', ['scheduled', 'published'])
```

### 2.4 Selectivity Stats

PROF-04 requires: "Profile displays monthly answer count and selectivity ratio"

The selectivity ratio = answers this month / questions published this month.

Example: "Answered 2 of 18 questions this month" — this communicates that the expert deliberately chose which 2 to answer.

Computation:
- Monthly answer count: `COUNT(*) FROM answers WHERE expert_id = ? AND created_at >= start_of_month`
- Monthly question count: `COUNT(*) FROM questions WHERE publish_date >= start_of_month AND publish_date <= today AND status IN ('scheduled', 'published')`
- Selectivity ratio: `monthly_answers / monthly_questions`

Display: "Answered 2 of 18 this month (11% selectivity)" or simpler: "2 of 18 questions answered this month"

### 2.5 Browse-by-Person Feed

FEED-02 requires: "Browse by person — expert's full answer history"

This is the public profile page answer list. Each answer shows:
- Question body (linked to `/q/[slug]`)
- Answer body (rendered as Markdown)
- Date answered
- Category badge

The existing `AnswerCard` component can be reused, or a compact variant created that emphasizes the question context over the expert info (since we're already on the expert's page).

### 2.6 AnswerCard Expert Linking

Wrap the expert name and avatar in a `<Link>` to `/expert/${expert.handle}`. This small change makes the entire browsing experience navigable:

- See an interesting answer → click expert name → see all their answers
- On expert page → click a question link → see all answers to that question

### 2.7 Dashboard Enhancement

The dashboard page should become the hub for authenticated experts:
- Profile preview (what others see)
- Edit profile link or inline form
- Stats: total answers, monthly usage, selectivity ratio
- Link to public profile

---

## 3. Wave Structure

**Wave 1 (no dependencies, parallel):**
- Plan 01: Database migration (add headline, organization fields)
- Plan 02: Public profile page + browse-by-person feed + AnswerCard linking

**Wave 2 (depends on 01 and 02):**
- Plan 03: Profile editing (Server Action, edit form, dashboard enhancement)

Rationale: The migration must happen before the edit form can save new fields. The public profile page can be built in Wave 1 with just existing fields (bio, display_name, avatar, linkedin_url). The edit form (Wave 2) depends on both the migration (new fields exist) and the public profile page (need to know the route for revalidation).

---

## 4. File Impact

**New files:**
- `supabase/migrations/00004_profile_fields.sql`
- `src/app/expert/[handle]/page.jsx`
- `src/app/actions/profile.js`
- `src/components/EditProfileForm.jsx`
- `src/components/ProfileStats.jsx`

**Modified files:**
- `src/components/AnswerCard.jsx` — add expert name link
- `src/app/dashboard/page.jsx` — enhance with edit form and stats
- `src/components/Header.jsx` — add dashboard link for authenticated users
- `src/components/HeaderAuth.jsx` — add dashboard link
- `src/app/q/[slug]/page.jsx` — include new profile fields in query
- `src/app/page.jsx` — include handle in answer query for linking
- `src/app/answers/[id]/page.jsx` — include handle for linking

---

## RESEARCH COMPLETE
