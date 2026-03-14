function Skeleton({ className }) {
  return <div className={`animate-pulse bg-warm-200 rounded ${className}`} />
}

export default function ExpertsLoading() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-28 mt-2" />
      </div>

      {/* Sort + filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Skeleton className="h-3 w-8" />
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-md" />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="h-3 w-10" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-md" />
          ))}
        </div>
      </div>

      {/* Expert cards list */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex items-start gap-4 p-4 bg-white rounded-lg border border-warm-200"
          >
            {/* Avatar */}
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />

            {/* Info */}
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-32 mb-1.5" />
              <Skeleton className="h-3 w-48" />
              <div className="flex gap-1.5 mt-2">
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-6 w-16 rounded-md" />
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {[1, 2, 3].map((j) => (
                <div key={j} className="text-center">
                  <Skeleton className="h-5 w-8 mx-auto mb-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
