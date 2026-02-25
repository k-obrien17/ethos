# Coding Conventions — Ethos

**Analysis Date:** 2026-02-25
**Stack:** React 19, Vite 7, Tailwind CSS 4, Tauri v2, JavaScript (JSX)

---

## File & Module Organization

### Naming Conventions

**Files:**
- React components: `PascalCase.jsx` (e.g., `QuestionCard.jsx`, `ProgressBar.jsx`)
- Utilities: `camelCase.js` (e.g., `storage.js`, `dateUtils.js`, `questionSelector.js`)
- Styles: `index.css` (single global stylesheet + Tailwind)

**Directories:**
- `/src/components/` — React components
- `/src/utils/` — Pure functions (storage, date math, selection logic, vault I/O)
- `/src/data/` — Static data (questions.js with CATEGORIES array)
- `/src/styles/` — CSS (Tailwind config + custom rules)
- `/src-tauri/` — Rust backend config and build metadata

### Module Exports

**Components:**
- Default export for each component: `export default function ComponentName(props) { ... }`
- Example: `src/components/QuestionCard.jsx` — `export default memo(QuestionCard);`

**Utilities:**
- Named exports for all utility functions
- Example: `src/utils/storage.js` — `export function getAnswers(dateKey) { ... }`
- One module per concern (storage, vault sync, date handling, question selection)

**Data:**
- Named exports: `export const CATEGORIES = [...]` and `export const FALLBACK_QUESTIONS = {...}`

---

## Naming Patterns

### Variables & Functions

**General:**
- `camelCase` for variables, functions, properties
- `UPPER_SNAKE_CASE` for constants and storage keys: `STORAGE_KEYS = { ANSWERS: 'ethos_answers', ... }`

**Dates:**
- `dateKey` — ISO 8601 string `YYYY-MM-DD`
- `monthKey` — Month slice `YYYY-MM`
- Functions: `getTodayKey()`, `formatDateKey(date)`, `formatDisplayDate(dateKey)`

**State:**
- Descriptive names: `expandedIndex`, `questionsMap`, `vaultAvailable`, `darkMode`, `activeView`
- Boolean flags with `is`/`has` prefix where idiomatic: `isToday`, `isFlagged`, `hasAnswers`, `saved`
- Refs with `Ref` suffix: `textareaRef`, `cardElRef`, `draftTimerRef`, `questionsMapRef`

**DOM/UI:**
- `classList` strings: use template literals with conditionals
- Style objects: `{ color, backgroundColor, opacity, height }` — camelCase CSS properties
- Click handlers: `onClick`, `onToggle`, `onSave`, `onClose`, `onSelectDate`

**Storage Keys:**
- Centralized in object: `STORAGE_KEYS = { ANSWERS, STREAKS, FLAGGED, ... }`
- Composite keys: `${STORAGE_KEYS.ANSWERS}_${monthKey}` for sharded storage
- ID format for flagged items: `${dateKey}:${questionIndex}`

---

## Code Style

### Formatting

- **No Prettier:** ESLint only (see `eslint.config.js`)
- **No TypeScript:** Plain JavaScript/JSX
- **Indentation:** 2 spaces (implied by codebase)
- **Line length:** No hard limit enforced; keep reasonable (~100 chars typical, conditional rendering can be longer)
- **Semicolons:** Present throughout

### Imports

**Organization:**
1. React imports first: `import { useState, useRef, ... } from 'react'`
2. External dependencies: `import { readTextFile } from '@tauri-apps/plugin-fs'`
3. Project utilities: `import { getTodayKey } from './utils/dateUtils'`
4. Project components: `import QuestionCard from './components/QuestionCard'`

**Example from `App.jsx`:**
```javascript
import { useState, useEffect, useCallback, useRef } from 'react';
import { getTodayKey, formatDisplayDate } from './utils/dateUtils';
import { getAnswers, saveAnswer, ... } from './utils/storage';
import QuestionCard from './components/QuestionCard';
```

### Arrow Functions

- Preferred for callbacks and simple logic
- Example: `const loadDay = useCallback((key) => { ... }, [])`
- Multiline callbacks: Use block body `{ ... }` with explicit returns

### Object Literals

- Short properties on same line: `{ current: 0, lastDate: null }`
- Spread in destructuring: `const { ...existing, [dateKey]: dayData }`
- Computed keys: `all[dateKey][questionIndex] = {...}`

---

## Error Handling

### Pattern: Empty Catch

- **Consistent approach:** Catch errors and fail silently, returning fallback
- Example from `vaultSync.js`:
  ```javascript
  try {
    const text = await readTextFile(path);
    return parseQuestionsMarkdown(text);
  } catch {
    return null;
  }
  ```

- Example from `storage.js`:
  ```javascript
  function safeGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }
  ```

### Pattern: console.error with Context

- Used when data loss or sync failure occurs
- Example from `storage.js`:
  ```javascript
  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('localStorage write failed:', e);
    }
  }
  ```

- Example from `App.jsx` (vault sync):
  ```javascript
  appendAnswersToJournal(dk, questionsRef.current, updated)
    .then(() => setVaultSyncOk(true))
    .catch(() => setVaultSyncOk(false));
  ```

### Async Flow

- Fire-and-forget patterns: `.catch(() => setVaultSyncOk(false))` (no re-throw)
- Initialization effects: `try/catch` block wrapping async function, silent failure with fallback state
- Example from `App.jsx`:
  ```javascript
  useEffect(() => {
    async function init() {
      try {
        const available = await checkVaultAvailable();
        setVaultAvailable(available);
        // ...
      } catch {
        setVaultAvailable(false);
      }
    }
    init();
  }, []);
  ```

---

## Comments & Documentation

### Inline Comments

- Sparse; prefer clear naming over comments
- Used for non-obvious logic or workarounds

**Examples:**
```javascript
// One-time migrations
useEffect(() => { ... }, []);

// Don't intercept when typing in a textarea/input
const tag = document.activeElement?.tagName;

// Auto-advance to next unanswered
if (count < 10) { ... }
```

### Block Comments

- Section delimiters in utility files:
  ```javascript
  // --- Answers ---
  // --- Streaks ---
  // --- Vault availability check ---
  ```

### JSDoc

- Not used; types are implicit in JavaScript context
- Component props are self-documenting via destructuring

---

## React Patterns

### Functional Components

- Always functional (no class components)
- Props via destructuring: `function Component({ prop1, prop2 }) { ... }`
- Default export: `export default function ComponentName(props) { ... }`

### Hooks

**useState:**
- Grouped logically at top of component
- Example: `const [expandedIndex, setExpandedIndex] = useState(null)`

**useEffect:**
- One effect per concern (side effect)
- Dependency arrays always explicit: `useEffect(() => {...}, [dateKey, index])`
- Cleanup functions: `return () => { ... }`
- Example:
  ```javascript
  useEffect(() => {
    function handleKeyDown(e) { ... }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, expandedIndex, showAddQuestion]);
  ```

**useCallback:**
- For event handlers passed as props or used in dependency arrays
- Example:
  ```javascript
  const handleSave = useCallback((index, text) => {
    saveAnswer(...);
    setAnswers(updated);
  }, []);
  ```

**useRef:**
- For DOM refs: `const textareaRef = useRef(null)`
- For mutable state across renders: `const draftTimerRef = useRef(null)`
- For caching values: `questionsMapRef.current = questionsMap` in same effect

**useMemo:**
- Used for expensive computed values or stable object references
- Example from `ProgressBar.jsx`:
  ```javascript
  const streak = useMemo(() => getStreak(), [answered, dateKey]);
  const stats = useMemo(() => getLifetimeStats(), [answered, dateKey]);
  ```

**forwardRef & memo:**
- Applied to components with ref requirements
- Example from `QuestionCard.jsx`:
  ```javascript
  const QuestionCard = forwardRef(function QuestionCard({...}, ref) { ... });
  export default memo(QuestionCard);
  ```

### Component Structure

**Order within component:**
1. Destructure props
2. useState declarations
3. useState initializers (inline arrow functions)
4. useRef declarations
5. Derived values (computed from state)
6. useEffect hooks (initialization, then side effects)
7. useCallback definitions
8. Event handlers
9. JSX return

Example from `QuestionCard.jsx`:
```javascript
const QuestionCard = forwardRef(function QuestionCard({
  index, question, category, answer, onSave, ...
}, ref) {
  const [text, setText] = useState(() => { ... });
  const [flagged, setFlagged] = useState(false);
  const textareaRef = useRef(null);
  // ... more refs
  const saved = answer && answer.trim().length > 0; // derived value
  const wordCount = ...;

  useEffect(() => { ... }, [answer, dateKey, index]);
  const debounceSaveDraft = useCallback((value) => { ... }, [dateKey, index]);
  // ... more effects/callbacks

  function handleSave() { ... }
  function handleFlag(e) { ... }

  return ( <div>...</div> );
});
```

### JSX Patterns

**Conditional Rendering:**
- Ternary operators inline: `isExpanded ? 'border-warm-300' : 'border-warm-200'`
- Logical AND for single condition: `{saved && <span>✓</span>}`
- Short-circuit: `{showAddQuestion && <AddQuestion ... />}`

**className Organization:**
- Base classes inline
- Conditional classes in template literal:
  ```javascript
  className={`bg-white rounded-lg border transition-all ${
    isExpanded
      ? 'border-warm-300 dark:border-warm-600 shadow-sm'
      : 'border-warm-200 dark:border-warm-700'
  }`}
  ```

**Style Objects:**
- For dynamic values (colors, opacity, dimensions):
  ```javascript
  style={{
    borderLeftWidth: '3px',
    borderLeftColor: isExpanded || saved ? category.color : 'transparent',
  }}
  ```

**Keys in Lists:**
- Always present: `key={`${dateKey}-${idx}`}`
- Prefer stable identifiers (dateKey + index when no ID)

**Event Handlers:**
- Inline for simple logic: `onClick={() => navigateTo('today')}`
- Named functions for complex: `onClick={handleSave}`
- Prevent defaults where needed: `e.preventDefault()`, `e.stopPropagation()`

---

## Data Structures

### Storage Format

**Answers:**
- New format (object with metadata): `{ answer: string, question: string, categoryId: string, wordCount: number }`
- Legacy format (string): handled with normalizeAnswer()
- Storage key sharding: `ethos_answers_2026-02` (one key per month)

**Questions Map:**
- Vault-loaded: `{ categoryId: [question1, question2, ...], ... }`
- With custom: merged in localStorage cache

**Streak:**
- `{ current: number, lastDate: YYYY-MM-DD }`

**Flagged Items:**
- Array of strings: `["2026-02-25:0", "2026-02-25:3"]`

**Answered Question Tracking:**
- `{ categoryId: { questionIndex: YYYY-MM-DD, ... }, ... }`
- Tracks last date each question was answered (for fatigue prevention)

### API & Vault Format

**Questions.md:**
- H2 header per category: `## Category ID`
- One question per line (plain text)

**Journal.md:**
- H2 header per date: `## 2026-02-25`
- Per answered question: bold category name → question → blockquoted answer
- Entries separated by `---`

---

## Common Utilities

### Storage (src/utils/storage.js)

**Safe operations:**
- `safeGet(key, fallback)` — parse JSON or return fallback
- `safeSet(key, value)` — stringify and write, log errors

**Answers:**
- `getAnswers(dateKey)` → object of answers for day
- `saveAnswer(dateKey, index, answer, question, categoryId)` → writes to storage
- `getAllAnswerDates()` → sorted array of YYYY-MM-DD keys
- `getAnswerText(entry)` → handle legacy string or new object format

**Migrations:**
- `migrateStorage()` — single blob to per-month sharding
- `migrateAnsweredQuestions()` — array format to map format
- `migrateLifetimeStats()` — seed cached stats

### Vault Sync (src/utils/vaultSync.js)

**Public API:**
- `loadQuestionsFromVault()` → parsed questions map
- `saveQuestionToVault(categoryId, question)` → append to Questions.md
- `appendAnswersToJournal(dateKey, questions, answers)` → upsert Journal.md entry
- `checkVaultAvailable()` → test vault directory access
- `runMigration(selectDailyQuestionsFn)` → export localStorage to vault files

**Internal:**
- `parseQuestionsMarkdown(text)` — H2-delimited sections to map
- `formatJournalEntry(dateKey, questions, answers)` — markdown formatting
- `parseJournalDates(text)` — extract date headers

### Date Utils (src/utils/dateUtils.js)

- `getTodayKey()` → YYYY-MM-DD
- `formatDateKey(date)` → normalize Date object to key
- `formatDisplayDate(dateKey)` → "Today", "Yesterday", or "Mon, Feb 25"
- `getDayOfYear(dateKey)` → 1–366 for seeding PRNG
- `getWeekDates(dateKey)` → array of 7 dates (Mon–Sun)
- `isSunday(dateKey)` → boolean

### Question Selector (src/utils/questionSelector.js)

**PRNG:**
- `mulberry32(seed)` — seeded random number generator

**Selection:**
- `selectDailyQuestions(dateKey, questionsMap)` → array of 10 selected questions (one per category)
- Weighted by recency: never-seen = 100, seen = days since (min 1, max 100)

**Tracking:**
- `markDailyQuestionsAnswered(questions, answers, dateKey)` → save answered question indices with dates
- `getAllQuestionsForCategory(categoryId, questionsMap)` → base + custom questions

---

## Tailwind CSS

### Custom Theme

**Colors (src/styles/index.css):**
```
warm-50 through warm-900: stone/neutral palette
Custom CSS variables via @theme
```

**Category Colors (inline):**
- Used in component.color: blue, purple, green, cyan, amber, red, pink, indigo, orange, lime
- Rendered via inline style: `{ backgroundColor: category.color }`

### Patterns

**Dark Mode:**
- Toggle class: `.dark` on `<html>` element
- Variant syntax: `dark:bg-warm-900`, `dark:text-warm-100`
- Persisted in localStorage: `ethos_dark`

**Responsive:**
- Mobile-first: `px-4 py-6 sm:py-10`
- Window: 480×800 default, min 380×600 (Tauri config)

**Animations:**
- Transitions: `transition-colors duration-200`, `transition-all duration-300`
- Keyframes: `.flash` for copy button feedback

---

## Special Patterns

### Debouncing (QuestionCard.jsx)

```javascript
const debounceSaveDraft = useCallback((value) => {
  if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
  draftTimerRef.current = setTimeout(() => {
    saveDraft(dateKey, index, value);
  }, 300);
}, [dateKey, index]);
```

### forwardRef with Manual Merge (QuestionCard.jsx)

```javascript
ref={(el) => {
  cardElRef.current = el;
  if (typeof ref === 'function') ref(el);
  else if (ref) ref.current = el;
}}
```

### Keyboard Navigation (App.jsx)

- Global `keydown` handler with type checking
- Escape to collapse/close
- Arrow Up/k, Arrow Down/j for navigation
- Skip when typing in textarea/input

### View Routing (App.jsx)

- Client-side: `history.pushState({ view }, '', hash)`
- `popstate` listener for back button
- `activeView` state: 'today' | 'history' | 'flagged' | 'digest'
- Overlays mounted conditionally, always fixed/inset-0/z-40

---

## No TypeScript

- Type safety via JSDoc comments (rare)
- Runtime safety via defensive checks: `typeof entry === 'string'`, `?.optional`, `|| fallback`
- Example:
  ```javascript
  const text = typeof entry === 'string' ? entry : entry?.answer || '';
  if (Array.isArray(answered[catId])) { /* migration needed */ }
  ```

---

## Summary

This is a **minimal, pragmatic codebase**:
- No build-time type checking (JS/JSX only)
- No test framework
- ESLint for linting; no Prettier
- Tailwind for styling; single global CSS file
- React hooks for state; localStorage + Obsidian vault for data
- Plain error handling: try/catch with fallbacks
- Functional components with clear separation of concerns (components vs. utils)
- Mobile-first responsive design
- Fire-and-forget async patterns for non-critical I/O
