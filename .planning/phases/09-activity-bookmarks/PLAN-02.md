---
phase: 9
plan: "02"
title: "Answer view counts — tracking and author-only display"
wave: 2
depends_on: ["01"]
requirements: ["ACTV-04"]
files_modified:
  - "supabase/migrations/00011_answer_view_counts.sql"
  - "src/app/api/answers/[id]/view/route.js"
  - "src/components/ViewTracker.jsx"
  - "src/app/answers/[id]/page.jsx"
  - "src/app/dashboard/page.jsx"
autonomous: true
estimated_tasks: 4
---

# Plan 02: Answer view counts — tracking and author-only display

## Objective

Track basic view counts on answers and display them to the answer author on their dashboard. View counts are private — not visible to other users or on public pages. A lightweight API route increments the counter when the answer detail page is viewed.

## must_haves

- `view_count` column on answers table (ACTV-04)
- API route to increment view count on answer page view
- View counts visible to answer author on dashboard (ACTV-04)
- View counts NOT visible to other users on any page
- Author can see total views across all their answers

## Tasks

<task id="1" title="Migration: add view_count to answers">
Create `supabase/migrations/00011_answer_view_counts.sql`:

```sql
-- ============================================================
-- Answer view counts — author-only engagement metric
-- ============================================================

ALTER TABLE public.answers
  ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;

-- RPC function for atomic view count increment
CREATE OR REPLACE FUNCTION increment_view_count(answer_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.answers
  SET view_count = view_count + 1
  WHERE id = answer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Key details:
- Simple integer counter, defaults to 0
- `increment_view_count` RPC function for atomic increment (Supabase JS doesn't support raw SQL expressions in update)
- SECURITY DEFINER so the function runs with owner privileges (bypasses RLS)
- No index needed — we only query view_count as part of existing answer fetches
- RLS already covers answers (visible answers are readable, hidden are admin-only)
</task>

<task id="2" title="Create view count API route">
Create `src/app/api/answers/[id]/view/route.js`:

```javascript
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
  const { id } = await params

  if (!id) {
    return NextResponse.json({ error: 'Missing answer ID' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { error } = await admin.rpc('increment_view_count', { answer_id: id })

  if (error) {
    console.error('[view] increment failed:', error)
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

Key details:
- POST route (not GET — this is a side effect)
- Uses admin client (service role) to call the `increment_view_count` SECURITY DEFINER function from Task 1's migration
- Atomic increment via SQL `view_count + 1` (no read-then-write race)
- No authentication required — any page view counts (anonymous included)
- Fire-and-forget from client — errors don't affect page rendering
</task>

<task id="3" title="Track views on answer detail page">
Update `src/app/answers/[id]/page.jsx`:

Add a client component that fires a view count request on mount. Create a small inline component or add it directly.

Add a new client component `src/components/ViewTracker.jsx`:

```jsx
'use client'

import { useEffect } from 'react'

export default function ViewTracker({ answerId }) {
  useEffect(() => {
    fetch(`/api/answers/${answerId}/view`, { method: 'POST' })
      .catch(() => {}) // fire-and-forget
  }, [answerId])

  return null
}
```

In `src/app/answers/[id]/page.jsx`, import and render it:

```javascript
import ViewTracker from '@/components/ViewTracker'
```

Add at the end of the return JSX (after the share/link section):
```jsx
<ViewTracker answerId={id} />
```

Key details:
- `ViewTracker` is a client component that renders nothing (returns null)
- Fires POST on mount via `useEffect` — runs once per page view
- Fire-and-forget: `.catch(() => {})` swallows errors (view tracking should never break the page)
- Only tracks on the individual answer page (not in feeds or lists)
</task>

<task id="4" title="Display view counts to answer author on dashboard">
Update `src/app/dashboard/page.jsx`:

1. Add a query for the user's answers with view counts, after the existing queries:

```javascript
  // Fetch user's answers with view counts (for author-only stats)
  const { data: myAnswers } = await supabase
    .from('answers')
    .select('id, view_count, body, created_at, questions!inner(body, slug)')
    .eq('expert_id', user.id)
    .order('created_at', { ascending: false })

  const totalViews = (myAnswers ?? []).reduce((sum, a) => sum + (a.view_count ?? 0), 0)
```

2. Add "Total Views" to the existing stats grid. The current grid has 3 stat cards (Budget Used, Selectivity, Total Answers). Add a 4th:

```jsx
<div className="bg-white rounded-lg border border-warm-200 p-4 text-center">
  <p className="text-2xl font-bold text-warm-900">{totalViews}</p>
  <p className="text-xs text-warm-500 mt-1">Total Views</p>
</div>
```

Change the grid from `sm:grid-cols-3` to `sm:grid-cols-4` to accommodate the new card.

3. Optionally, in the expert's own profile page view, show view count per answer. But per requirements, view counts are dashboard-only and not visible to other users. The `expert/[handle]/page.jsx` is a public page, so do NOT add view counts there.

Key details:
- Total views aggregated across all user's answers
- Displayed as a 4th stat card in the dashboard grid
- View counts are NOT shown on public expert profile pages
- Individual per-answer view counts could be shown in a future "My Answers" detail section, but for now the total suffices
</task>

## Verification

- [ ] Migration adds `view_count INTEGER NOT NULL DEFAULT 0` to answers
- [ ] Migration creates `increment_view_count` RPC function
- [ ] POST `/api/answers/[id]/view` increments the view_count
- [ ] ViewTracker component fires POST on mount (client-side)
- [ ] View count increments atomically (no race conditions)
- [ ] Dashboard shows "Total Views" stat card for the answer author
- [ ] View counts are NOT visible on public expert profile page
- [ ] View counts are NOT visible on question pages or answer feeds
- [ ] Missing or invalid answer ID returns appropriate error from API
- [ ] `npm run build` succeeds
