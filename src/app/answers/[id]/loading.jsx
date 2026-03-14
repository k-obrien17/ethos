function Skeleton({ className }) {
  return <div className={`animate-pulse bg-warm-200 rounded ${className}`} />
}

export default function AnswerDetailLoading() {
  return (
    <div className="space-y-8">
      {/* Back link */}
      <Skeleton className="h-4 w-32" />

      {/* Question context */}
      <div className="p-4 bg-warm-100 rounded-lg">
        <Skeleton className="h-3 w-32 mb-2" />
        <Skeleton className="h-6 w-full mb-1" />
        <Skeleton className="h-6 w-3/4" />
        <div className="flex gap-1.5 mt-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>

      {/* Answer card */}
      <div className="bg-white rounded-lg border border-warm-200 p-5">
        {/* Expert header */}
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-4 w-28 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>

        {/* Answer body */}
        <div className="space-y-2 mb-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-3 pt-3 border-t border-warm-100">
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>

      {/* Share bar */}
      <div className="flex justify-center">
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>

      {/* More from this expert */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="divide-y divide-warm-100">
          {[1, 2].map((i) => (
            <div key={i} className="py-3">
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-2/3" />
              <div className="flex items-center gap-3 mt-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Other perspectives */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="divide-y divide-warm-100">
          {[1, 2].map((i) => (
            <div key={i} className="py-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="h-4 w-28" />
              </div>
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
