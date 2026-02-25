import { useMemo } from 'react';
import { getStreak, getLifetimeStats } from '../utils/storage';
import { CATEGORIES } from '../data/questions';

export default function ProgressBar({ answered, total, dateKey }) {
  const percentage = total > 0 ? (answered / total) * 100 : 0;

  const streak = useMemo(() => getStreak(), [answered, dateKey]);
  const stats = useMemo(() => getLifetimeStats(), [answered, dateKey]);

  const maxCategoryCount = Math.max(1, ...Object.values(stats.categoryCounts));

  return (
    <div className="mb-6">
      {/* Today + total */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-warm-600 dark:text-warm-400">
            {answered}/{total} today
          </span>
          <span className="text-xs text-warm-400 dark:text-warm-500">
            {stats.totalAnswers} total
          </span>
        </div>
        {streak.current > 1 && (
          <span className="text-xs text-warm-400 dark:text-warm-500">
            {streak.current}d streak
          </span>
        )}
      </div>

      {/* Today progress bar */}
      <div className="w-full h-1.5 bg-warm-200 dark:bg-warm-700 rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: percentage === 100 ? '#059669' : '#78716C',
          }}
        />
      </div>

      {/* Category depth bars */}
      <div className="flex gap-1">
        {CATEGORIES.map((cat) => {
          const count = stats.categoryCounts[cat.id] || 0;
          const opacity = count === 0 ? 0.15 : 0.25 + 0.75 * (count / maxCategoryCount);
          return (
            <div
              key={cat.id}
              className="flex-1 h-1 rounded-full"
              style={{ backgroundColor: cat.color, opacity }}
              title={`${cat.name}: ${count}`}
            />
          );
        })}
      </div>
    </div>
  );
}
