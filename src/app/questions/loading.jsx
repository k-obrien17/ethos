function Skeleton({ className }) {
  return <div className={`animate-pulse bg-warm-200 rounded ${className}`} />
}

export default function QuestionsLoading() {
  return (
    <div>
      {/* Page title */}
      <div className="mb-8">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>

      {/* Question list */}
      <div className="divide-y divide-warm-100">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="py-5">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-full mb-1" />
            <Skeleton className="h-5 w-2/3 mb-2" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
