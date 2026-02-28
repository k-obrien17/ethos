import Link from 'next/link'

const TYPE_STYLES = {
  question: 'bg-blue-100 text-blue-700',
  answer: 'bg-green-100 text-green-700',
  expert: 'bg-purple-100 text-purple-700',
}

const TYPE_LABELS = {
  question: 'Question',
  answer: 'Answer',
  expert: 'Expert',
}

export default function SearchResultCard({ result }) {
  return (
    <article className="bg-white rounded-lg border border-warm-200 p-5">
      <div className="flex items-start gap-3">
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
            TYPE_STYLES[result.result_type] || 'bg-warm-100 text-warm-600'
          }`}
        >
          {TYPE_LABELS[result.result_type] || result.result_type}
        </span>

        <div className="min-w-0 flex-1">
          <Link
            href={result.url}
            className="font-semibold text-warm-900 hover:underline line-clamp-2"
          >
            {result.title}
          </Link>

          <p
            className="text-sm text-warm-600 mt-1 line-clamp-2"
            dangerouslySetInnerHTML={{ __html: result.snippet }}
          />

          <div className="flex items-center gap-2 mt-2 text-xs text-warm-400">
            {result.author_name && result.result_type === 'answer' && (
              <>
                <Link
                  href={`/expert/${result.author_handle}`}
                  className="hover:text-warm-600"
                >
                  {result.author_name}
                </Link>
                <span>·</span>
              </>
            )}
            {result.result_type === 'expert' && result.author_handle && (
              <>
                <span>@{result.author_handle}</span>
                <span>·</span>
              </>
            )}
            {result.published_date && (
              <span>
                {new Date(result.published_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
            {result.topic_names?.length > 0 && (
              <>
                <span>·</span>
                {result.topic_names.map((name, i) => (
                  <span key={i} className="text-warm-500">
                    {name}
                  </span>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
