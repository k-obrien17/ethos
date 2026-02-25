# Ethos — Architecture Document

**Analysis Date:** 2026-02-25
**Project:** Native macOS journaling app (Daily 10, renamed to Ethos)
**Tech Stack:** React 19 + Vite 7 + Tauri v2 + Tailwind CSS 4

---

## Pattern Overview

Ethos is a **lightweight, file-based journaling application** with the following pattern:

- **Frontend-driven:** React handles all UI, state, and user interactions
- **Desktop-native:** Tauri v2 wraps the React app in a native macOS window with filesystem access
- **Hybrid persistence:** localStorage (fast cache) + Obsidian vault (canonical source of truth)
- **Deterministic question selection:** Seeded PRNG ensures the same 10 questions appear each day, with recency-weighted fatigue to avoid repeat questions
- **Zero backend:** No API, no database, no auth—purely local

---

## Layered Architecture

```
┌─────────────────────────────────────────┐
│     UI Layer (React Components)         │
│  ├─ App.jsx (orchestrator)              │
│  ├─ QuestionCard, ProgressBar, etc.     │
│  └─ Secondary views (overlay routing)   │
├─────────────────────────────────────────┤
│     State & Logic Layer                 │
│  ├─ storage.js (localStorage CRUD)      │
│  ├─ questionSelector.js (PRNG + fatigue)│
│  ├─ dateUtils.js (date helpers)         │
│  └─ vaultSync.js (vault I/O)            │
├─────────────────────────────────────────┤
│     Data Layer                          │
│  ├─ localStorage (answers, drafts, meta)│
│  └─ Vault filesystem (Questions.md,     │
│     Journal.md)                         │
├─────────────────────────────────────────┤
│     Desktop Runtime (Tauri)             │
│  ├─ src-tauri/src/lib.rs (init)         │
│  ├─ src-tauri/src/main.rs (entry)       │
│  └─ FS plugin (scoped to ~/Desktop/...) │
└─────────────────────────────────────────┘
```

---

## Entry Points

### JavaScript/React Entry Point

**File:** `src/main.jsx`

```javascript
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- Mounts React to the DOM
- Imports fonts (Inter) and global styles
- App is the top-level orchestrator

### Tauri Native Entry Point

**Files:**
- `src-tauri/src/main.rs` — Rust executable entry point (delegates to lib.rs)
- `src-tauri/src/lib.rs` — Tauri builder configuration

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**Launch sequence:**
1. Tauri window manager spawns 480×800px macOS window
2. Vite dev server or bundled frontend loads into webview
3. Tauri FS plugin initializes with scoped capabilities
4. React App mounts and calls `checkVaultAvailable()` to initialize vault access

---

## Data Flow

### 1. Daily Question Selection

```
getTodayKey() [date string: YYYY-MM-DD]
  ↓
selectDailyQuestions(dateKey, questionsMap?)
  ├─ Compute seeded RNG seed from date
  ├─ For each of 10 categories:
  │   ├─ Fetch base questions from vault or FALLBACK_QUESTIONS
  │   ├─ Merge custom questions from localStorage
  │   ├─ Compute recency weight for each question
  │   ├─ Weighted random selection (never-seen: 100, seen: days since (1–100))
  │   └─ Return { category, question, questionIndex }
  └─ Return array of 10 questions
  ↓
App.tsx → setQuestions() → render QuestionCard list
```

**Key:** The seeded RNG ensures deterministic selection—same date always yields same questions.

### 2. Answer Saving

```
User edits textarea in QuestionCard
  ↓
debounceSaveDraft() [300ms debounce]
  ├─ Save draft to localStorage (fast)
  └─ (optional) restore on app reopen

User clicks "Save" button
  ↓
handleSave(index, text) in App.jsx
  ├─ Call saveAnswer() → write to localStorage[`ethos_answers_YYYY-MM`][dateKey][index]
  ├─ Update answersRef state
  ├─ Call markDailyQuestionsAnswered() → track question recency for fatigue
  ├─ Update streak if all 10 answered
  ├─ Fire-and-forget: appendAnswersToJournal() → vault write (no blocking)
  └─ Auto-advance to next unanswered question
```

**Pattern:** localStorage is synchronous (instant save), vault write is async and non-blocking (fire-and-forget with error handling).

### 3. Vault Sync (Startup)

```
App.jsx useEffect on mount
  ↓
checkVaultAvailable()
  ├─ Attempt ensureVaultDir()
  └─ Return true if ~/Desktop/obsidian-workspace/vault/Ethos exists

If vault available:
  ├─ Check localStorage.getItem('ethos_vault_migrated')
  ├─ If not set: runMigration() → export all localStorage answers to Journal.md
  ├─ Load Questions.md from vault → parse markdown → setQuestionsMap()
  └─ Subsequent question selections use vault data instead of fallback
```

**Flow ensures:** Vault becomes canonical after first sync; localStorage is cache.

### 4. Vault Write (Ongoing)

```
Answer saved (handleSave) → appendAnswersToJournal(dateKey, questions, answersMap)
  ├─ Read existing Journal.md
  ├─ Check if dateKey entry exists
  │   ├─ If yes: replace in-place (preserves entry order)
  │   └─ If no: prepend (newest first)
  ├─ Format: ## ${dateKey} \n **Category** \n Question \n > Answer
  └─ Write back to Journal.md
```

---

## Key Abstractions

### 1. Seeded PRNG for Question Selection

**File:** `src/utils/questionSelector.js`

```javascript
function mulberry32(seed) { /* 32-bit hash PRNG */ }
function dateSeed(dateKey) { return year * 1000 + dayOfYear; }
```

- Ensures same date → same seed → same 10 questions every year
- Makes selection reproducible and deterministic
- No server state needed; client can predict its own questions

### 2. Recency-Weighted Fatigue

**In `selectDailyQuestions()`:**

```javascript
const weights = questions.map((q, i) => {
  const lastDate = answeredQuestions[categoryId][i];
  return !lastDate ? 100 : Math.max(1, Math.min(100, daysBetween(lastDate, dateKey)));
});
// Weighted random selection → never-seen questions prioritized
```

Prevents question monotony: unanswered questions have weight 100, answered questions get weight = days since answer.

### 3. localStorage Sharding by Month

**File:** `src/utils/storage.js`

```javascript
const monthKey = dateKey.slice(0, 7); // "2026-02"
const storageKey = `ethos_answers_${monthKey}`;
const answers = { [dateKey]: { [index]: { answer, question, categoryId, wordCount } } };
```

Avoids one giant blob (localStorage quota); answers grouped per month.

### 4. Markdown Parsing for Questions & Journal

**File:** `src/utils/vaultSync.js`

**Questions.md format:**
```markdown
## business
What's a business model...?
What's the dumbest...?

## leadership
What's the first thing...?
```

**Journal.md format:**
```markdown
## 2026-02-25

**Business & Strategy**
What's a business model...?
> User answer here can be multiline

**Leadership & Management**
What's the first thing...?
> Another answer
```

Parsing is simple regex + split (no external markdown lib); formatting is manual string join.

### 5. Draft Persistence

**File:** `src/utils/storage.js`

```javascript
const DRAFTS_KEY = 'ethos_drafts'; // { "${dateKey}:${index}": "text" }
```

- Debounced save (300ms) as user types
- Restored on App mount
- Cleared when user clicks "Save"

Protects against accidental loss of in-progress text.

---

## Component Architecture

### Presentational Layer

- **QuestionCard** — Single card with expand/collapse, textarea, word count, flag button, draft restore
- **ProgressBar** — Today progress (x/10), streak, category depth bars
- **ExportButton** — "Copy All" to clipboard (markdown)
- **HistoryView** — List of all past dates with answer counts
- **FlaggedView** — All flagged answers grouped by date, with unflag
- **WeeklyDigest** — Current week answers grouped by category
- **AddQuestion** — Modal to add custom questions

### Orchestrator

- **App.jsx** — Singleton state machine for:
  - dateKey (today or browsing)
  - questions (10 daily questions)
  - answers (saved answers map)
  - expandedIndex (which card is open)
  - activeView ('today' | 'history' | 'flagged' | 'digest')
  - vaultAvailable, vaultSyncOk (status)
  - darkMode (toggle)

### State Management Pattern

No Redux/MobX—useState at App level with callback props. Refs (`questionsMapRef`, `answersRef`, etc.) cache current state for closures.

---

## Cross-Cutting Concerns

### Dark Mode

**Implementation:**

```javascript
useEffect(() => {
  document.documentElement.classList.toggle('dark', darkMode);
  localStorage.setItem('ethos_dark', String(darkMode));
}, [darkMode]);
```

Toggle stored in `ethos_dark`; applied as `.dark` class to `<html>` for Tailwind dark mode.

### View Routing (SPA)

**Pattern:**

```javascript
function navigateTo(view) {
  setActiveView(view);
  history.pushState({ view }, '', `#${view}`);
}

useEffect(() => {
  window.addEventListener('popstate', (e) => setActiveView(e.state?.view || 'today'));
}, []);
```

History API for back/forward; today view always mounted (hidden), secondary views render as `fixed inset-0 z-40` overlays to preserve state.

### Keyboard Navigation

**In App.jsx keydown handler:**

| Key | Action |
|-----|--------|
| ArrowDown / j | Next card |
| ArrowUp / k | Previous card |
| Enter | Expand first card (if none expanded) |
| Cmd/Ctrl+Enter | Save current card (in textarea) |
| Escape | Close overlay or collapse card |

Disabled when typing in textarea or overlay is active (active !== 'today').

### Error Handling

**Vault unavailability:**
- `checkVaultAvailable()` catches errors and returns false
- App shows amber "vault offline" badge
- Falls back to FALLBACK_QUESTIONS + localStorage-only mode
- Vault writes are fire-and-forget; failures show "sync failed" badge but don't block

**localStorage failures:**
- `safeGet()` / `safeSet()` wrap try-catch and log console errors
- App continues with null/default fallbacks

**Tauri FS permissions:**
- Scoped to `$HOME/Desktop/obsidian-workspace/vault/Ethos/**`
- Capabilities file (`src-tauri/capabilities/default.json`) restricts read/write/mkdir/exists

---

## Interaction Between Layers

### Question Selection → Answer Saving → Vault Write

```
selectDailyQuestions(dateKey, questionsMap)
  → questions: [{ category, question, questionIndex, originalIndex }, ...]

handleSave(index, text)
  → saveAnswer(dateKey, index, text, question, categoryId) → localStorage write
  → markDailyQuestionsAnswered(questions, answers, dateKey)
  → appendAnswersToJournal() → vault write
```

**Key insight:** `originalIndex` in the question object is used to track fatigue. When saving an answer, we record that the original question index was answered on that dateKey. Next time that date recurs (never in PRNG setup, but for test/manual recalc), the question will have lower weight.

### Custom Question Workflow

```
AddQuestion modal → handleAdd()
  ├─ addCustomQuestion() → localStorage[CUSTOM_QUESTIONS]
  ├─ saveQuestionToVault() → Questions.md append
  └─ reloadFromVault() → reload questionsMap and refresh selected questions
```

Custom questions stored in both vault and localStorage; vault is canonical after first sync.

---

## File Organization

| Layer | Files | Purpose |
|-------|-------|---------|
| **UI** | `src/App.jsx`, `src/main.jsx` | Root orchestrator + React mount |
| **Components** | `src/components/*.jsx` | Presentational + view logic |
| **Data** | `src/data/questions.js` | Categories + fallback questions |
| **Utils** | `src/utils/{storage,vaultSync,questionSelector,dateUtils}.js` | Stateless helpers |
| **Styles** | `src/styles/index.css` | Tailwind imports + custom vars |
| **Desktop** | `src-tauri/{lib.rs,main.rs,tauri.conf.json,capabilities/default.json}` | Tauri setup |

---

## Startup Sequence (Detailed)

1. **Tauri boots** → `main.rs` calls `lib.rs::run()`
2. **Tauri window spawns** → loads `http://localhost:5173` (dev) or `dist/index.html` (prod)
3. **React mounts** → `main.jsx` → `App.jsx`
4. **Migrations run** → `migrateStorage()`, `migrateAnsweredQuestions()`, `migrateLifetimeStats()`
5. **Vault init** → `checkVaultAvailable()` → `runMigration()` if not already done
6. **Load questions** → `loadQuestionsFromVault()` → `setQuestionsMap()`
7. **Select daily questions** → `selectDailyQuestions(todayKey, questionsMap)`
8. **Load today's answers** → `getAnswers(todayKey)` from localStorage
9. **Render UI** → question cards with saved/draft/empty states

---

## Testing & Verification Points

### Determinism
- Same dateKey always selects same 10 questions (verify PRNG seed)
- Custom questions don't break selection order (verify allQuestions merge)

### Persistence
- Answers saved to localStorage month-shard
- Vault Journal.md reflects saved answers
- Draft saves on 300ms debounce, clears on explicit save

### Fatigue
- Never-seen questions chosen first
- Previously answered questions have weight = days since
- Weight clamped to [1, 100]

### Vault Fallback
- App works offline (vault unavailable)
- Badge shows "vault offline"
- Vault write failures don't break app

---

## Future Extensibility

**Patterns in place for:**
- Adding new view types (add to `activeView` enum + render as overlay)
- Adding new questions (custom question modal already supports this)
- Adding statistics (ProgressBar already computes lifetime stats)
- Adding export formats (ExportButton shows markdown; could add JSON, CSV)
- Syncing to cloud (vaultSync already separates I/O; could add HTTP layer)

---

## Dependencies Summary

| Package | Purpose | Notes |
|---------|---------|-------|
| React 19 | UI rendering | JSX, hooks, forwardRef |
| Vite 7 | Build tool | HMR in dev, code splitting in prod |
| Tauri v2 | Desktop shell | FS plugin for vault access |
| Tailwind CSS 4 | Styling | Warm palette, dark mode |
| @fontsource/inter | Font | Inter 400/500/600/700 weights |

**No external dependencies for:**
- State management (useState only)
- Form handling (controlled inputs)
- Date manipulation (manual Date API)
- Markdown parsing (simple regex)
- PRNG (custom mulberry32)

---

**Document Version:** 1.0
**Last Updated:** 2026-02-25
