function Skeleton({ className }) {
  return <div className={`animate-pulse bg-warm-200 rounded ${className}`} />
}

export default function TopicsLoading() {
  return (
    <div>
      {/* Page title */}
      <div className="mb-6">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-48 mt-2" />
      </div>

      {/* Topics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-warm-200 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-5 w-28 mb-2" />
                <Skeleton className="h-3 w-full mb-1" />
                <Skeleton className="h-3 w-2/3 mb-2" />
                <div className="flex items-center gap-3 mt-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-8 w-20 rounded-full flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
