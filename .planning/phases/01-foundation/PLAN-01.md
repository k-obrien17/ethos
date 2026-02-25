---
phase: 1
plan: "01"
title: "Project scaffolding and Vercel deployment"
wave: 1
depends_on: []
requirements: ["INFR-01"]
files_modified:
  - "src/app/layout.jsx"
  - "src/app/page.jsx"
  - "src/app/globals.css"
  - "src/lib/supabase/client.js"
  - "src/lib/supabase/server.js"
  - "src/lib/supabase/middleware.js"
  - "src/middleware.js"
  - "postcss.config.mjs"
  - ".env.example"
  - ".env.local"
  - ".gitignore"
  - "package.json"
  - "jsconfig.json"
  - "next.config.mjs"
autonomous: true
estimated_tasks: 6
---

# Plan 01: Project scaffolding and Vercel deployment

## Objective

Replace the existing Daily 10 Tauri codebase with a fresh Next.js 15 project configured with App Router, Tailwind CSS v4, Inter font, warm color palette, Supabase client factories, and environment variable templates. Deploy the placeholder app to Vercel immediately so every subsequent plan builds on a live, deployed foundation.

## must_haves

- Next.js 15 project runs locally with `npm run dev` on localhost:3000
- Tailwind v4 warm palette classes (`bg-warm-50`, `text-warm-900`) render correctly
- Inter font loads via `next/font/google` with no layout shift
- Three Supabase client factories exist at `src/lib/supabase/{client,server,middleware}.js`
- Middleware entry point exists at `src/middleware.js` with session refresh wiring
- `.env.example` committed with Supabase variable templates (no secrets)
- App is deployed to Vercel with automatic preview deploys on PR branches

## Tasks

<task id="1" title="Remove old Daily 10 codebase files">
Delete the old Tauri/Vite project files that will be replaced. Remove:
- `src/` (entire directory — old React + Vite app)
- `src-tauri/` (Tauri Rust backend)
- `vite.config.js` (if exists)
- `tailwind.config.js` (if exists — Tailwind v4 uses CSS-first config)
- `postcss.config.js` (will be replaced by `postcss.config.mjs`)
- `index.html` (Vite entry point)

Preserve:
- `.git/` (git history)
- `.planning/` (planning docs)
- `CLAUDE.md` (will be updated after scaffolding)
- `.gitignore` (will be updated)
- Any other dotfiles (`.claude/`, etc.)

Do NOT delete `package.json` or `package-lock.json` yet — the scaffolding step will handle them.
</task>

<task id="2" title="Scaffold Next.js 15 project" depends_on="1">
Create the Next.js project in a temporary directory, then move files into the repo root.

```bash
# From a temp location
npx create-next-app@latest ethos-next --app --tailwind --eslint --src-dir --import-alias "@/*" --js
```

When prompted:
- TypeScript: **No** (JavaScript only, per CLAUDE.md)
- ESLint: **Yes**
- Tailwind CSS: **Yes**
- `src/` directory: **Yes**
- App Router: **Yes**
- Turbopack: **Yes** (for dev speed)
- Import alias: `@/*`

Then copy the scaffolded files into the repo root:
- `src/` (new Next.js app directory structure)
- `public/`
- `package.json`
- `next.config.mjs` (or `next.config.js`)
- `jsconfig.json`
- `postcss.config.mjs`
- `eslint.config.mjs`

Run `npm install` to verify clean install. Run `npm run dev` to verify the app starts on localhost:3000.
</task>

<task id="3" title="Configure Tailwind v4 warm palette and Inter font" depends_on="2">
Set up the design system foundation. See 01-RESEARCH.md Section 2.2 and 2.3 for exact values.

**`src/app/globals.css`** — Replace the default content with:
```css
@import "tailwindcss";

@theme {
  --color-warm-50: #faf5f0;
  --color-warm-100: #f0e6d8;
  --color-warm-200: #e3d0bb;
  --color-warm-300: #d4b896;
  --color-warm-400: #c49d6f;
  --color-warm-500: #b48352;
  --color-warm-600: #9a6b3f;
  --color-warm-700: #7d5432;
  --color-warm-800: #5e3e26;
  --color-warm-900: #2d1f0e;

  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
}
```

**`src/app/layout.jsx`** — Set up the root layout with Inter font via `next/font/google`:
```jsx
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Ethos',
  description: 'What you choose to answer reveals what you stand for.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-warm-50 text-warm-900 antialiased">
        {children}
      </body>
    </html>
  )
}
```

**`src/app/page.jsx`** — Create a minimal placeholder homepage that verifies the palette works:
```jsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-warm-900 mb-4">Ethos</h1>
      <p className="text-warm-600 text-lg">
        What you choose to answer reveals what you stand for.
      </p>
    </main>
  )
}
```

Verify: `npm run dev` shows the page with Inter font and warm colors.
</task>

<task id="4" title="Create Supabase client factories" depends_on="2">
Install Supabase packages and create the three client factory files. See 01-RESEARCH.md Section 2.5 for the exact code.

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Create three files:

**`src/lib/supabase/client.js`** — Browser client for Client Components. Uses `createBrowserClient` from `@supabase/ssr`. Reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

**`src/lib/supabase/server.js`** — Server client for Server Components and Server Actions. Uses `createServerClient` from `@supabase/ssr` with cookie get/set via `next/headers`. The `setAll` method must be wrapped in try/catch (Server Components cannot set cookies).

**`src/lib/supabase/middleware.js`** — Middleware client with session refresh. Exports `updateSession(request)` function. Must copy cookies to both the request and the response. Includes protected route redirect logic for `/admin/*` and `/dashboard/*` routes. See 01-RESEARCH.md Section 2.5 for the full implementation.

Use the exact code patterns from 01-RESEARCH.md Sections 2.5 and 2.6 — the cookie handling patterns are specific to `@supabase/ssr` and must match exactly.
</task>

<task id="5" title="Set up middleware and environment variables" depends_on="4">
**`src/middleware.js`** — Create the middleware entry point. See 01-RESEARCH.md Section 2.6:
```javascript
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**`.env.example`** — Create the committed template (no secrets):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**`.env.local`** — Create with placeholder values pointing to local Supabase (will be populated when Supabase project is created in Plan 02):
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
SUPABASE_SERVICE_ROLE_KEY=placeholder
```

**`.gitignore`** — Ensure `.env.local` and `.env*.local` are in `.gitignore` (create-next-app should handle this, but verify).
</task>

<task id="6" title="Deploy to Vercel" depends_on="3,5">
This task requires manual steps in the Vercel dashboard, but the codebase should be ready.

1. Commit all changes to the `main` branch
2. Connect the GitHub repo to Vercel (Vercel dashboard > Import Project)
3. Vercel auto-detects Next.js — accept defaults
4. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL` = (production Supabase URL, set after Plan 02)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (production anon key, set after Plan 02)
   - `SUPABASE_SERVICE_ROLE_KEY` = (production service role key, set after Plan 02)
5. Deploy — the placeholder page should be live at `*.vercel.app`
6. Create a test PR branch to verify preview deploys work

Note: Supabase env vars will be placeholder/empty until Plan 02 creates the Supabase project. The app will still deploy and render the placeholder page since it does not call Supabase yet.
</task>

## Verification

- [ ] `npm run dev` starts without errors on localhost:3000
- [ ] Homepage renders with Inter font (inspect DevTools > Computed > font-family)
- [ ] `bg-warm-50` and `text-warm-900` classes render correct warm stone colors
- [ ] No old Daily 10 files remain (`src-tauri/`, `vite.config.js`, old `src/` components)
- [ ] `src/lib/supabase/client.js`, `server.js`, `middleware.js` all exist
- [ ] `@supabase/supabase-js` and `@supabase/ssr` are in `package.json` dependencies
- [ ] `.env.example` is committed (no secrets)
- [ ] `.env.local` is in `.gitignore`
- [ ] `src/middleware.js` exists with the session refresh matcher
- [ ] App is deployed and accessible at `*.vercel.app` URL
- [ ] PR branches generate Vercel preview deployments
