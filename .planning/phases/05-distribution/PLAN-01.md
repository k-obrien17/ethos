---
phase: 5
plan: "01"
title: "OG meta enrichment, social card generation, and mobile responsive pass"
wave: 1
depends_on: []
requirements: ["ANS-05", "QUES-04", "FEED-05", "INFR-03"]
files_modified:
  - "package.json"
  - "src/app/layout.jsx"
  - "src/app/api/og/route.jsx"
  - "src/app/q/[slug]/page.jsx"
  - "src/app/answers/[id]/page.jsx"
  - "src/app/expert/[handle]/page.jsx"
  - "src/app/dashboard/page.jsx"
  - "src/app/admin/page.jsx"
  - "src/components/ShareButton.jsx"
autonomous: true
estimated_tasks: 8
---

# Plan 01: OG meta enrichment, social card generation, and mobile responsive pass

## Objective

Make every piece of content shareable on social platforms with rich previews (OpenGraph + Twitter cards), generate dynamic social card images via `@vercel/og`, and fix all mobile responsiveness issues. This covers the "distribution" half of the phase — everything needed for content to look good when shared and when viewed on phones.

## must_haves

- OpenGraph meta tags on question pages: title, description, type, url, image (FEED-05)
- OpenGraph meta tags on answer pages: expert name, question text, answer excerpt, image (FEED-05)
- OpenGraph meta tags on expert profile pages: name, headline, image (FEED-05)
- Twitter card meta tags (summary_large_image) on all content pages (FEED-05)
- Dynamic social card images generated via `/api/og` endpoint (FEED-05)
- Question URLs work as shareable links with rich previews (QUES-04)
- Answer URLs work as shareable links with rich previews (ANS-05)
- Viewport metadata in root layout (INFR-03)
- All stat grids responsive: single column on mobile, multi-column on larger screens (INFR-03)
- All pages usable on 375px-wide viewport (INFR-03)

## Tasks

<task id="1" title="Install @vercel/og">
Run `npm install @vercel/og` to add the social card image generation dependency.
</task>

<task id="2" title="Create /api/og dynamic image route">
Create `src/app/api/og/route.jsx` — a Route Handler that generates dynamic 1200×630 PNG social card images using `@vercel/og` `ImageResponse`.

```jsx
import { ImageResponse } from '@vercel/og'

export const runtime = 'edge'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'question', 'answer', 'expert'
  const title = searchParams.get('title') ?? 'Ethos'
  const subtitle = searchParams.get('subtitle') ?? ''
  const detail = searchParams.get('detail') ?? ''

  return new ImageResponse(
    (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px',
        width: '100%',
        height: '100%',
        backgroundColor: '#faf9f7',      // warm-50
        fontFamily: 'Inter, sans-serif',
      }}>
        {type && (
          <div style={{
            fontSize: 20,
            color: '#78716c',              // warm-500
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '16px',
          }}>
            {type === 'question' ? 'Question' : type === 'answer' ? 'Expert Answer' : 'Expert Profile'}
          </div>
        )}
        <div style={{
          fontSize: 48,
          fontWeight: 700,
          color: '#1c1917',                // warm-900
          lineHeight: 1.2,
          maxWidth: '900px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {title.slice(0, 120)}
        </div>
        {subtitle && (
          <div style={{
            fontSize: 24,
            color: '#57534e',              // warm-600
            marginTop: '16px',
          }}>
            {subtitle.slice(0, 100)}
          </div>
        )}
        {detail && (
          <div style={{
            fontSize: 18,
            color: '#a8a29e',              // warm-400
            marginTop: '12px',
          }}>
            {detail.slice(0, 80)}
          </div>
        )}
        <div style={{
          position: 'absolute',
          bottom: '40px',
          right: '60px',
          fontSize: 28,
          fontWeight: 700,
          color: '#d6d3d1',                // warm-300
        }}>
          Ethos
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
```

Query params:
- `type`: 'question' | 'answer' | 'expert' (determines label)
- `title`: main text (question body, expert name, etc.)
- `subtitle`: secondary text (category, headline, etc.)
- `detail`: tertiary text (date, excerpt, etc.)

All params are URL-encoded. Text is truncated for safety.
</task>

<task id="3" title="Add viewport + base OG metadata to root layout">
Update `src/app/layout.jsx`:

1. Add `viewport` export:
```javascript
export const viewport = {
  width: 'device-width',
  initialScale: 1,
}
```

2. Expand `metadata` with base OpenGraph, Twitter defaults, and `metadataBase`:
```javascript
export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Ethos',
    template: '%s — Ethos',
  },
  description: 'What you choose to answer reveals what you stand for.',
  openGraph: {
    type: 'website',
    siteName: 'Ethos',
  },
  twitter: {
    card: 'summary_large_image',
  },
}
```

Using the `title.template` pattern means child pages can export just `title: 'Page Name'` and it auto-appends `— Ethos`. Update existing generateMetadata functions to return plain titles without the `— Ethos` suffix (the template handles it).
</task>

<task id="4" title="Enrich generateMetadata on question page">
Update `src/app/q/[slug]/page.jsx` `generateMetadata`:

```javascript
export async function generateMetadata({ params }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: question } = await supabase
    .from('questions')
    .select('body, category, publish_date')
    .eq('slug', slug)
    .single()

  if (!question) return { title: 'Question not found' }

  const title = question.body
  const description = question.category
    ? `${question.category} question on Ethos`
    : 'A question on Ethos'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: [{
        url: `/api/og?type=question&title=${encodeURIComponent(question.body)}&subtitle=${encodeURIComponent(question.category ?? '')}&detail=${encodeURIComponent(question.publish_date ?? '')}`,
        width: 1200,
        height: 630,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}
```

Note: `title` is now plain (no `— Ethos` suffix) because the root layout template adds it.
</task>

<task id="5" title="Enrich generateMetadata on answer page">
Update `src/app/answers/[id]/page.jsx` `generateMetadata`:

```javascript
export async function generateMetadata({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: answer } = await supabase
    .from('answers')
    .select('body, profiles!expert_id(display_name), questions!question_id(body)')
    .eq('id', id)
    .single()

  if (!answer) return { title: 'Answer not found' }

  const expertName = answer.profiles?.display_name ?? 'Expert'
  const questionBody = answer.questions?.body ?? 'a question'
  const excerpt = answer.body?.slice(0, 150) ?? ''
  const title = `${expertName} on "${questionBody}"`

  return {
    title,
    description: excerpt,
    openGraph: {
      title,
      description: excerpt,
      type: 'article',
      images: [{
        url: `/api/og?type=answer&title=${encodeURIComponent(expertName)}&subtitle=${encodeURIComponent(questionBody)}&detail=${encodeURIComponent(excerpt)}`,
        width: 1200,
        height: 630,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: excerpt,
    },
  }
}
```
</task>

<task id="6" title="Enrich generateMetadata on expert profile page">
Update `src/app/expert/[handle]/page.jsx` `generateMetadata`:

```javascript
export async function generateMetadata({ params }) {
  const { handle } = await params
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, headline, bio')
    .eq('handle', handle)
    .single()

  if (!profile) return { title: 'Expert not found' }

  const title = profile.display_name
  const description = profile.headline || profile.bio?.slice(0, 150) || `${profile.display_name} on Ethos`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: [{
        url: `/api/og?type=expert&title=${encodeURIComponent(profile.display_name)}&subtitle=${encodeURIComponent(profile.headline ?? '')}&detail=${encodeURIComponent(profile.bio?.slice(0, 80) ?? '')}`,
        width: 1200,
        height: 630,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}
```
</task>

<task id="7" title="Fix responsive grids across all pages">
Update stat grid layouts to use responsive breakpoints:

1. **`src/app/dashboard/page.jsx`** line with `grid grid-cols-3`:
   Change to `grid grid-cols-1 sm:grid-cols-3 gap-4`

2. **`src/app/expert/[handle]/page.jsx`** line with `grid grid-cols-3`:
   Change to `grid grid-cols-1 sm:grid-cols-3 gap-4`

3. **`src/app/admin/page.jsx`** line with `grid grid-cols-4` (or similar):
   Change to `grid grid-cols-2 sm:grid-cols-4 gap-4`

These changes make stat cards stack on mobile (< 640px) and display in a row on larger screens. No other structural changes needed — the existing flex layouts, max-w-2xl container, and w-full inputs are already mobile-friendly.

Also fix metadata titles on pages that manually append `— Ethos` (the root layout template now handles this):
- `src/app/dashboard/page.jsx`: change `title: 'Dashboard — Ethos'` to `title: 'Dashboard'`
- `src/app/admin/page.jsx`: change `title: 'Admin Dashboard — Ethos'` to `title: 'Admin Dashboard'`
- `src/app/admin/questions/page.jsx`: change `title: 'Questions — Admin — Ethos'` to `title: 'Questions — Admin'`
- `src/app/admin/answers/page.jsx`: similarly strip the `— Ethos` suffix
- Any other pages with manual `— Ethos` in their metadata title
</task>

<task id="8" title="Create ShareButton component and add to content pages">
Create `src/components/ShareButton.jsx` — a Client Component that copies the current page URL to clipboard.

```jsx
'use client'

import { useState } from 'react'

export default function ShareButton() {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs text-warm-400 hover:text-warm-600"
    >
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}
```

Add this component to:
1. **`src/app/q/[slug]/page.jsx`** — in the question header area, next to the date or category
2. **`src/app/answers/[id]/page.jsx`** — in the answer footer, next to the "Link" text

Simple copy-to-clipboard — no modal, no social sharing icons. Just copies the URL.
</task>

## Verification

- [ ] Pasting a question URL into social platforms shows rich card preview with title, description, image (FEED-05)
- [ ] Pasting an answer URL shows expert name, question text, and answer excerpt in card (FEED-05)
- [ ] Pasting an expert profile URL shows name and headline in card (FEED-05)
- [ ] `/api/og` generates 1200×630 images with correct text rendering (FEED-05)
- [ ] OG images use the warm color palette consistently (FEED-05)
- [ ] Question URLs are shareable at `/q/[slug]` with metadata (QUES-04)
- [ ] Answer URLs are shareable at `/answers/[id]` with metadata (ANS-05)
- [ ] Viewport meta tag present in root layout (INFR-03)
- [ ] Dashboard stats display as single column on 375px screen (INFR-03)
- [ ] Expert profile stats display as single column on 375px screen (INFR-03)
- [ ] Admin dashboard stats display as 2-column on small screens (INFR-03)
- [ ] Share button copies URL to clipboard on question pages
- [ ] Share button copies URL to clipboard on answer pages
- [ ] No double `— Ethos` suffix on any page title
- [ ] `metadataBase` set in root layout for proper OG image URL resolution
- [ ] `npm run build` succeeds
