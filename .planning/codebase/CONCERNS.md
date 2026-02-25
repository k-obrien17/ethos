# Ethos Codebase: Technical Debt & Concerns

**Analysis Date:** 2026-02-25
**Scope:** Ethos (macOS journaling app)
**Stack:** React 19 + Vite 7 + Tauri 2 + Tailwind 4

---

## Executive Summary

Ethos is a solid, purpose-built local journaling app that recently cloned from Daily 10. The codebase prioritizes simplicity and speed over architectural robustness. No critical blockers, but several areas accumulate friction and fragility as the app scales. Immediate concerns: zero test coverage, brittle vault markdown parsing, migration functions that run on every load, and localStorage key management scattered across files.

---

## Tech Debt & Maintenance Burden

### 1. Recently Cloned from "Daily 10" — Rename Artifacts Remain

**Status:** Medium friction
**Files affected:**
- `src/utils/vaultSync.js` line 6: `VAULT_SUBPATH = 'Desktop/obsidian-workspace/vault/Ethos'`
- `src-tauri/tauri.conf.json` line 4: `"identifier": "com.totalemphasis.ethos"`
- `package.json` line 2: `"name": "ethos"`
- `src-tauri/capabilities/default.json` lines 10–11: Hardcoded Ethos path

**Issue:** Codebase was renamed from Daily 10 → Ethos, but comments, variable names, and storage key prefixes still reference old naming conventions:
- localStorage keys use `ethos_` prefix (correct), but some legacy `daily10_` keys may still exist
- CLAUDE.md project notes mention "Daily 10" in places
- Migration functions check for `daily10_vault_migrated` flag (line 61 of App.jsx)

**Impact:** Inconsistent naming makes it harder to understand the app's actual identity. Creates confusion when searching for references. Old migration flags could silently re-run if keys are not cleaned up properly.

**Recommendation:** Audit and clean up any remaining legacy key names. Consider a cleanup migration that explicitly removes all `daily10_*` keys if they exist.

---

### 2. No TypeScript — Pure JavaScript/JSX

**Status:** Low-to-medium friction, architectural debt
**Files affected:** All `.js` and `.jsx` files

**Issue:**
- No compile-time type checking. State shapes, prop types, and API contracts are inferred only at runtime
- Refactoring is error-prone (e.g., changing `question.index` to `question.originalIndex` in `questionSelector.js` requires manual tracing)
- IDE autocomplete is imprecise for complex state objects (answers map format changed mid-development; still has legacy string entries)
- New developers have to read code carefully to understand what `getAnswerText(entry)` expects

**Real-world fragility:**
- `normalizeAnswer()` in `storage.js` handles both string and object formats silently — good defensive programming, but symptom of untyped refactoring
- `selectDailyQuestions()` accepts optional `questionsMap` param; behavior differs when undefined
- `appendAnswersToJournal()` writes to vault with fire-and-forget error handling; failures are silent

**Recommendation:** Not urgent, but consider adding TypeScript incrementally for critical modules (storage.js, questionSelector.js, vaultSync.js). Pure JS is fine for UI components.

---

### 3. Zero Test Coverage

**Status:** High risk for regressions
**Files affected:** Entire codebase

**Issue:**
- No unit tests for question selection algorithm, storage migrations, vault I/O
- No integration tests for save flow (localStorage + vault)
- No end-to-end tests for daily question determinism

**Critical paths without tests:**
- `mulberry32()` PRNG: changing seed logic silently breaks determinism (users will see different questions on same day)
- `selectDailyQuestions()`: fatigue weighting algorithm is fragile; small changes affect question selection
- `runMigration()`: runs on first app load; if it fails silently, data loss or duplication can occur
- Vault markdown parsing (`parseQuestionsMarkdown()`, `parseJournalDates()`): brittle string matching; format changes break silently
- localStorage sharding (`STORAGE_KEYS.ANSWERS_${monthKey}`): month-boundary bugs undetected

**Example risk:** If someone changes `daysBetween()` calculation or the weight formula in `questionSelector.js`, there's no test to catch changed behavior.

**Recommendation:** Start with unit tests for storage.js and questionSelector.js. Add smoke tests for migrations.

---

### 4. Large, Mixed-Concern App.jsx (387 lines)

**Status:** Medium friction
**File:** `src/App.jsx`

**Issue:**
- App.jsx handles:
  - Vault initialization and error states
  - Question/answer state management
  - Multiple navigation views (today, history, flagged, digest)
  - Keyboard navigation (keyboard event handling, ref management)
  - Dark mode toggle
  - Auto-advance logic after saving
  - Ref callbacks for card scrolling
- Multiple useEffects with overlapping concerns (lines 46–77 initialization, 99–102 dark mode, 104–115 day loading, 113–243 keyboard nav)
- Five interconnected refs (`questionsMapRef`, `answersRef`, `dateKeyRef`, `vaultAvailableRef`, `cardRefs`)

**Specific frictions:**
- Adding a new view (e.g., "Search") requires touching the main render and the navigation logic
- Keyboard nav event handler is complex; hard to test or extend
- refs used for closure state instead of relying on React state (intentional performance optimization, but fragile)
- Auto-advance logic mixes business logic with UI updates

**Recommendation:** Extract keyboard nav into a custom hook (`useKeyboardNav`). Extract vault init into a separate hook or context. Keep App.jsx as the orchestrator, but reduce it to ~200 lines.

---

### 5. localStorage Keys as Scattered Strings

**Status:** Low friction currently, but accumulates complexity
**Files affected:** `src/utils/storage.js`, `src/components/QuestionCard.jsx`, `src/App.jsx`

**Issue:**
- `STORAGE_KEYS` object exists in storage.js (good centralization), but not all keys are there:
  - `STORAGE_KEYS` defined (line 1–8 of storage.js): `ANSWERS`, `STREAKS`, `FLAGGED`, `CUSTOM_QUESTIONS`, `ANSWERED_QUESTIONS`, `LIFETIME_STATS`
  - Missing from `STORAGE_KEYS`: `ethos_dark` (line 26, 101 of App.jsx), `ethos_vault_migrated` (line 61 of App.jsx), `ethos_drafts` (line 257 of storage.js)
  - Month-sharded keys built with string interpolation: `${STORAGE_KEYS.ANSWERS}_${monthKey}`
  - Drafts key is `ethos_drafts` (line 257) but not part of STORAGE_KEYS constant

**Impact:**
- Searching for "ethos_" doesn't find all references (drafts, dark mode, migration flag are scattered)
- Renaming a key requires grep + manual updates in multiple files
- New developers don't know where all keys are defined
- If you want to bulk-clear or migrate localStorage, you have to remember all the keys

**Recommendation:**
```javascript
const STORAGE_KEYS = {
  ANSWERS: 'ethos_answers',
  STREAKS: 'ethos_streaks',
  FLAGGED: 'ethos_flagged',
  CUSTOM_QUESTIONS: 'ethos_custom_questions',
  ANSWERED_QUESTIONS: 'ethos_answered_questions',
  LIFETIME_STATS: 'ethos_lifetime',
  DARK_MODE: 'ethos_dark',
  VAULT_MIGRATED: 'ethos_vault_migrated',
  DRAFTS: 'ethos_drafts',
  // Month-sharded: `${STORAGE_KEYS.ANSWERS}_YYYY-MM`
};
```
Update all references. Single source of truth.

---

## Security Considerations

### 1. Tauri FS Permissions: Tightly Scoped (Good)

**Status:** ✓ Secure
**File:** `src-tauri/capabilities/default.json`

**Assessment:**
- FS permissions are scoped to `$HOME/Desktop/obsidian-workspace/vault/Ethos/` and subpaths
- No access to parent directories, home root, or system paths
- Read/write/exists/mkdir separated by capability
- No network access configured (not needed)

**No issues here.** Permissions follow least-privilege principle.

---

### 2. No Auth (Acceptable for Local App)

**Status:** ✓ Acceptable
**Context:** Local-only app, no backend, no user accounts

**Assessment:** No auth layer needed. Data is local and encrypted at the OS level (macOS FileVault).

**Minor note:** localStorage data is not encrypted. If user's machine is compromised, journal data is readable. This is acceptable for a local app but could be noted in documentation.

---

### 3. Vault Markdown Parsing: No Injection Vulnerabilities

**Status:** ✓ Safe (but brittle)
**File:** `src/utils/vaultSync.js` lines 41–105

**Assessment:**
- Parsing is simple string splitting, no evaluation or dynamic code execution
- Answers are rendered as plain text in UI (React escapes by default)
- No user input is eval'd or exec'd

**However:** Parsing is **fragile** (see below), which could lead to data corruption:

---

## Performance Concerns

### 1. localStorage Scanning on Every Page Load

**Status:** Medium concern for larger datasets
**File:** `src/utils/storage.js` lines 84–104 (`getAllAnswerDates()`)

**Issue:**
```javascript
export function getAllAnswerDates() {
  const dates = new Set();
  for (let i = 0; i < localStorage.length; i++) {  // Iterates ALL keys
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_KEYS.ANSWERS + '_')) {
      const monthData = safeGet(key, {});  // JSON.parse on each
      for (const d of Object.keys(monthData)) {  // Iterates all dates in month
        dates.add(d);
      }
    }
  }
  return [...dates].sort().reverse();
}
```

Called by:
- HistoryView (line 357 of App.jsx) — renders all past dates
- runMigration (line 280 of vaultSync.js) — one-time, but could be large
- Any time you open History view

**Performance:** On a user with 5 years of journaling (1,825 days), localStorage has ~20+ keys (per-month shards). Iterating all keys + parsing each month is OK (milliseconds), but not optimal.

**Recommendation:** Cache the result in App state after first load. Or use a dedicated "dates index" localStorage key that's updated incrementally as new answers are saved.

---

### 2. Vault File Writes Are Fire-and-Forget

**Status:** Medium concern for reliability, not performance
**Files:**
- `src/App.jsx` lines 129–133 (handleSave)
- `src/utils/vaultSync.js` lines 186–251 (appendAnswersToJournal)

**Issue:**
```javascript
// From App.jsx handleSave
if (vaultAvailableRef.current) {
  appendAnswersToJournal(dk, questionsRef.current, updated)
    .then(() => setVaultSyncOk(true))
    .catch(() => setVaultSyncOk(false));  // Silent catch; no retry
}
```

- If vault write fails (e.g., permissions, disk full, network timeout if vault syncs to iCloud), user gets an amber "sync failed" indicator
- No retry logic
- No queue of pending writes

**Impact:** If writes fail repeatedly, answers are safe in localStorage but will never sync to vault. User has to manually investigate.

**Recommendation:** Add a simple retry queue. Or add a "retry now" button in the UI when sync fails.

---

## Fragile Areas

### 1. Question Selection Algorithm: Seeded PRNG Determinism

**Status:** Fragile; changes break determinism
**File:** `src/utils/questionSelector.js` lines 9–24, 32–80

**Issue:**
```javascript
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);  // Magic constant
    t = Math.imul(t ^ (t >>> 15), t | 1);
    // ... bitwise operations
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

This is a well-known seeded PRNG. **But:**
- If someone tweaks the magic constant (0x6d2b79f5) or the bit shifts, the sequence changes
- If `dateSeed()` calculation changes, same date now generates different questions
- If fatigue weighting changes (lines 47–57), users see different questions without warning

**Real risk:** If a developer optimizes the selection algorithm and doesn't realize the determinism requirement, users revisit the same questions on the same date after the change. This breaks the expected behavior.

**Recommendation:**
1. Document that this function is deterministic by design and must not change
2. Add a test that verifies `selectDailyQuestions('2026-02-25')` always returns the same 10 questions
3. Consider versioning the algorithm (e.g., `dateSeed_v1`, `mulberry32_v1`) if future changes are planned

---

### 2. Vault Markdown Parsing: Brittle Format Dependency

**Status:** Fragile
**Files:**
- `src/utils/vaultSync.js` lines 41–56 (`parseQuestionsMarkdown`)
- `src/utils/vaultSync.js` lines 98–105 (`parseJournalDates`)
- `src/utils/vaultSync.js` lines 212–238 (date boundary detection in `appendAnswersToJournal`)

**Issue:**
Questions.md format must be:
```
## categoryId
question line 1
question line 2

## nextCategory
...
```

Journal.md format must be:
```
## YYYY-MM-DD

**Category Name**
question text
> answer line 1
> answer line 2
```

**Fragility points:**
1. `parseQuestionsMarkdown()` assumes `## ` (with space) prefix; `##categoryId` breaks silently
2. Blank lines between questions are discarded; no error if format is inconsistent
3. Journal entry detection relies on exact regex `/^## \d{4}-\d{2}-\d{2}\s*$/`; a trailing space or different whitespace breaks parsing
4. Entry boundary detection (lines 212–238) uses multiple heuristics (next `## YYYY-MM-DD`, `---` separator, blank lines) and could misidentify boundaries if format drifts
5. No validation that parsed data is correct; if parsing fails silently, answers could be lost

**Real risk:** User manually edits vault file (common in Obsidian), adds extra blank lines or changes spacing, and answer syncing silently fails.

**Recommendation:**
1. Add a markdown schema validator (even simple) that logs warnings for format violations
2. Add tests that verify parsing survives intentional format variations
3. Consider a simpler format (JSON sidecar files) or add YAML front matter for structure

---

### 3. Migration Functions Run on Every App Load (Should Be One-Time)

**Status:** Medium concern
**Files:**
- `src/App.jsx` lines 45–50 (useEffect with migrations)
- `src/utils/storage.js` lines 116–187 (three migration functions)

**Issue:**
```javascript
useEffect(() => {
  migrateStorage();        // Run every mount
  migrateAnsweredQuestions();
  migrateLifetimeStats();
}, []);  // Empty deps = run once... but behavior depends on localStorage state
```

These are tagged as "one-time migrations" with flags:
- `migrateStorage()`: checks if `STORAGE_KEYS.ANSWERS` (old key) exists
- `migrateAnsweredQuestions()`: checks if any value in `answered` is an Array
- `migrateLifetimeStats()`: checks if `STORAGE_KEYS.LIFETIME_STATS` is null
- `runMigration()` in vaultSync.js: checks if `ethos_vault_migrated` flag exists (line 61 of App.jsx)

**Problem:**
- If a migration flag is deleted, it re-runs
- If a migration partially fails, it could run twice
- No logging; if it silently fails, you don't know it happened

**Recommendation:**
1. Add an explicit migration versioning system: `{ version: 3 }` in localStorage
2. Log migrations on first run: `console.log('Running migration 1: storage format')`
3. Ensure each migration is idempotent (running twice = same result)

---

### 4. Answered Question Tracking: Fatigue Weighting Can Produce Edge Cases

**Status:** Medium concern
**File:** `src/utils/questionSelector.js` lines 45–69

**Issue:**
```javascript
const weights = [];
for (let i = 0; i < totalCount; i++) {
  const lastDate = answeredMap[i];
  if (!lastDate) {
    weights.push(100);  // Never-seen = highest weight
  } else {
    const days = daysBetween(lastDate, dateKey);
    weights.push(Math.max(1, Math.min(100, days)));  // Clamp to [1, 100]
  }
}
```

**Edge cases:**
1. New question added to vault → `daysBetween()` calculates from today, but old questions have answers from months ago. New question gets weight 100 immediately (fair, but could dominate selection if many questions exist)
2. `daysBetween()` uses `Math.round(Math.abs(b - a) / ...)` — if timezone or DST crossing affects the calculation, could get unexpected weights
3. If `answeredMap[i]` is `'2020-01-01'` (from legacy migration), `daysBetween` returns ~2000+ days, clamped to 100. This is correct, but could hide that legacy data was migrated wrong

**Recommendation:** Add an optional parameter to `selectDailyQuestions()` to inspect weights for a given date (e.g., for debugging). Add tests for edge cases (DST, new questions, old data).

---

## Missing Features / Gaps

### 1. No Data Export Beyond Clipboard Copy

**Status:** Low-to-medium priority
**Current:** ExportButton copies today's Q&A to Markdown clipboard

**Gap:**
- No bulk export (all answers across all dates)
- No CSV export for data analysis
- No JSON backup

**Impact:** If vault syncing fails permanently, there's no easy way to migrate data out of the app.

**Recommendation:** Add an "Export All" function that generates a JSON file of `{ dates, answers, flagged }`.

---

### 2. No Backup/Restore

**Status:** Medium priority
**Context:** App relies on vault as backup; localStorage is ephemeral

**Gap:**
- If Obsidian vault is deleted, no recovery
- No in-app backup creation
- No offline backup option (e.g., email export)

**Recommendation:** Add a "Create Local Backup" button that saves a JSON snapshot to ~/Desktop/Ethos-backup-YYYY-MM-DD.json.

---

### 3. No Search Across Answers

**Status:** Low priority (nice-to-have)
**Gap:**
- HistoryView shows dates, FlaggedView shows flagged answers, but no way to search across all answers for a keyword

**Recommendation:** Future feature; not urgent.

---

### 4. No Bulk Operations on Answers

**Status:** Low priority
**Gap:**
- Can't delete a day's answers in one action
- Can't batch-flag related answers
- Can't move answers to different dates

**Recommendation:** Future feature.

---

## Test Coverage Gaps

| Module | Coverage | Risk |
|--------|----------|------|
| `storage.js` | 0% | High — migrations, sharding, normalization all untested |
| `questionSelector.js` | 0% | High — determinism, weighting algorithm untested |
| `vaultSync.js` | 0% | High — parsing, markdown formatting untested |
| `dateUtils.js` | 0% | Medium — edge cases (DST, year boundaries) untested |
| `App.jsx` | 0% | Medium — state flow, auto-advance logic untested |
| UI components | 0% | Low — visual, snapshot tests nice-to-have |

**Recommended priority:**
1. Unit tests for `questionSelector.js` (determinism, weighting, edge cases)
2. Unit tests for `storage.js` (migrations, sharding, normalization)
3. Integration test for save flow (localStorage + vault)
4. Smoke test for migrations on app load

---

## Code Style & Patterns

### 1. No Consistent Error Handling

**Status:** Low friction, but inconsistent

**Pattern 1: Silent failures**
```javascript
// vaultSync.js, loadQuestionsFromVault()
try {
  const text = await readTextFile(path);
  return parseQuestionsMarkdown(text);
} catch {
  return null;  // Silent fail
}
```

**Pattern 2: Fire-and-forget**
```javascript
// App.jsx, handleSave()
appendAnswersToJournal(...).catch(() => setVaultSyncOk(false));
```

**Pattern 3: Error propagation**
```javascript
// App.jsx, init()
try {
  const available = await checkVaultAvailable();
  // ...
} catch {
  setVaultAvailable(false);
}
```

**Issue:** No consistent error logging, no toast/notification for errors (except amber indicator), no way to see what went wrong.

**Recommendation:** Add a simple error logger (console.error + optional sentry-style reporting). Show user-friendly error messages in UI, not silent failures.

---

### 2. forwardRef Usage in QuestionCard

**Status:** Correct pattern, but could be simpler
**File:** `src/components/QuestionCard.jsx` lines 4, 88–91

**Assessment:** forwardRef is used correctly to expose the card element for `.scrollIntoView()`. Pattern is fine.

---

## Dependencies & Build

### 1. Solid, Minimal Dependency Tree

**Status:** ✓ Good
**File:** `package.json` lines 15–35

**Current deps:**
- `react`, `react-dom` (19.x) — latest
- `@tauri-apps/*` — correct, stable
- `@tailwindcss/vite` — appropriate for Vite 7
- No heavy libraries (no Redux, no complex state management, no form libraries)

**Assessment:** Minimal and intentional. Good for a small, focused app.

**Note:** No test runner installed (`jest`, `vitest`). Consider adding `vitest` (lightweight) when tests are added.

---

### 2. Build & Lint Config

**Status:** ✓ Solid

**Vite config:** Clean, uses Tailwind via Vite plugin (good).
**Tauri config:** Simple, correct identifiers, icon bundle setup.
**ESLint config:** Flat config (new format), includes React rules.

**No concerns here.**

---

## Architecture Summary

### What Works Well

1. **Separation of concerns** — Utils are well-separated (storage, vault, date, selector)
2. **Fallback to localStorage** — Vault unavailability doesn't break the app
3. **Deterministic question selection** — Same date = same questions (excellent for habit building)
4. **Simple state management** — No Redux; React state + refs are sufficient
5. **Tauri security model** — FS permissions are tightly scoped
6. **Responsive design** — Tailwind + mobile-friendly window (480×800)

### What Needs Attention

1. **Test coverage** — Zero tests; add unit tests for core logic
2. **Error handling** — Silent failures; add logging and user feedback
3. **Vault parsing robustness** — Markdown format is brittle; add validation
4. **Code organization** — App.jsx is too large; extract hooks
5. **localStorage key management** — Scattered strings; centralize
6. **Migration safety** — Could re-run; add explicit versioning
7. **Documentation** — CLAUDE.md is helpful, but no API docs for key modules

---

## Priority Roadmap

**Tier 1 (High Priority):**
- Add unit tests for `questionSelector.js` and `storage.js` (prevents silent regressions)
- Centralize localStorage keys in STORAGE_KEYS constant
- Fix migration functions to use explicit versioning

**Tier 2 (Medium Priority):**
- Extract keyboard nav from App.jsx into a custom hook
- Add error logging and user-facing error messages
- Implement retry logic for vault writes

**Tier 3 (Low Priority):**
- Add TypeScript (incremental, start with storage.js)
- Add bulk export / backup features
- Refactor vault markdown parsing with validation

---

## Conclusion

Ethos is a well-intentioned, focused app with solid fundamentals. The codebase is readable and maintainable at current scale. The main risk is **fragility in critical paths** (question selection, vault sync, migrations) due to lack of tests and brittle parsing. Adding test coverage for core logic is the highest-priority improvement. Architectural debt (App.jsx size, scattered keys, silent errors) is manageable and can be addressed incrementally.

No blockers or security issues. Ready for continued development with above improvements in mind.
