import { useState, useEffect } from 'react';
import { getFlagged, getAnswers, getAnswerText, toggleFlagged } from '../utils/storage';
import { selectDailyQuestions } from '../utils/questionSelector';
import { CATEGORIES } from '../data/questions';
import { formatDisplayDate } from '../utils/dateUtils';

const categoryMap = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export default function FlaggedView({ onClose }) {
  const [flaggedItems, setFlaggedItems] = useState([]);

  useEffect(() => {
    loadFlagged();
  }, []);

  function loadFlagged() {
    const flagged = getFlagged();
    const items = [];

    for (const id of flagged) {
      const [dateKey, indexStr] = id.split(':');
      const index = parseInt(indexStr, 10);
      const dayAnswers = getAnswers(dateKey);
      const entry = dayAnswers[index];
      if (!entry) continue;

      const text = getAnswerText(entry);
      if (!text.trim()) continue;

      // Use stored question/category if available, fall back to PRNG reconstruction
      let questionText = entry.question;
      let category = entry.categoryId ? categoryMap[entry.categoryId] : null;

      if (!questionText || !category) {
        const questions = selectDailyQuestions(dateKey);
        const q = questions[index];
        if (q) {
          questionText = questionText || q.question;
          category = category || q.category;
        }
      }

      if (!questionText || !category) continue;

      items.push({
        id,
        dateKey,
        index,
        question: questionText,
        category,
        answer: text,
      });
    }

    items.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    setFlaggedItems(items);
  }

  function handleUnflag(dateKey, index) {
    toggleFlagged(dateKey, index);
    loadFlagged();
  }

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-warm-900">
      <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight">Flagged for Content</h2>
          <button onClick={onClose} className="text-sm text-warm-500 dark:text-warm-400 hover:text-warm-700 dark:hover:text-warm-200 cursor-pointer">
            Back
          </button>
        </div>

        {flaggedItems.length === 0 ? (
          <p className="text-sm text-warm-500 dark:text-warm-400">
            No flagged answers yet. Save an answer, then tap the flag icon to mark it for content development.
          </p>
        ) : (
          <div className="space-y-3">
            {flaggedItems.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700 rounded-lg p-4"
                style={{ borderLeftWidth: '3px', borderLeftColor: item.category.color }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${item.category.color}15`,
                        color: item.category.color,
                      }}
                    >
                      {item.category.name}
                    </span>
                    <span className="text-xs text-warm-400 dark:text-warm-500">
                      {formatDisplayDate(item.dateKey)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleUnflag(item.dateKey, item.index)}
                    className="text-amber-500 hover:text-amber-600 p-1 cursor-pointer"
                    title="Remove flag"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm font-medium text-warm-900 dark:text-warm-100 mb-2">{item.question}</p>
                <p className="text-sm text-warm-600 dark:text-warm-300 leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
