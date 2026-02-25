---
phase: 6
plan: "02"
title: "Markdown preview in AnswerForm"
wave: 1
depends_on: []
requirements: ["ONBR-03"]
files_modified:
  - "src/components/AnswerForm.jsx"
autonomous: true
estimated_tasks: 2
---

# Plan 02: Markdown preview in AnswerForm

## Objective

Add a Write/Preview toggle to the answer composition form so experts can see how their Markdown will render before submitting. Uses the same `react-markdown` library and styling already used in AnswerCard.

## must_haves

- Toggle between Write and Preview modes in AnswerForm (ONBR-03)
- Preview renders Markdown identically to published AnswerCard (same classes)
- Toggle does not lose draft content when switching modes
- Draft auto-save continues to work in both modes
- Word count remains visible in both modes
- Mobile-friendly: tabs not side-by-side split

## Tasks

<task id="1" title="Extract shared Markdown styles constant">
The Markdown rendering styles are duplicated in `AnswerCard.jsx` (line 37) and `expert/[handle]/page.jsx` (line 187). Extract them to a shared constant so AnswerForm can reuse the exact same styling.

Create a small utility or just define the constant inline in AnswerForm. The simplest approach: define the className string as a constant at the top of AnswerForm.jsx:

```javascript
const MARKDOWN_STYLES = "text-warm-800 leading-relaxed [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_a]:text-warm-700 [&_a]:underline [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_li]:mb-1"
```

Alternatively, create `src/lib/markdown-styles.js` and export from there, then update AnswerCard and expert profile page to import from it. This is the cleaner approach but touches more files. Either approach works — choose based on preference for DRY vs. minimizing file changes.
</task>

<task id="2" title="Add Write/Preview toggle to AnswerForm">
Update `src/components/AnswerForm.jsx`:

1. Add `showPreview` state (default: false)
2. Add tab buttons above the textarea: "Write" and "Preview"
3. When "Write" is active: show textarea (existing behavior)
4. When "Preview" is active: show ReactMarkdown rendering of content
5. Keep word count and draft status visible in both modes
6. Import ReactMarkdown

```jsx
import ReactMarkdown from 'react-markdown'

// Inside the component:
const [showPreview, setShowPreview] = useState(false)

// In the JSX, replace the standalone textarea with:
<div className="border border-warm-200 rounded-lg overflow-hidden">
  {/* Tabs */}
  <div className="flex border-b border-warm-200 bg-warm-50">
    <button
      type="button"
      onClick={() => setShowPreview(false)}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        !showPreview
          ? 'text-warm-900 bg-white border-b-2 border-warm-800'
          : 'text-warm-500 hover:text-warm-700'
      }`}
    >
      Write
    </button>
    <button
      type="button"
      onClick={() => setShowPreview(true)}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        showPreview
          ? 'text-warm-900 bg-white border-b-2 border-warm-800'
          : 'text-warm-500 hover:text-warm-700'
      }`}
    >
      Preview
    </button>
  </div>

  {/* Content area */}
  {showPreview ? (
    <div className="min-h-[156px] px-3 py-2">
      {content ? (
        <div className={MARKDOWN_STYLES}>
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-warm-400 text-sm py-2">
          Nothing to preview yet.
        </p>
      )}
    </div>
  ) : (
    <textarea
      name="body"
      value={content}
      onChange={(e) => setContent(e.target.value)}
      placeholder="Share your perspective... (Markdown supported)"
      rows={6}
      required
      minLength={10}
      className="w-full px-3 py-2 text-warm-900 placeholder:text-warm-400 focus:outline-none resize-y border-0"
    />
  )}
</div>
```

Key details:
- The textarea loses its own border (the outer div handles it)
- `min-h-[156px]` matches the 6-row textarea height (6 × 24px + padding)
- Preview renders in the same container, same padding
- Hidden textarea still holds the form data (name="body") — when preview is active, add a hidden input:
  ```jsx
  {showPreview && <input type="hidden" name="body" value={content} />}
  ```
  Actually simpler: always render the textarea but hide it when previewing. This preserves the form data without a hidden input:
  ```jsx
  <textarea
    name="body"
    value={content}
    onChange={(e) => setContent(e.target.value)}
    {...(showPreview ? { className: 'sr-only', tabIndex: -1 } : {
      placeholder: "Share your perspective... (Markdown supported)",
      rows: 6,
      required: true,
      minLength: 10,
      className: "w-full px-3 py-2 text-warm-900 placeholder:text-warm-400 focus:outline-none resize-y border-0"
    })}
  />
  ```

  Better approach: always render textarea (visible or sr-only) + conditionally render preview div. This avoids any form data issues.

- Update the placeholder to mention Markdown: "Share your perspective... (Markdown supported)"
- Draft auto-save and word count work unchanged (they read from `content` state, not the DOM)
</task>

## Verification

- [ ] AnswerForm shows Write/Preview tabs
- [ ] Write tab shows textarea with draft auto-save working
- [ ] Preview tab renders Markdown (bold, links, lists) with same styling as published answers
- [ ] Switching between tabs preserves content
- [ ] Empty preview shows "Nothing to preview yet" placeholder
- [ ] Word count visible in both modes
- [ ] Form submission works from both Write and Preview modes
- [ ] Draft auto-save continues to work
- [ ] Placeholder text mentions Markdown support
- [ ] `npm run build` succeeds
