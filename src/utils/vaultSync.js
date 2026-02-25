import { readTextFile, writeTextFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { homeDir, join } from '@tauri-apps/api/path';
import { CATEGORIES, FALLBACK_QUESTIONS } from '../data/questions';
import { getCustomQuestions, getAllAnswerDates, getAnswers, getAnswerText } from './storage';

const VAULT_SUBPATH = 'Desktop/obsidian-workspace/vault/Ethos';

// --- Path helpers ---

let cachedVaultPath = null;

export async function getVaultPath() {
  if (cachedVaultPath) return cachedVaultPath;
  const home = await homeDir();
  cachedVaultPath = await join(home, VAULT_SUBPATH);
  return cachedVaultPath;
}

async function questionsFilePath() {
  const base = await getVaultPath();
  return await join(base, 'Questions.md');
}

async function journalFilePath() {
  const base = await getVaultPath();
  return await join(base, 'Journal.md');
}

// --- Ensure vault directory exists ---

async function ensureVaultDir() {
  const vaultPath = await getVaultPath();
  const dirExists = await exists(vaultPath);
  if (!dirExists) {
    await mkdir(vaultPath, { recursive: true });
  }
}

// --- Questions.md parsing/formatting ---

function parseQuestionsMarkdown(text) {
  const questions = {};
  let currentCategory = null;

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      currentCategory = trimmed.slice(3).trim();
      if (!questions[currentCategory]) questions[currentCategory] = [];
    } else if (trimmed && currentCategory) {
      questions[currentCategory].push(trimmed);
    }
  }

  return questions;
}

function formatQuestionsMarkdown(questionsMap) {
  const lines = [];
  for (const category of CATEGORIES) {
    const qs = questionsMap[category.id] || [];
    if (qs.length === 0) continue;
    lines.push(`## ${category.id}`);
    lines.push('');
    for (const q of qs) {
      lines.push(q);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// --- Journal.md parsing/formatting ---

function formatJournalEntry(dateKey, selectedQuestions, answersMap) {
  const lines = [`## ${dateKey}`, ''];

  // Group answered questions by category
  for (let i = 0; i < selectedQuestions.length; i++) {
    const q = selectedQuestions[i];
    const entry = answersMap[i];
    const text = getAnswerText(entry);
    if (!text.trim()) continue;

    lines.push(`**${q.category.name}**`);
    lines.push(q.question);
    // Blockquote the answer — handle multi-line
    const answerLines = text.split('\n');
    for (const al of answerLines) {
      lines.push(`> ${al}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function parseJournalDates(text) {
  const dates = new Set();
  for (const line of text.split('\n')) {
    const match = line.match(/^## (\d{4}-\d{2}-\d{2})\s*$/);
    if (match) dates.add(match[1]);
  }
  return dates;
}

// --- Public API ---

export async function loadQuestionsFromVault() {
  try {
    const path = await questionsFilePath();
    const fileExists = await exists(path);
    if (!fileExists) return null;

    const text = await readTextFile(path);
    return parseQuestionsMarkdown(text);
  } catch {
    return null;
  }
}

export async function saveQuestionToVault(categoryId, question) {
  const path = await questionsFilePath();
  let text = '';

  try {
    const fileExists = await exists(path);
    if (fileExists) {
      text = await readTextFile(path);
    }
  } catch {
    // Start fresh
  }

  if (!text.trim()) {
    // No file yet — build from current questionsMap
    const currentQuestions = {};
    for (const cat of CATEGORIES) {
      currentQuestions[cat.id] = [...(FALLBACK_QUESTIONS[cat.id] || [])];
    }
    currentQuestions[categoryId].push(question);
    await ensureVaultDir();
    await writeTextFile(path, formatQuestionsMarkdown(currentQuestions));
    return;
  }

  // Find the category section and append
  const lines = text.split('\n');
  const categoryHeader = `## ${categoryId}`;
  let insertIdx = -1;
  let foundCategory = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === categoryHeader) {
      foundCategory = true;
      // Find end of this category (next ## or end of file)
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().startsWith('## ')) {
        j++;
      }
      // Insert before the next section (or at end), after last non-empty line
      let insertPoint = j;
      // Back up past trailing blank lines
      while (insertPoint > i + 1 && !lines[insertPoint - 1].trim()) {
        insertPoint--;
      }
      insertIdx = insertPoint;
      break;
    }
  }

  if (foundCategory && insertIdx >= 0) {
    lines.splice(insertIdx, 0, question);
  } else {
    // Category not found — append new section
    lines.push('');
    lines.push(categoryHeader);
    lines.push('');
    lines.push(question);
    lines.push('');
  }

  await writeTextFile(path, lines.join('\n'));
}

export async function appendAnswersToJournal(dateKey, selectedQuestions, answersMap) {
  const path = await journalFilePath();
  const newEntry = formatJournalEntry(dateKey, selectedQuestions, answersMap);

  // Don't write empty entries
  const hasAnswers = Object.values(answersMap).some(a => getAnswerText(a).trim());
  if (!hasAnswers) return;

  let existingText = '';
  try {
    const fileExists = await exists(path);
    if (fileExists) {
      existingText = await readTextFile(path);
    }
  } catch {
    // Start fresh
  }

  await ensureVaultDir();

  if (!existingText.trim()) {
    await writeTextFile(path, newEntry.trimEnd() + '\n');
    return;
  }

  // Check if this date already exists — replace it
  const dateHeader = `## ${dateKey}`;
  const lines = existingText.split('\n');
  let dateStart = -1;
  let dateEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === dateHeader) {
      dateStart = i;
      // Find end: next date header (## YYYY-MM-DD) or end of file
      let j = i + 1;
      while (j < lines.length) {
        if (lines[j].match(/^## \d{4}-\d{2}-\d{2}\s*$/)) break;
        // Also stop at --- separator before next date
        if (lines[j].trim() === '---' && j + 1 < lines.length && lines[j + 1].match(/^\s*$/)) {
          // Check if next non-empty line is a date header
          let k = j + 1;
          while (k < lines.length && !lines[k].trim()) k++;
          if (k < lines.length && lines[k].match(/^## \d{4}-\d{2}-\d{2}\s*$/)) {
            j = j; // stop before the ---
            break;
          }
        }
        j++;
      }
      dateEnd = j;
      break;
    }
  }

  if (dateStart >= 0) {
    // Replace existing entry
    const entryLines = newEntry.trimEnd().split('\n');
    lines.splice(dateStart, dateEnd - dateStart, ...entryLines);
    await writeTextFile(path, lines.join('\n'));
  } else {
    // Prepend new entry (newest first)
    const separator = '\n---\n\n';
    await writeTextFile(path, newEntry.trimEnd() + separator + existingText);
  }
}

// --- Migration ---

export async function runMigration(selectDailyQuestionsFn) {
  await ensureVaultDir();

  // 1. Export Questions.md — embedded + custom
  const questionsPath = await questionsFilePath();
  const questionsExist = await exists(questionsPath);

  if (!questionsExist) {
    const allQuestions = {};
    const customQuestions = getCustomQuestions();

    for (const cat of CATEGORIES) {
      const base = FALLBACK_QUESTIONS[cat.id] || [];
      const custom = customQuestions[cat.id] || [];
      allQuestions[cat.id] = [...base, ...custom];
    }

    await writeTextFile(questionsPath, formatQuestionsMarkdown(allQuestions));
  }

  // 2. Export Journal.md — reconstruct answers from localStorage
  const journalPath = await journalFilePath();
  const journalExists = await exists(journalPath);

  if (!journalExists) {
    const dates = getAllAnswerDates(); // sorted newest-first
    const entries = [];

    for (const dateKey of dates) {
      const answers = getAnswers(dateKey);
      if (!Object.values(answers).some(a => getAnswerText(a).trim())) continue;

      // Use the selector to reconstruct which questions were shown that day
      const questions = selectDailyQuestionsFn(dateKey);

      const entry = formatJournalEntry(dateKey, questions, answers);
      entries.push(entry.trimEnd());
    }

    if (entries.length > 0) {
      await writeTextFile(journalPath, entries.join('\n\n---\n\n') + '\n');
    }
  }
}

// --- Vault availability check ---

export async function checkVaultAvailable() {
  try {
    // Try to create the directory — succeeds if parent vault exists
    await ensureVaultDir();
    const vaultPath = await getVaultPath();
    return await exists(vaultPath);
  } catch {
    return false;
  }
}
