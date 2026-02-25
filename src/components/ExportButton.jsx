import { useState } from 'react';
import { getAnswerText } from '../utils/storage';

export default function ExportButton({ questions, answers, dateKey }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const lines = [`# Daily 10 — ${dateKey}\n`];

    questions.forEach((q, idx) => {
      const text = getAnswerText(answers[idx]);
      lines.push(`## ${q.category.name}`);
      lines.push(`**${q.question}**\n`);
      if (text.trim()) {
        lines.push(text.trim());
      } else {
        lines.push('_No answer_');
      }
      lines.push('');
    });

    const markdown = lines.join('\n');
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const answeredCount = Object.values(answers).filter((a) => getAnswerText(a).trim()).length;
  if (answeredCount === 0) return null;

  return (
    <button
      onClick={handleCopy}
      className="text-sm font-medium text-warm-600 dark:text-warm-400 hover:text-warm-800 dark:hover:text-warm-200 border border-warm-300 dark:border-warm-600 rounded-md px-4 py-2 transition-colors cursor-pointer"
    >
      {copied ? 'Copied' : 'Copy All'}
    </button>
  );
}
