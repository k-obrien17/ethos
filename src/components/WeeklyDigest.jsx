import { useState, useEffect } from 'react';
import { getWeekDates, getTodayKey, formatDisplayDate } from '../utils/dateUtils';
import { getAnswers, getAnswerText } from '../utils/storage';
import { selectDailyQuestions } from '../utils/questionSelector';
import { CATEGORIES } from '../data/questions';

const categoryMap = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export default function WeeklyDigest({ onClose }) {
  const [digestData, setDigestData] = useState({});
  const [totalAnswers, setTotalAnswers] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const todayKey = getTodayKey();
    const weekDates = getWeekDates(todayKey);
    const grouped = {};
    let count = 0;

    for (const cat of CATEGORIES) {
      grouped[cat.id] = { category: cat, items: [] };
    }

    for (const dateKey of weekDates) {
      const dayAnswers = getAnswers(dateKey);
      if (Object.keys(dayAnswers).length === 0) continue;

      // Only fall back to PRNG if stored entries lack question text
      let dailyQuestions = null;

      for (const [idxStr, entry] of Object.entries(dayAnswers)) {
        const text = getAnswerText(entry);
        if (!text.trim()) continue;

        let questionText = entry.question;
        let catId = entry.categoryId;

        if (!questionText || !catId) {
          if (!dailyQuestions) dailyQuestions = selectDailyQuestions(dateKey);
          const q = dailyQuestions[parseInt(idxStr, 10)];
          if (q) {
            questionText = questionText || q.question;
            catId = catId || q.category.id;
          }
        }

        if (!questionText || !catId) continue;
        const category = categoryMap[catId];
        if (!category) continue;

        grouped[catId].items.push({
          dateKey,
          question: questionText,
          answer: text,
        });
        count++;
      }
    }

    setDigestData(grouped);
    setTotalAnswers(count);
  }, []);

  function handleCopy() {
    const lines = [`# Weekly Digest\n`];

    for (const cat of CATEGORIES) {
      const group = digestData[cat.id];
      if (!group || group.items.length === 0) continue;

      lines.push(`## ${cat.name}\n`);
      for (const item of group.items) {
        lines.push(`**${item.question}** _(${formatDisplayDate(item.dateKey)})_\n`);
        lines.push(item.answer.trim());
        lines.push('');
      }
    }

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-warm-900">
      <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight">Weekly Digest</h2>
            <p className="text-xs text-warm-500 dark:text-warm-400 mt-0.5">{totalAnswers} answers this week</p>
          </div>
          <div className="flex items-center gap-3">
            {totalAnswers > 0 && (
              <button
                onClick={handleCopy}
                className="text-sm font-medium text-warm-600 dark:text-warm-400 hover:text-warm-800 dark:hover:text-warm-200 border border-warm-300 dark:border-warm-600 rounded-md px-4 py-2 transition-colors cursor-pointer"
              >
                {copied ? 'Copied' : 'Copy All'}
              </button>
            )}
            <button onClick={onClose} className="text-sm text-warm-500 dark:text-warm-400 hover:text-warm-700 dark:hover:text-warm-200 cursor-pointer">
              Back
            </button>
          </div>
        </div>

        {totalAnswers === 0 ? (
          <p className="text-sm text-warm-500 dark:text-warm-400">No answers this week yet.</p>
        ) : (
          <div className="space-y-8">
            {CATEGORIES.map((cat) => {
              const group = digestData[cat.id];
              if (!group || group.items.length === 0) return null;

              return (
                <div key={cat.id}>
                  <h3
                    className="text-sm font-semibold mb-3 flex items-center gap-2"
                    style={{ color: cat.color }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    {cat.name}
                    <span className="text-xs font-normal text-warm-400 dark:text-warm-500">
                      ({group.items.length})
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {group.items.map((item, idx) => (
                      <div key={idx} className="bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700 rounded-lg p-4">
                        <p className="text-sm font-medium text-warm-800 dark:text-warm-200">{item.question}</p>
                        <p className="text-sm text-warm-600 dark:text-warm-300 mt-2 leading-relaxed">{item.answer}</p>
                        <p className="text-xs text-warm-400 dark:text-warm-500 mt-2">{formatDisplayDate(item.dateKey)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
