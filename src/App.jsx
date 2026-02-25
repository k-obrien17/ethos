import { useState, useEffect, useCallback, useRef } from 'react';
import { getTodayKey, formatDisplayDate } from './utils/dateUtils';
import { getAnswers, saveAnswer, updateStreak, getAnswerText, migrateStorage, migrateAnsweredQuestions, migrateLifetimeStats } from './utils/storage';
import { selectDailyQuestions, markDailyQuestionsAnswered } from './utils/questionSelector';
import { loadQuestionsFromVault, appendAnswersToJournal, checkVaultAvailable, runMigration } from './utils/vaultSync';
import QuestionCard from './components/QuestionCard';
import ProgressBar from './components/ProgressBar';
import ExportButton from './components/ExportButton';
import HistoryView from './components/HistoryView';
import FlaggedView from './components/FlaggedView';
import WeeklyDigest from './components/WeeklyDigest';
import AddQuestion from './components/AddQuestion';

export default function App() {
  const [dateKey, setDateKey] = useState(getTodayKey());
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [activeView, setActiveView] = useState('today'); // 'today' | 'history' | 'flagged' | 'digest'
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [questionsMap, setQuestionsMap] = useState(null);
  const [vaultAvailable, setVaultAvailable] = useState(true);
  const [vaultSyncOk, setVaultSyncOk] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('daily10_dark');
      if (stored !== null) return stored === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const isToday = dateKey === getTodayKey();
  const questionsMapRef = useRef(questionsMap);
  questionsMapRef.current = questionsMap;
  const questionsRef = useRef(questions);
  questionsRef.current = questions;
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const dateKeyRef = useRef(dateKey);
  dateKeyRef.current = dateKey;
  const vaultAvailableRef = useRef(vaultAvailable);
  vaultAvailableRef.current = vaultAvailable;

  // One-time migrations
  useEffect(() => {
    migrateStorage();
    migrateAnsweredQuestions();
    migrateLifetimeStats();
  }, []);

  // Load questions from vault on mount (UI renders immediately with fallback questions)
  useEffect(() => {
    async function init() {
      try {
        const available = await checkVaultAvailable();
        setVaultAvailable(available);

        if (available) {
          // Run migration if not done yet
          if (!localStorage.getItem('daily10_vault_migrated')) {
            await runMigration((dateKey) => selectDailyQuestions(dateKey));
            localStorage.setItem('daily10_vault_migrated', '1');
          }

          const vaultQuestions = await loadQuestionsFromVault();
          if (vaultQuestions) {
            setQuestionsMap(vaultQuestions);
          } else {
            setVaultAvailable(false);
          }
        }
      } catch {
        setVaultAvailable(false);
      }
    }
    init();
  }, []);

  // pushState navigation
  function navigateTo(view) {
    setActiveView(view);
    if (view !== 'today') {
      history.pushState({ view }, '', `#${view}`);
    } else {
      history.pushState({ view: 'today' }, '', window.location.pathname);
    }
  }

  useEffect(() => {
    function handlePopState(e) {
      const view = e.state?.view || 'today';
      setActiveView(view);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('daily10_dark', String(darkMode));
  }, [darkMode]);

  const loadDay = useCallback((key) => {
    const q = selectDailyQuestions(key, questionsMapRef.current);
    const a = getAnswers(key);
    setQuestions(q);
    setAnswers(a);
    setExpandedIndex(null);
  }, []);

  // Load day when dateKey changes or when questionsMap resolves from vault
  useEffect(() => {
    loadDay(dateKey);
  }, [dateKey, questionsMap, loadDay]);

  const handleSave = useCallback((index, text) => {
    const q = questionsRef.current[index];
    const dk = dateKeyRef.current;
    saveAnswer(dk, index, text, q.question, q.category.id);
    const updated = { ...answersRef.current, [index]: { answer: text, question: q.question, categoryId: q.category.id, wordCount: text.trim() ? text.trim().split(/\s+/).length : 0 } };
    setAnswers(updated);

    const count = Object.values(updated).filter((a) => getAnswerText(a).trim()).length;
    updateStreak(dk, count);
    markDailyQuestionsAnswered(questionsRef.current, updated, dk);

    // Write to vault
    if (vaultAvailableRef.current) {
      appendAnswersToJournal(dk, questionsRef.current, updated)
        .then(() => setVaultSyncOk(true))
        .catch(() => setVaultSyncOk(false));
    }

    // Auto-advance to next unanswered
    setExpandedIndex(null);
    if (count < 10) {
      for (let i = index + 1; i < 10; i++) {
        if (!getAnswerText(updated[i]).trim()) {
          setTimeout(() => setExpandedIndex(i), 150);
          return;
        }
      }
      for (let i = 0; i < index; i++) {
        if (!getAnswerText(updated[i]).trim()) {
          setTimeout(() => setExpandedIndex(i), 150);
          return;
        }
      }
    }
  }, []);

  const handleToggle = useCallback((index) => {
    setExpandedIndex((prev) => prev === index ? null : index);
  }, []);

  function goToToday() {
    setDateKey(getTodayKey());
  }

  // Reload questionsMap from vault (used after adding a question)
  async function reloadFromVault() {
    try {
      const vaultQuestions = await loadQuestionsFromVault();
      if (vaultQuestions) {
        setQuestionsMap(vaultQuestions);
        // Need to use the new map directly since state update is async
        const q = selectDailyQuestions(dateKey, vaultQuestions);
        const a = getAnswers(dateKey);
        setQuestions(q);
        setAnswers(a);
      }
    } catch {
      // Vault read failed — keep current state
    }
  }

  const answeredCount = Object.values(answers).filter((a) => getAnswerText(a).trim()).length;

  const cardRefs = useRef([]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e) {
      // Don't intercept when typing in a textarea/input
      const tag = document.activeElement?.tagName;
      const isTyping = tag === 'TEXTAREA' || tag === 'INPUT';

      // Escape: collapse card or close overlay
      if (e.key === 'Escape') {
        if (showAddQuestion) {
          setShowAddQuestion(false);
          return;
        }
        if (activeView !== 'today') {
          navigateTo('today');
          return;
        }
        if (expandedIndex !== null) {
          setExpandedIndex(null);
          return;
        }
        return;
      }

      // Skip card navigation when typing or overlay is open
      if (isTyping || activeView !== 'today') return;

      // Arrow Down / j → next card
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        if (expandedIndex === null) {
          setExpandedIndex(0);
        } else {
          const next = Math.min(expandedIndex + 1, 9);
          setExpandedIndex(next);
        }
        return;
      }

      // Arrow Up / k → prev card
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        if (expandedIndex === null) {
          setExpandedIndex(9);
        } else {
          const prev = Math.max(expandedIndex - 1, 0);
          setExpandedIndex(prev);
        }
        return;
      }

      // Enter → expand first card when none expanded
      if (e.key === 'Enter' && expandedIndex === null) {
        e.preventDefault();
        setExpandedIndex(0);
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, expandedIndex, showAddQuestion]);

  return (
    <>
      {/* Today view — always mounted, hidden when overlay is active */}
      <div style={{ display: activeView === 'today' ? 'block' : 'none' }}>
        <div className="min-h-screen bg-warm-50 dark:bg-warm-900 transition-colors duration-300">
          <div className="max-w-xl mx-auto px-4 py-6 sm:py-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-warm-900 dark:text-warm-100 tracking-tight">
                  Daily 10
                </h1>
                <p className="text-xs text-warm-500 dark:text-warm-400 mt-0.5">
                  {formatDisplayDate(dateKey)}
                  {!isToday && (
                    <button
                      onClick={goToToday}
                      className="ml-2 text-warm-600 dark:text-warm-300 underline underline-offset-2 hover:text-warm-800 dark:hover:text-warm-100 cursor-pointer"
                    >
                      Back to today
                    </button>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {!vaultAvailable && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 mr-1" title="Vault offline — using local cache">
                    vault offline
                  </span>
                )}
                {vaultAvailable && !vaultSyncOk && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 mr-1" title="Last vault write failed — answers saved locally">
                    sync failed
                  </span>
                )}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 text-warm-400 hover:text-warm-600 dark:text-warm-500 dark:hover:text-warm-300 rounded-lg transition-colors cursor-pointer"
                  title={darkMode ? 'Light mode' : 'Dark mode'}
                >
                  {darkMode ? (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setShowAddQuestion(true)}
                  className="p-2 text-warm-400 hover:text-warm-600 dark:text-warm-500 dark:hover:text-warm-300 rounded-lg transition-colors cursor-pointer"
                  title="Add question"
                >
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Progress */}
            <ProgressBar answered={answeredCount} total={10} dateKey={dateKey} />

            {/* Question Cards */}
            <div className="space-y-3 mb-8">
              {questions.map((q, idx) => (
                <QuestionCard
                  key={`${dateKey}-${idx}`}
                  ref={(el) => (cardRefs.current[idx] = el)}
                  index={idx}
                  question={q.question}
                  category={q.category}
                  answer={getAnswerText(answers[idx])}
                  onSave={handleSave}
                  dateKey={dateKey}
                  isExpanded={expandedIndex === idx}
                  onToggle={handleToggle}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex flex-wrap items-center gap-2 pb-8">
              <ExportButton questions={questions} answers={answers} dateKey={dateKey} />
              <button
                onClick={() => navigateTo('history')}
                className="text-sm text-warm-500 dark:text-warm-400 hover:text-warm-700 dark:hover:text-warm-200 px-3 py-2 transition-colors cursor-pointer"
              >
                History
              </button>
              <button
                onClick={() => navigateTo('flagged')}
                className="text-sm text-warm-500 dark:text-warm-400 hover:text-warm-700 dark:hover:text-warm-200 px-3 py-2 transition-colors cursor-pointer"
              >
                Flagged
              </button>
              <button
                onClick={() => navigateTo('digest')}
                className="text-sm text-warm-500 dark:text-warm-400 hover:text-warm-700 dark:hover:text-warm-200 px-3 py-2 transition-colors cursor-pointer"
              >
                Weekly Digest
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary views as overlays */}
      {activeView === 'history' && (
        <div className="fixed inset-0 z-40 bg-warm-50 dark:bg-warm-900 overflow-y-auto">
          <HistoryView
            onSelectDate={(key) => { setDateKey(key); navigateTo('today'); }}
            onClose={() => navigateTo('today')}
          />
        </div>
      )}

      {activeView === 'flagged' && (
        <div className="fixed inset-0 z-40 bg-warm-50 dark:bg-warm-900 overflow-y-auto">
          <FlaggedView onClose={() => navigateTo('today')} />
        </div>
      )}

      {activeView === 'digest' && (
        <div className="fixed inset-0 z-40 bg-warm-50 dark:bg-warm-900 overflow-y-auto">
          <WeeklyDigest onClose={() => navigateTo('today')} />
        </div>
      )}

      {/* Add Question modal */}
      {showAddQuestion && (
        <AddQuestion
          onClose={() => setShowAddQuestion(false)}
          onAdded={vaultAvailable ? reloadFromVault : () => loadDay(dateKey)}
          vaultAvailable={vaultAvailable}
        />
      )}
    </>
  );
}
