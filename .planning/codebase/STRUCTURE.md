# Ethos — Codebase Structure Document

**Analysis Date:** 2026-02-25
**Project Root:** `/Users/keithobrien/Desktop/Claude/Projects/ethos`

---

## Directory Tree

```
ethos/
├── src/                               # React frontend source
│   ├── main.jsx                       # React entry point (createRoot)
│   ├── App.jsx                        # Root component & orchestrator
│   ├── components/                    # Presentational components
│   │   ├── QuestionCard.jsx           # Single expandable question card
│   │   ├── ProgressBar.jsx            # Daily progress + stats bars
│   │   ├── ExportButton.jsx           # "Copy All" to clipboard
│   │   ├── HistoryView.jsx            # Browse past days
│   │   ├── FlaggedView.jsx            # Answers marked for content
│   │   ├── WeeklyDigest.jsx           # Weekly summary
│   │   └── AddQuestion.jsx            # Modal to add custom questions
│   ├── utils/                         # Stateless utility modules
│   │   ├── storage.js                 # localStorage CRUD + migrations
│   │   ├── vaultSync.js               # Vault I/O (read/write markdown)
│   │   ├── questionSelector.js        # PRNG + fatigue-weighted selection
│   │   └── dateUtils.js               # Date formatting & calculations
│   ├── data/                          # Data constants
│   │   └── questions.js               # CATEGORIES + FALLBACK_QUESTIONS
│   ├── styles/                        # Global stylesheets
│   │   └── index.css                  # Tailwind imports + custom palette
│   └── (not committed) main.jsx above imports './styles/index.css'
│
├── src-tauri/                         # Tauri desktop shell (Rust)
│   ├── src/
│   │   ├── main.rs                    # Executable entry point
│   │   └── lib.rs                     # Tauri builder & config
│   ├── tauri.conf.json                # Window size, app metadata
│   ├── capabilities/
│   │   └── default.json               # Scoped FS permissions
│   ├── Cargo.toml                     # Rust dependencies
│   └── build.rs                       # Build script (if needed)
│
├── .planning/                         # Documentation (not in version control)
│   └── codebase/
│       ├── ARCHITECTURE.md            # System design & patterns
│       └── STRUCTURE.md               # This file
│
├── CLAUDE.md                          # Project instructions
├── package.json                       # npm dependencies
├── package-lock.json                  # npm lock file
├── vite.config.js                     # Vite build config
├── eslint.config.js                   # ESLint rules
├── README.md                          # Project overview
├── index.html                         # HTML template
├── public/                            # Static assets (favicons, etc.)
└── .gitignore                         # Exclude dependencies, build artifacts
```

---

## Directory Purposes

### `src/` — React Frontend Source

**Purpose:** All JavaScript/JSX code for the user interface.

**Responsibility:**
- Render UI components
- Manage state (App.jsx)
- Handle user interactions (clicks, keyboard, form input)
- Call utility functions for business logic

**Organization:**
- **Root level:** Entry point (`main.jsx`) and orchestrator (`App.jsx`)
- **components/** — Pure presentational & view-specific logic (export, routing, layout)
- **utils/** — Reusable, stateless business logic (storage, date, selection)
- **data/** — Constants (categories, fallback data)
- **styles/** — Global CSS (Tailwind + custom palette)

### `src/components/` — React Components

**Purpose:** Encapsulate UI logic, rendering, and local state.

**Pattern:** Each file = one component (PascalCase export).

| File | Exports | Role |
|------|---------|------|
| `QuestionCard.jsx` | `QuestionCard` (forwardRef, memo) | Card UI with expand/collapse, textarea, flag, word count |
| `ProgressBar.jsx` | `ProgressBar` | Daily progress bar + category depth bars + streak |
| `ExportButton.jsx` | `ExportButton` | Button: copy daily answers as markdown to clipboard |
| `HistoryView.jsx` | `HistoryView` | Overlay: list all past dates with answer counts |
| `FlaggedView.jsx` | `FlaggedView` | Overlay: show flagged answers grouped by date |
| `WeeklyDigest.jsx` | `WeeklyDigest` | Overlay: show current week's answers grouped by category |
| `AddQuestion.jsx` | `AddQuestion` | Modal: form to add custom question to vault + localStorage |

**Conventions:**
- Components accept props and callback functions (`onSave`, `onClose`, `onToggle`)
- No direct vault I/O (handled in utils)
- Overlay views receive `onClose` to signal back to App

### `src/utils/` — Utility Modules

**Purpose:** Stateless business logic & I/O, separated from rendering.

**Convention:** Export named functions, no classes.

| File | Key Exports | Responsibility |
|------|-------------|-----------------|
| `storage.js` | `getAnswers()`, `saveAnswer()`, `getStreak()`, `getAnsweredQuestions()`, `markQuestionAnswered()`, `getDraft()`, `saveDraft()`, `clearDraft()`, `getFlagged()`, `toggleFlagged()`, `getCustomQuestions()`, `addCustomQuestion()`, `getLifetimeStats()`, `migrateStorage()`, `migrateAnsweredQuestions()`, `migrateLifetimeStats()` | localStorage CRUD, data migrations, safety wrappers |
| `vaultSync.js` | `checkVaultAvailable()`, `loadQuestionsFromVault()`, `saveQuestionToVault()`, `appendAnswersToJournal()`, `runMigration()` | Read/write vault markdown files, check FS availability |
| `questionSelector.js` | `selectDailyQuestions()`, `markDailyQuestionsAnswered()`, `getAllQuestionsForCategory()` | Seeded PRNG, fatigue-weighted selection, answered tracking |
| `dateUtils.js` | `getTodayKey()`, `formatDisplayDate()`, `getDayOfYear()`, `getWeekDates()`, `isSunday()` | Date formatting, calculations (no third-party lib) |

**Patterns:**
- Pure functions (no side effects except I/O)
- Defensive: try-catch wrappers, null checks
- Exports are the public API; internal helpers are private

### `src/data/` — Constants

**Purpose:** Centralize fixed data and configuration.

| File | Exports |
|------|---------|
| `questions.js` | `CATEGORIES` (array of 10 category definitions), `FALLBACK_QUESTIONS` (map of category → array of ~40 questions) |

**Usage:**
- `CATEGORIES` defines the 10 question categories with metadata (id, name, color)
- `FALLBACK_QUESTIONS` is the built-in question library when vault is unavailable
- Updated infrequently (new categories or fallback questions)

### `src/styles/` — Global CSS

**Purpose:** Tailwind setup, custom variables, dark mode config.

| File | Content |
|------|---------|
| `index.css` | `@tailwind` imports, `:root` CSS vars (warm color palette), `.dark` mode rules, custom scrollbar/animation |

**Convention:**
- Tailwind 4 via `@tailwindcss/vite` plugin
- Custom palette: warm-{50,100,...,900} (beige/stone colors)
- Dark mode toggled by `.dark` class on `<html>`

### `src-tauri/` — Tauri Desktop Shell

**Purpose:** Rust backend for native macOS window, filesystem access.

| File | Role |
|------|------|
| `src/main.rs` | Executable entry point. Calls `lib.rs::run()` and sets Windows subsystem. |
| `src/lib.rs` | Tauri builder. Initializes FS plugin, generates context, runs app. |
| `tauri.conf.json` | Window config: title, size (480×800px), min size (380×600px), build/dev URLs, app metadata |
| `capabilities/default.json` | FS permissions: scoped to `$HOME/Desktop/obsidian-workspace/vault/Ethos/**` |
| `Cargo.toml` | Rust dependencies (tauri, tauri_plugin_fs, etc.) |
| `build.rs` | Optional build script (currently minimal) |

**Permission Model:**
- FS plugin is initialized (scoped)
- Capabilities JSON defines allowed paths: `$HOME/Desktop/obsidian-workspace/vault/Ethos` and subdirs
- Frontend cannot access arbitrary filesystem; only Ethos vault directory

---

## File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| React component | PascalCase, `.jsx` | `QuestionCard.jsx`, `HistoryView.jsx` |
| Utility module | camelCase, `.js` | `questionSelector.js`, `dateUtils.js` |
| Data/config | lowercase or camelCase, `.js` | `questions.js` |
| Styles | `index.css` | `src/styles/index.css` |
| Tauri Rust | snake_case, `.rs` | `main.rs`, `lib.rs` |
| Config | snake_case, `.json` or `.toml` | `tauri.conf.json`, `Cargo.toml` |

---

## Module Dependencies (Dependency Graph)

```
App.jsx
├── storage.js (getAnswers, saveAnswer, updateStreak, etc.)
├── questionSelector.js (selectDailyQuestions, markDailyQuestionsAnswered)
├── dateUtils.js (getTodayKey, formatDisplayDate, etc.)
├── vaultSync.js (loadQuestionsFromVault, appendAnswersToJournal, checkVaultAvailable)
├── QuestionCard.jsx
│   └── storage.js (isFlagged, toggleFlagged, getDraft, saveDraft, clearDraft)
├── ProgressBar.jsx
│   └── storage.js (getStreak, getLifetimeStats)
├── ExportButton.jsx
│   └── storage.js (getAnswerText)
├── HistoryView.jsx
│   ├── storage.js (getAllAnswerDates, getAnswers, getAnswerText)
│   └── dateUtils.js (formatDisplayDate, getTodayKey)
├── FlaggedView.jsx
│   ├── storage.js (getFlagged, getAnswers, getAnswerText, toggleFlagged)
│   ├── questionSelector.js (selectDailyQuestions)
│   └── data/questions.js (CATEGORIES)
├── WeeklyDigest.jsx
│   ├── dateUtils.js (getWeekDates, getTodayKey, formatDisplayDate)
│   ├── storage.js (getAnswers, getAnswerText)
│   ├── questionSelector.js (selectDailyQuestions)
│   └── data/questions.js (CATEGORIES)
└── AddQuestion.jsx
    ├── data/questions.js (CATEGORIES)
    ├── storage.js (addCustomQuestion)
    └── vaultSync.js (saveQuestionToVault)

questionSelector.js
├── data/questions.js (CATEGORIES, FALLBACK_QUESTIONS)
├── dateUtils.js (getDayOfYear)
└── storage.js (getCustomQuestions, getAnsweredQuestions, markQuestionAnswered)

vaultSync.js
├── data/questions.js (CATEGORIES, FALLBACK_QUESTIONS)
└── storage.js (getCustomQuestions, getAllAnswerDates, getAnswers, getAnswerText)

storage.js
└── (no dependencies on other modules; localStorage only)

dateUtils.js
└── (no dependencies; pure date logic)
```

---

## Where to Add New Code

### Adding a New UI View

1. **Create component:** `src/components/MyView.jsx`
   - Accept `onClose` callback
   - Render as a full-screen overlay (`fixed inset-0 z-40`)
   - Import utilities as needed

2. **Wire in App.jsx:**
   - Add `'myview'` to `activeView` state enum (via type/convention)
   - Add button in footer to `navigateTo('myview')`
   - Add conditional render: `{activeView === 'myview' && <MyView onClose={() => navigateTo('today')} />}`
   - Add `<div style={{ display: activeView === 'myview' ? 'block' : 'none' }}>` wrapper if needed

3. **Use utilities:**
   - Import from `utils/{storage,dateUtils,questionSelector}.js`
   - Call as-is; no setup required

### Adding a New Utility Function

1. **Add to appropriate module:**
   - `storage.js` — localStorage-related (answers, drafts, metadata)
   - `vaultSync.js` — vault read/write operations
   - `questionSelector.js` — question selection logic
   - `dateUtils.js` — date calculations

2. **Export named function:**
   ```javascript
   export function myNewFunction(params) {
     // implementation
   }
   ```

3. **Call from components via `import { myNewFunction } from '../utils/...'`**

### Adding a New Question Category

1. **Update `src/data/questions.js`:**
   ```javascript
   export const CATEGORIES = [
     // ... existing ...
     { id: 'newcat', name: 'New Category', color: '#...' },
   ];

   export const FALLBACK_QUESTIONS = {
     // ... existing ...
     newcat: [
       'Question 1?',
       'Question 2?',
       // ... ~40 questions
     ],
   };
   ```

2. **Update vault Questions.md:** Add new category section with questions

3. **Components automatically pick it up** (map over CATEGORIES in ProgressBar, WeeklyDigest, AddQuestion)

### Adding a New Data Migration

1. **Create function in `src/utils/storage.js`:**
   ```javascript
   export function migrateXXX() {
     const old = safeGet('old_key', null);
     if (!old) return; // Already migrated or no data

     // Transform & write to new key
     const transformed = {};
     // ... transformation ...
     safeSet('new_key', transformed);
     // ... optionally remove old key ...
   }
   ```

2. **Call from App.jsx useEffect (mount):**
   ```javascript
   useEffect(() => {
     migrateStorage();
     migrateAnsweredQuestions();
     migrateLifetimeStats();
     migrateXXX(); // Add here
   }, []);
   ```

### Adding Vault I/O

1. **Implement in `src/utils/vaultSync.js`:**
   ```javascript
   export async function readVaultFile(filename) {
     const path = await join(await getVaultPath(), filename);
     return await readTextFile(path);
   }

   export async function writeVaultFile(filename, content) {
     await ensureVaultDir();
     const path = await join(await getVaultPath(), filename);
     await writeTextFile(path, content);
   }
   ```

2. **Call from App/components:**
   ```javascript
   const content = await readVaultFile('MyFile.md');
   ```

3. **Handle errors:**
   - Use try-catch
   - Set `vaultAvailable = false` on failure
   - Show amber badge in header

---

## Code Organization Checklist

When adding code, follow this checklist:

- [ ] **Component files** are PascalCase, live in `src/components/`
- [ ] **Utility files** are camelCase, exported as named functions, live in `src/utils/`
- [ ] **No I/O in components** — delegate to `vaultSync.js` or `storage.js`
- [ ] **Imports use absolute paths** from project root: `import { X } from '../utils/Y'`
- [ ] **localStorage calls go through `safeGet`/`safeSet`** for error handling
- [ ] **Async Tauri FS calls use try-catch** and set `vaultAvailable = false` on error
- [ ] **Components accept callbacks** (`onClose`, `onSave`, etc.) instead of navigating directly
- [ ] **Styling uses Tailwind classes** and custom palette (warm-*), dark mode via `.dark` class
- [ ] **No JSX in utils** — utils are pure JS, export stateless functions

---

## Build & Dev Workflow

### Development

```bash
npm run dev              # Vite dev server (localhost:5173)
npm run tauri:dev       # Full Tauri dev (opens native window + Vite)
```

- Frontend code changes → HMR refresh
- Rust changes → recompile required

### Production

```bash
npm run build           # Frontend build (dist/)
npm run tauri:build     # Full Tauri build (.dmg, .app, etc.)
```

- Outputs to `dist/` (frontend) and `src-tauri/target/` (Tauri)

### Linting

```bash
npm run lint            # ESLint check
```

---

## Key Files by Purpose

### If you need to...

| Task | File(s) |
|------|---------|
| Add a component | `src/components/NewComponent.jsx` |
| Add a utility function | `src/utils/{storage,vaultSync,questionSelector,dateUtils}.js` |
| Change app colors/theme | `src/styles/index.css` + `src/data/questions.js` (category colors) |
| Update questions | `src/data/questions.js` (fallback) + vault `Questions.md` |
| Add new localStorage key | `src/utils/storage.js` → `STORAGE_KEYS` |
| Change window size | `src-tauri/tauri.conf.json` |
| Restrict FS permissions | `src-tauri/capabilities/default.json` |
| Add vault I/O | `src/utils/vaultSync.js` |
| Manage dates/streaks | `src/utils/dateUtils.js` + `storage.js` |
| Change question selection logic | `src/utils/questionSelector.js` |

---

## Notes on File Stability

**Unlikely to change:**
- `src/main.jsx` — React mount point
- `src-tauri/src/main.rs` — Tauri entry
- `src/data/questions.js` — Categories fixed; fallback questions grow
- `src/utils/dateUtils.js` — Date logic is mature

**Likely to grow:**
- `src/components/` — New views (analytics, settings, etc.)
- `src/utils/storage.js` — New localStorage keys, migrations
- `src/utils/vaultSync.js` — New vault file types

**Frequently edited:**
- `src/App.jsx` — State, routing, interactions
- `CLAUDE.md` — Project instructions

---

**Document Version:** 1.0
**Last Updated:** 2026-02-25
