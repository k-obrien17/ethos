import { CATEGORIES, FALLBACK_QUESTIONS } from '../data/questions';
import { getDayOfYear } from './dateUtils';
import {
  getCustomQuestions,
  getAnsweredQuestions,
  markQuestionAnswered,
} from './storage';

// Simple seeded PRNG (mulberry32)
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateSeed(dateKey) {
  const parts = dateKey.split('-');
  const year = parseInt(parts[0], 10);
  const dayOfYear = getDayOfYear(dateKey);
  return year * 1000 + dayOfYear;
}

function daysBetween(dateKeyA, dateKeyB) {
  const a = new Date(dateKeyA + 'T12:00:00');
  const b = new Date(dateKeyB + 'T12:00:00');
  return Math.round(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}

export function selectDailyQuestions(dateKey, questionsMap) {
  const seed = dateSeed(dateKey);
  const rng = mulberry32(seed);
  const customQuestions = getCustomQuestions();
  const answeredQuestions = getAnsweredQuestions();
  const qMap = questionsMap || FALLBACK_QUESTIONS;

  const selected = CATEGORIES.map((category) => {
    const baseQuestions = qMap[category.id] || [];
    const custom = questionsMap ? [] : (customQuestions[category.id] || []);
    const allQuestions = [...baseQuestions, ...custom];
    const totalCount = allQuestions.length;

    const answeredMap = answeredQuestions[category.id] || {};

    // Build weights: never-seen = 100, seen = days since (min 1, max 100)
    const weights = [];
    for (let i = 0; i < totalCount; i++) {
      const lastDate = answeredMap[i];
      if (!lastDate) {
        weights.push(100);
      } else {
        const days = daysBetween(lastDate, dateKey);
        weights.push(Math.max(1, Math.min(100, days)));
      }
    }

    // Weighted random selection using the seeded RNG
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let roll = rng() * totalWeight;
    let questionIndex = 0;
    for (let i = 0; i < totalCount; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        questionIndex = i;
        break;
      }
    }

    return {
      category,
      question: allQuestions[questionIndex],
      questionIndex,
      originalIndex: questionIndex,
    };
  });

  return selected;
}

export function markDailyQuestionsAnswered(questions, answers, dateKey) {
  questions.forEach((q, idx) => {
    const entry = answers[idx];
    const text = typeof entry === 'string' ? entry : entry?.answer || '';
    if (text.trim()) {
      markQuestionAnswered(q.category.id, q.originalIndex, dateKey);
    }
  });
}

export function getAllQuestionsForCategory(categoryId, questionsMap) {
  const qMap = questionsMap || FALLBACK_QUESTIONS;
  const base = qMap[categoryId] || [];
  const custom = questionsMap ? [] : (getCustomQuestions()[categoryId] || []);
  return [...base, ...custom];
}
