import { useState, useRef, useEffect, useCallback, forwardRef, memo } from 'react';
import { isFlagged, toggleFlagged, getDraft, saveDraft, clearDraft } from '../utils/storage';

const QuestionCard = forwardRef(function QuestionCard({
  index,
  question,
  category,
  answer,
  onSave,
  dateKey,
  isExpanded,
  onToggle,
}, ref) {
  const [text, setText] = useState(() => {
    const draft = getDraft(dateKey, index);
    return draft || answer || '';
  });
  const [flagged, setFlagged] = useState(false);
  const textareaRef = useRef(null);
  const cardElRef = useRef(null);
  const draftTimerRef = useRef(null);
  const saved = answer && answer.trim().length > 0;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  useEffect(() => {
    const draft = getDraft(dateKey, index);
    setText(draft || answer || '');
  }, [answer, dateKey, index]);

  const debounceSaveDraft = useCallback((value) => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      saveDraft(dateKey, index, value);
    }, 300);
  }, [dateKey, index]);

  useEffect(() => {
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setFlagged(isFlagged(dateKey, index));
  }, [dateKey, index]);

  function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 96) + 'px'; // 96px ≈ 4 rows
  }

  useEffect(() => {
    if (isExpanded) {
      if (textareaRef.current) {
        textareaRef.current.focus();
        autoGrow(textareaRef.current);
      }
      if (cardElRef.current) {
        cardElRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [isExpanded]);

  function handleSave() {
    if (text.trim()) {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      clearDraft(dateKey, index);
      onSave(index, text);
    }
  }

  function handleFlag(e) {
    e.stopPropagation();
    if (!saved) return;
    const updated = toggleFlagged(dateKey, index);
    setFlagged(updated.includes(`${dateKey}:${index}`));
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
      onToggle(index);
    }
  }

  return (
    <div
      ref={(el) => {
        cardElRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
      className={`bg-white dark:bg-warm-800 rounded-lg border transition-all duration-200 ${
        isExpanded
          ? 'border-warm-300 dark:border-warm-600 shadow-sm'
          : 'border-warm-200 dark:border-warm-700'
      }`}
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: isExpanded || saved ? category.color : 'transparent',
      }}
    >
      <button
        onClick={() => onToggle(index)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 cursor-pointer"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `${category.color}15`,
                color: category.color,
              }}
            >
              {category.name}
            </span>
            {saved && (
              <svg
                className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
          </div>
          <p className={`text-sm leading-relaxed ${saved && !isExpanded ? 'text-warm-500 dark:text-warm-400' : 'text-warm-900 dark:text-warm-100'}`}>
            {question}
          </p>
          {saved && !isExpanded && (
            <p className="text-xs text-warm-400 dark:text-warm-500 mt-1 truncate">{answer}</p>
          )}
        </div>
        {saved && (
          <button
            onClick={handleFlag}
            className={`shrink-0 mt-1 p-1 rounded transition-colors ${
              flagged
                ? 'text-amber-500'
                : 'text-warm-300 dark:text-warm-600 hover:text-amber-400'
            }`}
            title={flagged ? 'Unflag' : 'Flag for content'}
          >
            <svg className="w-4 h-4" fill={flagged ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
            </svg>
          </button>
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              autoGrow(e.target);
              debounceSaveDraft(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Say what you think. Don't overthink it."
            className="w-full resize-none rounded-md border border-warm-200 dark:border-warm-600 bg-warm-50 dark:bg-warm-900 text-warm-900 dark:text-warm-100 text-sm leading-relaxed p-3 placeholder:text-warm-400 dark:placeholder:text-warm-500 focus:border-warm-400 dark:focus:border-warm-500 transition-colors"
            style={{ minHeight: '96px' }}
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-warm-400 dark:text-warm-500">
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => onToggle(index)}
                className="text-xs text-warm-500 dark:text-warm-400 hover:text-warm-700 dark:hover:text-warm-200 px-3 py-1.5 rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!text.trim()}
                className="text-xs font-medium text-white bg-warm-800 dark:bg-warm-200 dark:text-warm-900 hover:bg-warm-700 dark:hover:bg-warm-300 disabled:opacity-30 disabled:cursor-not-allowed px-4 py-1.5 rounded transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default memo(QuestionCard);
