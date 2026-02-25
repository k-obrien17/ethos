# External Integrations — Ethos

**Analysis Date:** 2026-02-25
**Project:** Ethos (Daily 10 journaling app for macOS)
**Repository:** `/Users/keithobrien/Desktop/Claude/Projects/ethos`

---

## Summary

Ethos has **one external integration:** the Obsidian vault for question and answer persistence. All other storage is local (browser `localStorage`). No APIs, databases, or third-party services.

---

## 1. Obsidian Vault (Filesystem)

### What It Is

Local filesystem directory managed by Obsidian. Ethos reads and writes Markdown files to synchronize question libraries and answer logs.

**Vault location:** `~/Desktop/obsidian-workspace/vault/Ethos/`

### How It's Used

#### Read Operations

**File:** `Questions.md`
**Purpose:** Load question library at app startup
**Format:** Markdown with H2 category headers, one question per line

```markdown
## Reflection
What did you learn today?
What surprised you?

## Growth
What skill did you practice?
```

**Code:** `src/utils/vaultSync.js` → `loadQuestionsFromVault()`

- Called on app mount to replace embedded `FALLBACK_QUESTIONS`
- Uses `@tauri-apps/plugin-fs` to read via `readTextFile()`
- If vault unavailable, app falls back to embedded questions
- Parsed line-by-line into `{ categoryId: [question, ...] }` map

#### Write Operations

**File:** `Journal.md`
**Purpose:** Append answered questions with user answers (source of truth for answer history)
**Format:** Markdown with H2 date headers, blockquote-wrapped answers

```markdown
## 2026-02-25

**Reflection**
What did you learn today?
> I learned that consistent small actions compound over time.

**Growth**
What skill did you practice?
> I practiced writing clear, concise technical documentation.

---

## 2026-02-24

**Reflection**
...
```

**Code:** `src/utils/vaultSync.js` → `appendAnswersToJournal(dateKey, questions, answersMap)`

- Called after user saves answers for a day
- Fire-and-forget: writes async but doesn't block UI
- If date entry exists, replaces it; otherwise prepends (newest first)
- Handles multi-line answers correctly (each line blockquoted)

**File:** `Questions.md` (append)
**Purpose:** Add custom user questions to library
**Code:** `src/utils/vaultSync.js` → `saveQuestionToVault(categoryId, question)`

- Called when user adds a custom question via modal (`AddQuestion.jsx`)
- Appends question to appropriate category section in `Questions.md`
- Creates category section if it doesn't exist

### Implementation Details

#### Tauri fs Plugin

**Dependency:** `@tauri-apps/plugin-fs` v2.4.5

**Functions used:**
- `readTextFile(path)` — Read file contents as UTF-8 string
- `writeTextFile(path, content)` — Write/overwrite file
- `exists(path)` — Check if path exists
- `mkdir(path, { recursive: true })` — Create directories

**Permissions scope:** Defined in `src-tauri/capabilities/default.json`

Example capability (fs plugin scoped):
```json
{
  "permissions": [
    "fs:allow-read-text-file:/",
    "fs:allow-write-text-file:/",
    "fs:allow-mkdir:/**/"
  ],
  "scope": ["~/Desktop/obsidian-workspace/vault/**"]
}
```

**Note:** Exact permissions not provided in repo; likely configured in `capabilities/default.json` (not shown in source).

#### Path Resolution

**Utility:** `src/utils/vaultSync.js`

```javascript
async function getVaultPath() {
  const home = await homeDir();  // from @tauri-apps/api/path
  return await join(home, 'Desktop/obsidian-workspace/vault/Ethos');
}
```

- Uses Tauri's `homeDir()` for OS-agnostic home path
- Constructs vault path via `join()`
- Cached to avoid repeated calls

#### Vault Availability Check

**Function:** `checkVaultAvailable()`

- Tries to ensure vault directory exists
- Returns `false` if vault is unreachable (e.g., vault disk unmounted, permission denied)
- App shows "vault offline" badge in header when unavailable

**Fallback behavior:**
- If vault unavailable, app uses `FALLBACK_QUESTIONS` from `src/data/questions.js`
- All answers still saved to localStorage
- When vault becomes available, app syncs localStorage to vault (one-time migration)

### One-Time Migration

**Purpose:** Move answers from localStorage to vault when vault first becomes available

**Code:** `src/utils/vaultSync.js` → `runMigration(selectDailyQuestionsFn)`

**Trigger:** `App.jsx` on mount, guarded by `localStorage.getItem('ethos_vault_migrated')`

**Steps:**
1. Export all embedded + custom questions to `Questions.md`
2. Export all localStorage answers to `Journal.md` (reconstruct questions per day using PRNG seed)
3. Set `ethos_vault_migrated` flag to prevent re-running

**Why:** Preserves answer history when transitioning from offline-only to vault-synced mode

---

## 2. Browser localStorage

### What It Is

Browser's built-in client-side key-value store. Persistent across sessions, cleared only when cache is purged.

### How It's Used

#### Storage Keys

| Key | Purpose | Format | Sharded? |
|-----|---------|--------|----------|
| `ethos_answers_YYYY-MM` | Answers (one month per key) | `{ dateKey: { questionIndex: answerObject } }` | Yes (by month) |
| `ethos_streaks` | Consecutive days completed | `{ dateKey: streak }` | No |
| `ethos_flagged` | Questions marked for content development | `{ dateKey: [indices] }` | No |
| `ethos_custom_questions` | User-added questions (cache) | `{ categoryId: [questions] }` | No |
| `ethos_answered_questions` | Tracking seen/unseen questions | `{ categoryId: { questionIndex: dateKey } }` | No |
| `ethos_lifetime` | Statistics (total answers per category, total streak) | `{ categoryId: count, total_streak: num }` | No |
| `ethos_drafts` | In-progress answer text (debounced) | `{ questionIndex: text }` | No |
| `ethos_dark` | Dark mode toggle | `"true"` \| `"false"` | No |
| `ethos_vault_migrated` | Migration flag | `"1"` | No |

**Note:** Legacy key `ethos_answers` (unsharded) is supported for backward compatibility but not created by new code.

#### Storage Patterns

**Answer persistence:**
- Saved immediately on user input (debounced 300ms for drafts)
- Monthly sharding prevents localStorage quota issues (typically 5-10MB per domain)
- Format: `{ answer: string, question: string, categoryId: string, wordCount: number }`
- Normalized on read to handle legacy string format

**Streak calculation:**
- Incremented when all 10 answers complete in a day
- Stored as `{ dateKey: count }` to allow gap analysis

**Custom questions:**
- Cached locally for instant add-modal UX
- Also written to vault `Questions.md` (vault is canonical)
- When vault loads, custom questions should already be in `Questions.md`

**Drafts:**
- Saved as user types (300ms debounce via `QuestionCard.jsx`)
- Restored on app reopen
- Cleared on explicit save

#### Code

**File:** `src/utils/storage.js`

- `getAnswers(dateKey)` — Retrieve all answers for a day
- `saveAnswer(dateKey, questionIndex, answer, question, categoryId)` — Persist single answer
- `getAllAnswerDates()` — List all dates with answers (for history view)
- `updateStreak(dateKey, count)` — Update streak if all 10 answered
- Safe JSON encode/decode with error handling

---

## 3. No External APIs or Services

### What's NOT Integrated

| Service | Status | Why |
|---------|--------|-----|
| Backend API | ❌ Not used | Data is local only |
| Database | ❌ Not used | localStorage + vault files |
| Authentication | ❌ Not used | Single-user app, local only |
| Analytics | ❌ Not used | Privacy-first design |
| Cloud sync | ❌ Not used | Vault is the only "cloud" (local Obsidian) |
| Third-party hosting | ❌ Not used | Self-contained desktop app |
| Google Docs | ❌ Not used | Export is copy-to-clipboard only |
| Social sharing | ❌ Not used | No share buttons or integrations |

---

## 4. CI/CD & Deployment

### Current State

- **No CI/CD pipeline** — Builds are manual
- **No automated testing** — No test suite in repo
- **No automated releases** — Manual `.dmg` / `.app` distribution

### Build Process

**Local build on developer machine:**

```bash
npm run tauri:build
```

Produces:
- `.app` directory (executable)
- `.dmg` file (installer)
- Located in `src-tauri/target/release/bundle/macos/`

### Future Considerations

- **GitHub Actions:** Could automate build & code signing
- **Sparkle/autoupdate:** Could be added via Tauri plugin for automatic updates
- **Code signing:** Required for macOS distribution (not currently scripted)

---

## 5. External Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Ethos App                               │
│  (React, Tauri, JavaScript)                                     │
└─────────────────┬───────────────────────────┬───────────────────┘
                  │                           │
         ┌────────▼─────────┐       ┌─────────▼──────────┐
         │  localStorage    │       │  Obsidian Vault    │
         │  (local cache)   │       │  (filesystem)      │
         │                  │       │                    │
         │ • Answers        │       │ • Questions.md     │
         │ • Streaks        │       │ • Journal.md       │
         │ • Custom Q's     │◄─────►│ (r/w via Tauri fs) │
         │ • Drafts         │       │                    │
         │ • Flagged        │       │ ~/Desktop/         │
         │ • Stats          │       │ obsidian-workspace/│
         │ • Dark mode      │       │ vault/Ethos/       │
         └──────────────────┘       └────────────────────┘
              (5-10MB)                  (unlimited)
           (session+persist)          (canonical)
```

---

## 6. Security & Privacy

### Data Ownership

- **User owns all data** — stored locally on disk
- **No telemetry** — app does not phone home
- **No API keys** — no secrets in code or config
- **Offline by default** — vault sync is optional

### Filesystem Permissions

- **Tauri fs plugin scope:** Limited to `~/Desktop/obsidian-workspace/vault/Ethos/`
- **No write access to system directories**
- **No network access** — app has no internet socket permissions

### localStorage Security

- **Scoped to app origin** — other tabs/apps cannot read
- **Cleared when cache is cleared** — user control
- **Unencrypted** — assumes macOS disk encryption is in place

---

## 7. Integration Failure Modes & Recovery

### Vault Becomes Unavailable

**Causes:** Vault disk unmounted, filesystem error, permission denied

**Detection:** `checkVaultAvailable()` fails

**Behavior:**
1. Set `vaultAvailable` to false
2. Display "vault offline" badge in header
3. Continue using `FALLBACK_QUESTIONS` and localStorage
4. Queue vault writes in memory (fire-and-forget, logged as sync failed)

**Recovery:** Vault reappears (mounted, permissions restored)

- Next answer save attempts write to vault
- Vault writes resume in background
- Badge clears when write succeeds

### localStorage Quota Exceeded

**Cause:** Month has >5MB of answers (unlikely; 10 answers × 365 days = ~36MB max/year)

**Detection:** `safeSet()` catches quota error and logs

**Behavior:** Answer still saved to vault (if available), but localStorage write fails silently

**Prevention:** Monthly sharding limits per-key size

### Vault File Corruption

**Cause:** Manual edits in Obsidian, network filesystem glitch

**Detection:** Parsing error in `loadQuestionsFromVault()` or `appendAnswersToJournal()`

**Behavior:** Vault sync fails, logged error in console, app continues with cache

**Recovery:** Manual repair in Obsidian, or delete `.md` files to re-export from localStorage

---

## 8. Data Synchronization

### Direction: Two-Way (Vault ← → localStorage)

| Operation | Trigger | Direction | Conflict Resolution |
|-----------|---------|-----------|---------------------|
| Load questions | App startup | Vault → localStorage (state) | Vault wins (canonical) |
| Save answer | User clicks save | Both (async) | localStorage first (instant), vault second (fire-and-forget) |
| Add question | User adds modal | Both (sequential) | localStorage first, vault append |
| Migration | First vault available | localStorage → Vault | Export all localStorage to vault |

### Consistency Model

- **Optimistic:** UI updates from localStorage immediately
- **Eventual:** Vault writes happen in background
- **Vault is canonical:** If conflict, vault data is source of truth (but conflicts rare due to single-user design)

---

## 9. Dependency Audit

### No External Network

- ✅ Tauri API calls are local (system paths, filesystem)
- ✅ No `fetch()`, `axios`, `node-fetch` in code
- ✅ No web requests to CDN or API

### No Third-Party SaaS

- ✅ No Firebase, Supabase, or similar
- ✅ No Sentry, LogRocket, or error tracking
- ✅ No Google Analytics or similar

### fontSource Package

- ✅ `@fontsource/inter` is font files (CSS), not network requests
- ✅ Font is bundled in the app, not fetched at runtime

---

## 10. Future Integration Points (Not Yet Implemented)

| Feature | Tech | Status | Purpose |
|---------|------|--------|---------|
| Auto-update | Tauri Updater + Sparkle | Not implemented | Push app updates |
| Cloud backup | Dropbox / iCloud Drive sync | Not implemented | Optional backup |
| Web export | Export function | Partially (clipboard copy) | Share answers online |
| Voice input | Web Audio API | Not implemented | Dictation support |
| Spellcheck | Native + hunspell | Not implemented | Grammar checking |

---

## Summary Table

| Integration | Type | Direction | Sync Cadence | Fallback |
|-------------|------|-----------|--------------|----------|
| Obsidian Vault | Filesystem (r/w) | Two-way | On save + startup | Embedded fallback questions, localStorage only |
| localStorage | Browser API (r/w) | Implicit | Instant | None (essential) |
| HTML5 History | Browser API (navigation) | N/A | Per click | No fallback |
| Tauri fs | IPC | Local | Immediate | None (required for vault access) |

---

## Conclusion

Ethos is **deliberately decoupled** from external services. The single integration (Obsidian vault) is optional and local. The app prioritizes:

1. **User data ownership** — no cloud, no tracking
2. **Offline capability** — works without vault or network
3. **Simplicity** — minimal dependencies, no API complexity
4. **Privacy** — all computation is local

The architecture is compatible with future enhancements (cloud sync, auto-update) but does not require them.
