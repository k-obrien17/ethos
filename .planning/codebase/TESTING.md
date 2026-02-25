# Testing Patterns — Ethos

**Analysis Date:** 2026-02-25
**Status:** No tests currently implemented

---

## Current State

### What Exists
- **0 test files** in `/src` or `/src-tauri`
- **No test runner** configured (no Jest, Vitest, etc.)
- **No test scripts** in `package.json`
- **No test dependencies** in devDependencies
- ESLint only (linting, not testing)

### What's Tested
- **Manual testing only** — user runs `npm run tauri:dev` and tests app interactively

---

## Code Characteristics Affecting Testing

### Highly Testable Utilities

These are **pure functions** with no side effects and would be ideal test candidates:

**Date utilities (`src/utils/dateUtils.js`):**
- `getTodayKey()` — deterministic, mockable with Date
- `formatDateKey(date)` — pure function, date input → string output
- `formatDisplayDate(dateKey)` — pure, handles edge cases (Today/Yesterday)
- `getDayOfYear(dateKey)` → integer (seeding logic)
- `getWeekDates(dateKey)` → 7 dates (boundary testing)

**Question selection (`src/utils/questionSelector.js`):**
- `mulberry32(seed)` — seeded PRNG, deterministic
- `selectDailyQuestions(dateKey, questionsMap)` — pure function, takes inputs, returns selected questions
- `daysBetween(dateKeyA, dateKeyB)` — pure math
- `markDailyQuestionsAnswered(questions, answers, dateKey)` — side effect only on storage (mockable)

**Vault parsing (`src/utils/vaultSync.js`):**
- `parseQuestionsMarkdown(text)` — pure, string → map
- `formatQuestionsMarkdown(questionsMap)` — pure, map → string
- `formatJournalEntry(dateKey, questions, answers)` — pure markdown generation
- `parseJournalDates(text)` — regex-based, deterministic

### Moderately Testable

**Storage utilities (`src/utils/storage.js`):**
- Pure logic: `normalizeAnswer()`, `normalizeDay()`, `getAnswerText()`
- localStorage-dependent: `safeGet()`, `safeSet()` — require mocking localStorage
- Migrations: deterministic, require setup/teardown

### Hard to Test

**React components (`src/components/*.jsx`):**
- Require React Testing Library or similar
- State + hooks + event handlers + DOM rendering
- DOM refs and focus management (scroll behavior, textarea auto-grow)
- Keyboard navigation integration

**App.jsx:**
- Central orchestration: state management, lifecycle effects, Tauri async initialization
- Complex event handling (keyboard nav, view routing, popstate)
- Integration of multiple subsystems

**Tauri async I/O (`src/utils/vaultSync.js`):**
- Requires Tauri runtime (file operations)
- Difficult to test without mock filesystem

---

## Recommended Testing Strategy

### Tier 1: Unit Tests (Vitest)

**Tools:**
- **Test runner:** Vitest (fast, ESM-native, works with Vite)
- **Assertions:** `expect()` (built-in)
- **Coverage:** Aim for 70%+ on utilities

**Priority modules:**

1. **`src/utils/dateUtils.js`** — 100% pure
   - Test cases:
     - `getTodayKey()` — mock Date, verify format
     - `formatDateKey()` — edge cases (Jan 1, Dec 31, leap years)
     - `formatDisplayDate()` — verify "Today", "Yesterday", other dates
     - `getDayOfYear()` — verify 1–366 range
     - `getWeekDates()` — verify 7 consecutive dates, Monday start

2. **`src/utils/questionSelector.js`** — pure + storage
   - Test cases:
     - `mulberry32()` — seeded PRNG deterministic, produces [0, 1)
     - `selectDailyQuestions()` — same seed → same questions, weighted selection
     - `daysBetween()` — edge cases (same day, 1 day apart, months apart)
     - `markDailyQuestionsAnswered()` — mocked storage, verify calls

3. **`src/utils/vaultSync.js`** — pure parsing
   - Test cases:
     - `parseQuestionsMarkdown()` — valid/invalid markdown, missing sections
     - `formatQuestionsMarkdown()` — round-trip (parse → format → parse)
     - `formatJournalEntry()` — multi-line answers, special chars, empty entries
     - `parseJournalDates()` — extract dates from Journal.md format

4. **`src/utils/storage.js`** — pure + mocked localStorage
   - Mock localStorage (use `jest-localstorage-mock` or manual)
   - Test cases:
     - `safeGet()` / `safeSet()` — valid JSON, corrupt data, quota exceeded
     - `normalizeAnswer()` — string → object, object → object
     - `getAnswers()` — sharded keys, missing dates
     - `saveAnswer()` — new/update/delete, lifetime stats updates
     - Migrations: old format → new format

### Tier 2: Component Tests (React Testing Library)

**Tools:**
- **Library:** React Testing Library (user-centric)
- **Setup:** Vitest + @testing-library/react

**Priority components:**

1. **`ProgressBar.jsx`** — straightforward, mostly display
   - Test cases:
     - Percentage calculation (0/10, 5/10, 10/10)
     - Streak display (only when > 1)
     - Category depth bars (opacity calculation)

2. **`QuestionCard.jsx`** — complex, central to UX
   - Requires refs, event handlers, localStorage
   - Test cases:
     - Expand/collapse toggle
     - Draft auto-save (debounce)
     - Flag button (only when saved)
     - Keyboard shortcuts (Cmd+Enter save)
     - Word count calculation

3. **`HistoryView.jsx`** — list + callbacks
   - Test cases:
     - Render date list (sorted, count formatting)
     - Click to select date → callback
     - "No history" message

### Tier 3: Integration Tests (Manual or E2E Framework)

**Tools:**
- **Tauri:** Built-in `tauri:build` tests (rust side)
- **E2E:** Optional — WebdriverIO or Playwright for full app flow

**Scenarios:**
- Create daily answers → verify localStorage + Journal.md
- Custom question → vault Questions.md
- Date navigation → history view
- Offline mode (vault unavailable)

---

## Setup Steps

### 1. Install Vitest

```bash
npm install --save-dev vitest @vitest/ui @vitest/coverage-v8
```

### 2. Configure Vitest

Create `vitest.config.js`:
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'src-tauri/'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 3. Setup File

Create `vitest.setup.js`:
```javascript
import { expect, afterEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
```

### 4. Add Test Scripts to package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 5. Install React Testing Library (for component tests)

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

---

## Example Test Files

### `src/utils/__tests__/dateUtils.test.js`

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getTodayKey,
  formatDateKey,
  formatDisplayDate,
  getDayOfYear,
  getWeekDates,
} from '../dateUtils';

describe('dateUtils', () => {
  describe('getTodayKey', () => {
    it('returns YYYY-MM-DD format', () => {
      const key = getTodayKey();
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('matches formatDateKey(new Date())', () => {
      expect(getTodayKey()).toBe(formatDateKey(new Date()));
    });
  });

  describe('formatDateKey', () => {
    it('formats Date object to YYYY-MM-DD', () => {
      const date = new Date('2026-02-25T12:00:00');
      expect(formatDateKey(date)).toBe('2026-02-25');
    });

    it('pads month and day', () => {
      const date = new Date('2026-01-05T12:00:00');
      expect(formatDateKey(date)).toBe('2026-01-05');
    });

    it('handles string input', () => {
      expect(formatDateKey('2026-02-25')).toBe('2026-02-25');
    });
  });

  describe('formatDisplayDate', () => {
    it('returns "Today" for today', () => {
      const today = getTodayKey();
      expect(formatDisplayDate(today)).toBe('Today');
    });

    it('returns "Yesterday" for yesterday', () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = formatDateKey(yesterday);
      expect(formatDisplayDate(yesterdayKey)).toBe('Yesterday');
    });

    it('returns formatted date for other dates', () => {
      const result = formatDisplayDate('2026-02-20');
      expect(result).toMatch(/\w{3}, \w{3} \d{1,2}/);
    });
  });

  describe('getDayOfYear', () => {
    it('returns 1 for Jan 1', () => {
      expect(getDayOfYear('2026-01-01')).toBe(1);
    });

    it('returns 365 for Dec 31 (non-leap)', () => {
      expect(getDayOfYear('2026-12-31')).toBe(365);
    });

    it('returns valid range', () => {
      const day = getDayOfYear('2026-06-15');
      expect(day).toBeGreaterThan(0);
      expect(day).toBeLessThanOrEqual(366);
    });
  });

  describe('getWeekDates', () => {
    it('returns 7 consecutive dates', () => {
      const dates = getWeekDates('2026-02-25');
      expect(dates.length).toBe(7);
      // Verify consecutive
      for (let i = 1; i < 7; i++) {
        const prev = new Date(dates[i - 1] + 'T12:00:00');
        const curr = new Date(dates[i] + 'T12:00:00');
        expect((curr - prev) / (1000 * 60 * 60 * 24)).toBe(1);
      }
    });

    it('starts on Monday', () => {
      const dates = getWeekDates('2026-02-25');
      const firstDay = new Date(dates[0] + 'T12:00:00');
      expect(firstDay.getDay()).toBe(1); // Monday
    });
  });
});
```

### `src/utils/__tests__/questionSelector.test.js`

```javascript
import { describe, it, expect } from 'vitest';
import {
  selectDailyQuestions,
  daysBetween,
} from '../questionSelector';
import { CATEGORIES, FALLBACK_QUESTIONS } from '../../data/questions';

describe('questionSelector', () => {
  describe('selectDailyQuestions', () => {
    it('returns 10 questions (one per category)', () => {
      const questions = selectDailyQuestions('2026-02-25');
      expect(questions.length).toBe(10);
      expect(questions.map(q => q.category.id)).toEqual(
        CATEGORIES.map(c => c.id)
      );
    });

    it('is deterministic for same seed', () => {
      const q1 = selectDailyQuestions('2026-02-25', FALLBACK_QUESTIONS);
      const q2 = selectDailyQuestions('2026-02-25', FALLBACK_QUESTIONS);
      expect(q1.map(q => q.question)).toEqual(q2.map(q => q.question));
    });

    it('differs for different dates', () => {
      const q1 = selectDailyQuestions('2026-02-25', FALLBACK_QUESTIONS);
      const q2 = selectDailyQuestions('2026-02-26', FALLBACK_QUESTIONS);
      const same = q1.every((q, idx) => q.question === q2[idx].question);
      expect(same).toBe(false); // Very unlikely to be identical
    });
  });

  describe('daysBetween', () => {
    it('returns 0 for same date', () => {
      expect(daysBetween('2026-02-25', '2026-02-25')).toBe(0);
    });

    it('returns 1 for consecutive days', () => {
      expect(daysBetween('2026-02-25', '2026-02-26')).toBe(1);
    });

    it('returns correct value across months', () => {
      expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1);
    });
  });
});
```

### `src/components/__tests__/ProgressBar.test.jsx`

```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressBar from '../ProgressBar';

// Mock storage
vi.mock('../../utils/storage', () => ({
  getStreak: () => ({ current: 5, lastDate: '2026-02-25' }),
  getLifetimeStats: () => ({
    totalAnswers: 150,
    categoryCounts: { habit: 15, reflection: 14, goal: 13 },
  }),
}));

describe('ProgressBar', () => {
  it('displays answered count and total', () => {
    render(<ProgressBar answered={7} total={10} dateKey="2026-02-25" />);
    expect(screen.getByText(/7\/10 today/)).toBeInTheDocument();
  });

  it('shows streak when > 1', () => {
    render(<ProgressBar answered={10} total={10} dateKey="2026-02-25" />);
    expect(screen.getByText(/5d streak/)).toBeInTheDocument();
  });

  it('shows total answers count', () => {
    render(<ProgressBar answered={5} total={10} dateKey="2026-02-25" />);
    expect(screen.getByText(/150 total/)).toBeInTheDocument();
  });
});
```

---

## Testing Workflow

### Day-to-Day

```bash
# Watch mode during development
npm run test

# Check coverage before commit
npm run test:coverage

# Visual UI
npm run test:ui
```

### Pre-Commit (Optional)

Add husky hook:
```bash
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run test:coverage"
```

---

## Known Limitations

### Cannot Easily Test

1. **Tauri file I/O** — requires mock filesystem or Tauri runtime
2. **Vault integration** — end-to-end testing requires real vault directory
3. **Keyboard navigation** — DOM simulation needed (React Testing Library handles)
4. **Dark mode toggle** — DOM class manipulation, testable but requires setup

### Workarounds

- Mock Tauri functions: `vi.mock('@tauri-apps/plugin-fs')`
- Mock localStorage globally (see setup file)
- Use React Testing Library for component interaction tests
- E2E tests via Tauri's test harness or Playwright

---

## Coverage Targets

| Module | Target | Notes |
|--------|--------|-------|
| `dateUtils.js` | 100% | Pure functions, easy to cover |
| `questionSelector.js` | 90% | Pure + storage mock |
| `storage.js` | 85% | Mocked localStorage, migrations complex |
| `vaultSync.js` | 70% | Parsing testable, I/O not |
| Components | 60% | Focus on logic, not DOM exhaustively |
| **Overall** | **75%** | Reasonable for production app |

---

## Migration Path

### Phase 1 (Now)
- No tests
- Manual testing via `npm run tauri:dev`

### Phase 2 (Recommended)
- Add Vitest + unit tests for utilities
- Coverage target: 70%
- Catch regressions in date math, storage, question selection

### Phase 3 (Optional)
- Add React Testing Library for component tests
- E2E tests for vault sync
- CI/CD integration (GitHub Actions)

---

## Summary

**Current:** Manual testing only, no test framework.

**Recommendation:** Start with Vitest unit tests for pure utilities (`dateUtils`, `questionSelector`, vault parsing). These are:
- Easy to test (pure functions)
- High ROI (math-heavy, easy to break)
- Quick wins (70%+ coverage in a day)

Components and Tauri I/O are lower priority until the codebase becomes more complex or refactoring begins.
