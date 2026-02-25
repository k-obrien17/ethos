const STORAGE_KEYS = {
  ANSWERS: 'daily10_answers',
  STREAKS: 'daily10_streaks',
  FLAGGED: 'daily10_flagged',
  CUSTOM_QUESTIONS: 'daily10_custom_questions',
  ANSWERED_QUESTIONS: 'daily10_answered_questions',
  LIFETIME_STATS: 'daily10_lifetime',
};

function safeGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('localStorage write failed:', e);
  }
}

// --- Answers ---

// Normalize legacy string answers to the rich format
function normalizeAnswer(entry) {
  if (typeof entry === 'string') {
    return { answer: entry, question: null, categoryId: null, wordCount: entry.trim().split(/\s+/).length };
  }
  return entry;
}

function normalizeDay(dayData) {
  if (!dayData) return {};
  const out = {};
  for (const [k, v] of Object.entries(dayData)) {
    out[k] = normalizeAnswer(v);
  }
  return out;
}

export function getAnswers(dateKey) {
  const monthKey = dateKey.slice(0, 7); // "2026-02"
  const all = safeGet(`${STORAGE_KEYS.ANSWERS}_${monthKey}`, {});
  return normalizeDay(all[dateKey]);
}

// Get just the answer text for a given entry (works with old string or new object format)
export function getAnswerText(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  return entry.answer || '';
}

export function saveAnswer(dateKey, questionIndex, answer, question, categoryId) {
  const monthKey = dateKey.slice(0, 7);
  const storageKey = `${STORAGE_KEYS.ANSWERS}_${monthKey}`;
  const all = safeGet(storageKey, {});
  if (!all[dateKey]) all[dateKey] = {};
  const existing = all[dateKey][questionIndex];
  const hadAnswer = existing && getAnswerText(existing).trim();
  const text = typeof answer === 'string' ? answer : answer.answer || '';
  const hasAnswer = text.trim();
  all[dateKey][questionIndex] = {
    answer: text,
    question,
    categoryId,
    wordCount: hasAnswer ? text.trim().split(/\s+/).length : 0,
  };
  safeSet(storageKey, all);

  // Update cached lifetime stats
  if (hasAnswer && !hadAnswer) {
    incrementLifetimeStat(categoryId, 1);
  } else if (!hasAnswer && hadAnswer) {
    incrementLifetimeStat(categoryId, -1);
  }
}

export function getAllAnswerDates() {
  const dates = new Set();
  // Scan all month keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_KEYS.ANSWERS + '_')) {
      const monthData = safeGet(key, {});
      for (const d of Object.keys(monthData)) {
        dates.add(d);
      }
    }
    // Also check legacy single-blob key
    if (key === STORAGE_KEYS.ANSWERS) {
      const legacy = safeGet(key, {});
      for (const d of Object.keys(legacy)) {
        dates.add(d);
      }
    }
  }
  return [...dates].sort().reverse();
}

export function getAnswersForDates(dateKeys) {
  const result = {};
  for (const dateKey of dateKeys) {
    const day = getAnswers(dateKey);
    if (Object.keys(day).length > 0) result[dateKey] = day;
  }
  return result;
}

// One-time migration from old single-blob to per-month keys
export function migrateStorage() {
  const legacy = safeGet(STORAGE_KEYS.ANSWERS, null);
  if (!legacy || typeof legacy !== 'object') return;
  // Group by month
  const byMonth = {};
  for (const [dateKey, dayData] of Object.entries(legacy)) {
    const monthKey = dateKey.slice(0, 7);
    if (!byMonth[monthKey]) byMonth[monthKey] = {};
    byMonth[monthKey][dateKey] = dayData;
  }
  // Write each month
  for (const [monthKey, data] of Object.entries(byMonth)) {
    const storageKey = `${STORAGE_KEYS.ANSWERS}_${monthKey}`;
    const existing = safeGet(storageKey, {});
    safeSet(storageKey, { ...existing, ...data });
  }
  // Remove legacy key
  try { localStorage.removeItem(STORAGE_KEYS.ANSWERS); } catch {}
}

// --- Lifetime Stats (cached) ---

function recomputeLifetimeStats() {
  let totalAnswers = 0;
  const categoryCounts = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(STORAGE_KEYS.ANSWERS + '_')) continue;
    const monthData = safeGet(key, {});
    for (const dayData of Object.values(monthData)) {
      if (!dayData || typeof dayData !== 'object') continue;
      for (const entry of Object.values(dayData)) {
        const text = typeof entry === 'string' ? entry : entry?.answer || '';
        if (text.trim()) {
          totalAnswers++;
          const catId = typeof entry === 'object' ? entry.categoryId : null;
          if (catId) {
            categoryCounts[catId] = (categoryCounts[catId] || 0) + 1;
          }
        }
      }
    }
  }

  const stats = { totalAnswers, categoryCounts };
  safeSet(STORAGE_KEYS.LIFETIME_STATS, stats);
  return stats;
}

function incrementLifetimeStat(categoryId, delta) {
  const stats = safeGet(STORAGE_KEYS.LIFETIME_STATS, null);
  if (!stats) return; // Will be seeded by migrateLifetimeStats
  stats.totalAnswers = Math.max(0, (stats.totalAnswers || 0) + delta);
  if (categoryId) {
    stats.categoryCounts = stats.categoryCounts || {};
    stats.categoryCounts[categoryId] = Math.max(0, (stats.categoryCounts[categoryId] || 0) + delta);
  }
  safeSet(STORAGE_KEYS.LIFETIME_STATS, stats);
}

export function getLifetimeStats() {
  const cached = safeGet(STORAGE_KEYS.LIFETIME_STATS, null);
  if (cached) return cached;
  return recomputeLifetimeStats();
}

export function migrateLifetimeStats() {
  if (!safeGet(STORAGE_KEYS.LIFETIME_STATS, null)) {
    recomputeLifetimeStats();
  }
}

// --- Streaks ---

export function getStreak() {
  return safeGet(STORAGE_KEYS.STREAKS, { current: 0, lastDate: null });
}

export function updateStreak(dateKey, answeredCount) {
  const streak = getStreak();

  if (answeredCount < 10) return streak;

  if (streak.lastDate === dateKey) return streak;

  const yesterday = new Date(dateKey + 'T12:00:00');
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split('T')[0];

  if (streak.lastDate === yesterdayKey) {
    streak.current += 1;
  } else if (streak.lastDate !== dateKey) {
    streak.current = 1;
  }

  streak.lastDate = dateKey;
  safeSet(STORAGE_KEYS.STREAKS, streak);
  return streak;
}

// --- Flagged ---

export function getFlagged() {
  return safeGet(STORAGE_KEYS.FLAGGED, []);
}

export function toggleFlagged(dateKey, questionIndex) {
  const flagged = getFlagged();
  const id = `${dateKey}:${questionIndex}`;
  const idx = flagged.indexOf(id);
  if (idx >= 0) {
    flagged.splice(idx, 1);
  } else {
    flagged.push(id);
  }
  safeSet(STORAGE_KEYS.FLAGGED, flagged);
  return flagged;
}

export function isFlagged(dateKey, questionIndex) {
  const flagged = getFlagged();
  return flagged.includes(`${dateKey}:${questionIndex}`);
}

// --- Custom Questions ---

export function getCustomQuestions() {
  return safeGet(STORAGE_KEYS.CUSTOM_QUESTIONS, {});
}

export function addCustomQuestion(categoryId, question) {
  const custom = getCustomQuestions();
  if (!custom[categoryId]) custom[categoryId] = [];
  custom[categoryId].push(question);
  safeSet(STORAGE_KEYS.CUSTOM_QUESTIONS, custom);
  return custom;
}

// --- Drafts (protect against app quit losing in-progress text) ---

const DRAFTS_KEY = 'daily10_drafts';

export function getDraft(dateKey, questionIndex) {
  const drafts = safeGet(DRAFTS_KEY, {});
  return drafts[`${dateKey}:${questionIndex}`] || '';
}

export function saveDraft(dateKey, questionIndex, text) {
  const drafts = safeGet(DRAFTS_KEY, {});
  const key = `${dateKey}:${questionIndex}`;
  if (text.trim()) {
    drafts[key] = text;
  } else {
    delete drafts[key];
  }
  safeSet(DRAFTS_KEY, drafts);
}

export function clearDraft(dateKey, questionIndex) {
  const drafts = safeGet(DRAFTS_KEY, {});
  delete drafts[`${dateKey}:${questionIndex}`];
  safeSet(DRAFTS_KEY, drafts);
}

// --- Answered Question Tracking (fatigue prevention) ---
// Format: { categoryId: { questionIndex: dateKey, ... }, ... }

export function getAnsweredQuestions() {
  return safeGet(STORAGE_KEYS.ANSWERED_QUESTIONS, {});
}

export function markQuestionAnswered(categoryId, questionIndex, dateKey) {
  const answered = getAnsweredQuestions();
  if (!answered[categoryId]) answered[categoryId] = {};
  answered[categoryId][questionIndex] = dateKey;
  safeSet(STORAGE_KEYS.ANSWERED_QUESTIONS, answered);
}

// Migrate old array format { catId: [idx, ...] } to new map format { catId: { idx: dateKey } }
export function migrateAnsweredQuestions() {
  const answered = safeGet(STORAGE_KEYS.ANSWERED_QUESTIONS, {});
  let needsMigration = false;

  for (const catId of Object.keys(answered)) {
    if (Array.isArray(answered[catId])) {
      needsMigration = true;
      break;
    }
  }

  if (!needsMigration) return;

  const migrated = {};
  for (const [catId, value] of Object.entries(answered)) {
    if (Array.isArray(value)) {
      migrated[catId] = {};
      for (const idx of value) {
        // No date info in old format — use a far-past date so they get high weight
        migrated[catId][idx] = '2020-01-01';
      }
    } else {
      migrated[catId] = value;
    }
  }

  safeSet(STORAGE_KEYS.ANSWERED_QUESTIONS, migrated);
}
