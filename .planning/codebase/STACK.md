# Technology Stack — Ethos

**Analysis Date:** 2026-02-25
**Project:** Ethos (Daily 10 journaling app for macOS)
**Repository:** `/Users/keithobrien/Desktop/Claude/Projects/ethos`

---

## Languages

### Primary: JavaScript/JSX

- **Entry point:** `src/main.jsx`
- **Framework usage:** React 19 functional components with hooks
- **No TypeScript** — vanilla JavaScript (JSX)
- **Code style:** ES6+ with async/await, modern array/string methods

### Secondary: Rust

- **Purpose:** Tauri desktop backend
- **Entry point:** `src-tauri/src/lib.rs`
- **Edition:** 2024
- **Scope:** Minimal — only initializes Tauri builder with fs plugin

---

## Runtime & Architecture

### Frontend Runtime

- **Package manager:** npm
- **Dev server:** Vite 7.3.1 (localhost:5173)
- **Build output:** `dist/` directory
- **Bundler:** Vite with React plugin + Tailwind CSS Vite integration

### Desktop Runtime

- **Framework:** Tauri v2
- **Platform:** macOS (native window via native-webview)
- **Window config:** 480×800px, resizable (min: 380×600px)
- **Title:** "Ethos"
- **Bundle identifier:** `com.totalemphasis.ethos`
- **Product version:** 0.1.0

### Build Pipeline

- **Frontend build:** `npm run build` → Vite compiles to `dist/`
- **Desktop build:** `npm run tauri:build` → Tauri packages `.app` / `.dmg` for macOS
- **Dev mode:** `npm run tauri:dev` → Runs Vite dev server + opens native window

---

## Frameworks & Core Dependencies

### React Ecosystem

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.0 | UI framework (functional components, hooks) |
| `react-dom` | ^19.2.0 | DOM rendering |

**Usage patterns:**
- Functional components with `useState`, `useEffect`, `useCallback`, `useRef`
- Component composition: `App.jsx` (main), `QuestionCard.jsx`, `ProgressBar.jsx`, `HistoryView.jsx`, `FlaggedView.jsx`, `WeeklyDigest.jsx`, `AddQuestion.jsx`, `ExportButton.jsx`
- View routing via `activeView` state + History API (`pushState`, `popstate`)
- No component libraries (custom Tailwind-styled components)

### Styling

| Package | Version | Purpose |
|---------|---------|---------|
| `@tailwindcss/vite` | ^4.1.18 | Tailwind CSS v4 Vite plugin |
| `tailwindcss` | ^4.1.18 | Utility-first CSS framework |

**Usage patterns:**
- Warm color palette (`warm-50` through `warm-900`)
- Category-specific colors: blue, purple, green, cyan, amber, red, pink, indigo, orange, lime
- Dark mode support (class-based: `.dark` on `<html>`)
- Responsive design (mobile-first, `sm:` breakpoints)
- Custom animations and scrollbar styling in `src/styles/index.css`

### Desktop Integration

| Package | Version | Purpose |
|---------|---------|---------|
| `@tauri-apps/api` | ^2.10.1 | Tauri frontend API (path utilities: `homeDir`, `join`) |
| `@tauri-apps/plugin-fs` | ^2.4.5 | Filesystem plugin (read/write vault files) |
| `@tauri-apps/cli` | ^2.10.0 | CLI tool for dev/build (devDependency) |

**Usage patterns:**
- File I/O in `src/utils/vaultSync.js`: `readTextFile`, `writeTextFile`, `exists`, `mkdir`
- Path resolution via `homeDir()` and `join()` from Tauri API
- Scoped to vault directory: `~/Desktop/obsidian-workspace/vault/Ethos/`

### Typography

| Package | Version | Purpose |
|---------|---------|---------|
| `@fontsource/inter` | ^5.2.8 | Inter font family (self-hosted) |

**Usage:** Embedded in `src/styles/index.css` via Fontsource

### Development Tools

| Package | Version | Purpose |
|---------|---------|---------|
| `@vitejs/plugin-react` | ^5.1.1 | Vite React Fast Refresh plugin |
| `@eslint/js` | ^9.39.1 | ESLint config |
| `eslint` | ^9.39.1 | Linter |
| `eslint-plugin-react-hooks` | ^7.0.1 | React Hooks lint rules |
| `eslint-plugin-react-refresh` | ^0.4.24 | Fast Refresh linting |
| `globals` | ^16.5.0 | Global variable definitions |
| `@types/react` | ^19.2.7 | React type definitions (dev only) |
| `@types/react-dom` | ^19.2.3 | React DOM type definitions (dev only) |

---

## Rust Dependencies (Tauri)

| Package | Version | Purpose |
|---------|---------|---------|
| `tauri` | 2 | Core desktop framework |
| `tauri-plugin-fs` | 2 | Filesystem API |
| `serde` | 1 (with `derive` feature) | Serialization |
| `serde_json` | 1 | JSON handling |
| `tauri-build` | 2 | Build-time Tauri setup (build-dependency) |

**Scope:** Minimal. `src-tauri/src/lib.rs` only:
1. Initializes Tauri builder
2. Registers fs plugin
3. Generates context and runs

---

## Configuration Files

### Vite Config

**File:** `vite.config.js`

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

- **Plugins:** React Fast Refresh, Tailwind CSS v4 Vite plugin
- **No aliases, no advanced optimization** — minimal config

### Tauri Config

**File:** `src-tauri/tauri.conf.json`

- **Product name:** "Ethos"
- **Identifier:** `com.totalemphasis.ethos`
- **Version:** 0.1.0
- **Build:**
  - Frontend dist: `../dist`
  - Dev URL: `http://localhost:5173`
  - Before dev: `npm run dev`
  - Before build: `npm run build`
- **App window:** 480×800px, resizable, system decorations enabled, CSP disabled
- **Bundle targets:** all (macOS, Windows, Linux)
- **Icons:** `.png`, `.icns`, `.ico` in `icons/` directory

### Rust Cargo

**File:** `src-tauri/Cargo.toml`

- **Edition:** 2024
- **Library name:** `ethos_lib`
- **Crate types:** lib, cdylib (for Tauri binding), staticlib
- **No workspace** — single package

### ESLint Config

**File:** `.eslintrc.cjs` (likely at root, standard Vite + React setup)

- ESLint 9.39.1
- React Hooks plugin
- React Refresh plugin
- Global variables configuration

---

## Storage & State

### Client-Side State

| Layer | Technology | Scope |
|-------|-----------|-------|
| **Transient UI state** | React `useState`, `useRef` | Active day view, expanded cards, view mode |
| **Session persistence** | `localStorage` (sharded by month) | Answers, streaks, flagged, custom questions, drafts, lifetime stats |
| **History navigation** | HTML5 History API | View routing (today/history/flagged/digest) |

### Vault Integration

**Path:** `~/Desktop/obsidian-workspace/vault/Ethos/`

**Files:**
- `Questions.md` — Question library (H2 = category, one per line)
- `Journal.md` — Answer log (H2 = date, newest first, blockquotes for answers)

**Access:** Tauri fs plugin (`readTextFile`, `writeTextFile`, `exists`, `mkdir`)

**Sync flow:**
1. Startup: Check vault availability → Load `Questions.md` into state
2. Save: Write to localStorage (instant) + append to `Journal.md` (fire-and-forget, fire-and-forget)
3. Add question: Write to both localStorage cache + vault `Questions.md`
4. One-time migration: Export localStorage to vault (when vault first becomes available)

---

## Platform Requirements

### Development Environment

- **OS:** macOS (native window via Tauri webview)
- **Node.js:** ≥18 recommended (for modern ES2020+ features, async/await)
- **Rust:** Required for `tauri-build` (installed via Tauri CLI or rustup)
- **Tauri CLI:** Installed via npm (`@tauri-apps/cli`)

### Runtime (Production)

- **OS:** macOS 10.13+ (Tauri v2 baseline)
- **No external runtime:** App is self-contained executable
- **No network:** Fully offline-capable
- **Filesystem:** Requires read/write access to `~/Desktop/obsidian-workspace/vault/Ethos/`

---

## Build Artifacts

### Development

- **Frontend:** Vite dev server at `localhost:5173` (hot reload via Fast Refresh)
- **Desktop:** Native macOS window (Tauri debug build)

### Production

- **Frontend:** Minified & bundled in `dist/` directory
- **Desktop:**
  - `.app` folder (executable bundle)
  - `.dmg` file (installer disk image)
  - Both placed in `src-tauri/target/release/bundle/macos/`

---

## Key Patterns & Conventions

### No TypeScript

- All code is JavaScript/JSX
- Type definitions installed (`@types/react`, `@types/react-dom`) for IDE support only
- **Convention:** Component props documented in comments or inferred from usage

### No External APIs or Databases

- No backend services
- No authentication
- No analytics
- All data is local (localStorage + vault files)

### Deterministic Question Selection

- `src/utils/questionSelector.js` uses seeded PRNG (Mulberry32)
- Seeded by date key → same 10 questions appear every day
- Fatigue weighting: never-seen (weight 100) vs. recently-seen (weight = days since answered)

### Markdown-First Vault Format

- `Questions.md` and `Journal.md` are human-readable Markdown
- Designed for Obsidian (could be edited manually)
- Parsing is simple line-based (not AST-based)

### Fallback-First Architecture

- `FALLBACK_QUESTIONS` embedded in `src/data/questions.js` (~40 per category)
- When vault unavailable, app works entirely offline
- Vault is an enhancement, not a requirement

---

## npm Scripts

```bash
npm run dev              # Vite dev server (localhost:5173)
npm run build            # Vite build (→ dist/)
npm run preview          # Preview built bundle
npm run lint             # ESLint
npm run tauri            # Tauri CLI shorthand
npm run tauri:dev        # Full desktop app in dev mode
npm run tauri:build      # Build production .app/.dmg
```

---

## Dependencies Summary

**Total dependencies:** 4 production, 11 development

**Production breakdown:**
- React ecosystem: 2 packages
- Tauri ecosystem: 2 packages (API + fs plugin)
- Typography: 1 package (Inter font)

**Development breakdown:**
- Vite + plugins: 3 packages
- Tailwind + Vite: 2 packages
- ESLint + plugins: 4 packages
- React types + other: 3 packages
- Tauri CLI: 1 package

**Note:** No database, HTTP client, state management library, or UI component library. Deliberately minimal.

---

## Security & Privacy

- No API keys or secrets in code
- No `.env` files checked in
- Filesystem access scoped to single vault directory
- No network access
- All data is local and user-owned

---

## Notes

- **Naming:** Project renamed from "Daily 10" to "Ethos" (kept in vault path as `Ethos/`)
- **Version:** 0.1.0 (pre-release)
- **No tests:** Test suite not yet implemented
- **No CI/CD:** Build and publish manually
