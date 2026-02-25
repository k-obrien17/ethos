import { getAllAnswerDates, getAnswers, getAnswerText } from '../utils/storage';
import { formatDisplayDate, getTodayKey } from '../utils/dateUtils';

export default function HistoryView({ onSelectDate, onClose }) {
  const dates = getAllAnswerDates();
  const todayKey = getTodayKey();

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-warm-900">
      <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight">History</h2>
          <button onClick={onClose} className="text-sm text-warm-500 dark:text-warm-400 hover:text-warm-700 dark:hover:text-warm-200 cursor-pointer">
            Back
          </button>
        </div>

        {dates.length === 0 ? (
          <p className="text-sm text-warm-500 dark:text-warm-400">No sessions yet. Answer some questions to see your history.</p>
        ) : (
          <div className="space-y-1">
            {dates.map((dateKey) => {
              const dayAnswers = getAnswers(dateKey);
              const count = Object.values(dayAnswers).filter((a) => getAnswerText(a).trim()).length;
              const isToday = dateKey === todayKey;

              return (
                <button
                  key={dateKey}
                  onClick={() => {
                    onSelectDate(dateKey);
                    onClose();
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                    isToday
                      ? 'bg-white dark:bg-warm-800 border border-warm-200 dark:border-warm-700'
                      : 'hover:bg-white dark:hover:bg-warm-800'
                  }`}
                >
                  <div>
                    <span className="text-sm font-medium text-warm-900 dark:text-warm-100">
                      {formatDisplayDate(dateKey)}
                    </span>
                    <span className="text-xs text-warm-400 dark:text-warm-500 ml-2">{dateKey}</span>
                  </div>
                  <span className={`text-xs font-medium ${count === 10 ? 'text-emerald-600 dark:text-emerald-400' : 'text-warm-500 dark:text-warm-400'}`}>
                    {count}/10
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
