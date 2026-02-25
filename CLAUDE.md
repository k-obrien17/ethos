# CLAUDE.md — Daily 10

## What This Is

Native macOS journaling app. Each day presents 10 questions (one per category) drawn from a pool of ~400. You answer in short free-text. Answers persist in localStorage (fast cache) with Obsidian vault as canonical source of truth. Designed for Keith's daily thought-capture habit.

## Stack

- **Frontend:** React 19, Vite 7, Tailwind CSS 4 (via `@tailwindcss/vite`)
- **Desktop:** Tauri v2 (Rust backend, fs plugin for vault access)
- **Language:** JavaScript (JSX), no TypeScript
- **State:** Obsidian vault (canonical) + localStorage (cache), no backend/database
- **Package manager:** npm

## Project Structure

```
src/
  App.jsx              — Main app: vault init, async question loading, answer saving (localStorage + vault), keyboard navigation
  main.jsx             — React entry point
  data/
    questions.js       — CATEGORIES array (10 categories) + FALLBACK_QUESTIONS map (~40 per category, used when vault unavailable)
  components/
    QuestionCard.jsx   — Expandable card with textarea, flag button, word count, draft persistence (forwardRef)
    ProgressBar.jsx    — x/10 today + total answers, today progress bar, 10 category depth bars, streak (secondary)
    ExportButton.jsx   — "Copy All" → markdown to clipboard
    HistoryView.jsx    — List of past days with answer counts
    FlaggedView.jsx    — Answers marked for content development
    WeeklyDigest.jsx   — Current week's answers grouped by category
    AddQuestion.jsx    — Modal to add custom questions (writes to vault + localStorage)
  utils/
    dateUtils.js       — Date keys (YYYY-MM-DD), display formatting, week math
    questionSelector.js — Seeded PRNG (mulberry32) picks 1 question per category per day, recency-weighted fatigue. Accepts questionsMap param.
    storage.js         — localStorage CRUD: answers (per-month sharding), streaks, flagged, custom questions, drafts, answered-question tracking, lifetime stats
    vaultSync.js       — Vault I/O: read/write Questions.md and Journal.md, markdown parsing, one-time migration from localStorage
  styles/
    index.css          — Tailwind import + warm color palette + dark mode + scrollbar/animation
src-tauri/
  tauri.conf.json      — Window: 480×800, min 380×600
  src/lib.rs           — Tauri builder with fs plugin
  capabilities/
    default.json       — fs permissions scoped to ~/Desktop/obsidian-workspace/vault/Daily 10/
```

## Vault Integration

- **Vault path:** `~/Desktop/obsidian-workspace/vault/Daily 10/`
- **Questions.md:** Question library. H2 = category ID, one question per line. Editable in Obsidian.
- **Journal.md:** All answers, newest first. H2 = date, bold = category name, plain = question, blockquote = answer, `---` between days.
- **Startup flow:** Check vault availability → run one-time migration (if `daily10_vault_migrated` not set) → load Questions.md → select daily questions.
- **Save flow:** localStorage write (instant) + vault Journal.md write (fire-and-forget).
- **Add question flow:** localStorage write + vault Questions.md append → reload questionsMap from vault.
- **Fallback:** If vault unavailable, app uses FALLBACK_QUESTIONS from questions.js and localStorage-only mode. Amber "vault offline" indicator in header.

## Key Patterns

- **Question selection:** Seeded PRNG using date → deterministic 10 questions per day. Recency-weighted fatigue: never-seen questions get weight 100, previously-seen get weight = days since last answered (clamped 1–100). Answered-questions stored as `{ catId: { questionIndex: dateKey } }`.
- **Vault as source of truth:** When vault is available, Questions.md is the question library. Custom questions added via the app go to both vault and localStorage. When vault loads questions, localStorage custom questions are not merged (they should already be in Questions.md).
- **Answer format:** `{ answer, question, categoryId, wordCount }` — migrated from legacy plain-string format.
- **Storage sharding:** Answers stored per month (`daily10_answers_2026-02`) to avoid one giant localStorage blob.
- **Draft persistence:** In-progress text saved to `daily10_drafts` localStorage key (debounced 300ms). Restored on app reopen, cleared on explicit save.
- **View routing:** `activeView` state + `pushState`/`popstate`. Today view is always mounted (hidden via `display:none`); secondary views (History, Flagged, Digest) render as `fixed inset-0 z-40` overlays to preserve today state.
- **Keyboard navigation:** Global keydown handler — Arrow Down/j next card, Arrow Up/k prev, Enter expand first, Escape collapse or close overlay. Cards scroll into view on expansion.
- **Dark mode:** Toggle stored in `daily10_dark`, applied via `.dark` class on `<html>`.

## Commands

```bash
npm run dev           # Vite dev server (localhost:5173)
npm run tauri:dev     # Full Tauri dev (opens native window + Vite)
npm run tauri:build   # Production build (.dmg/.app)
npm run build         # Frontend-only build (dist/)
npm run lint          # ESLint
```

## Design

- Warm stone color palette (`warm-50` through `warm-900`)
- Category colors: blue, purple, green, cyan, amber, red, pink, indigo, orange, lime
- Left border accent on cards (category color)
- Inter font, minimal chrome, mobile-proportioned window

## Notes

- No backend, no API keys, no auth — purely local app
- No TypeScript — keep it JS/JSX
- No tests currently
- Custom questions stored in vault (Questions.md) and localStorage (cache). Vault is canonical when available.
