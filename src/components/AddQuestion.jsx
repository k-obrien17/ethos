import { useState } from 'react';
import { CATEGORIES } from '../data/questions';
import { addCustomQuestion } from '../utils/storage';
import { saveQuestionToVault } from '../utils/vaultSync';

export default function AddQuestion({ onClose, onAdded, vaultAvailable }) {
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [question, setQuestion] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!question.trim() || saving) return;
    setSaving(true);

    try {
      // Always write to localStorage cache
      addCustomQuestion(categoryId, question.trim());

      // Write to vault if available
      if (vaultAvailable) {
        await saveQuestionToVault(categoryId, question.trim());
      }

      if (onAdded) await onAdded();
      onClose();
    } catch {
      // Vault write failed — localStorage was already written
      if (onAdded) await onAdded();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-warm-800 w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-warm-900 dark:text-warm-100">Add Question</h2>
          <button onClick={onClose} className="text-warm-400 hover:text-warm-600 dark:hover:text-warm-200 cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-warm-600 dark:text-warm-400 mb-1.5">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full border border-warm-200 dark:border-warm-600 bg-white dark:bg-warm-900 text-warm-900 dark:text-warm-100 rounded-md px-3 py-2 text-sm"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-warm-600 dark:text-warm-400 mb-1.5">Question</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What's the question that just hit you?"
            rows={3}
            className="w-full resize-none border border-warm-200 dark:border-warm-600 bg-warm-50 dark:bg-warm-900 text-warm-900 dark:text-warm-100 rounded-md px-3 py-2 text-sm placeholder:text-warm-400 dark:placeholder:text-warm-500 focus:border-warm-400 dark:focus:border-warm-500 transition-colors"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-sm text-warm-500 dark:text-warm-400 hover:text-warm-700 dark:hover:text-warm-200 px-4 py-2 rounded transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!question.trim() || saving}
            className="text-sm font-medium text-white bg-warm-800 dark:bg-warm-200 dark:text-warm-900 hover:bg-warm-700 dark:hover:bg-warm-300 disabled:opacity-30 disabled:cursor-not-allowed px-4 py-2 rounded transition-colors cursor-pointer"
          >
            {saving ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
