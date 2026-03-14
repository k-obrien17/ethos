function Skeleton({ className }) {
  return <div className={`animate-pulse bg-warm-200 rounded ${className}`} />
}

export default function FollowingLoading() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Your Experts section */}
      <div>
        <Skeleton className="h-4 w-28 mb-3" />
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-warm-200 p-3 flex items-center gap-3"
            >
              <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="min-w-0">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent from your experts */}
      <Skeleton className="h-4 w-44" />

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            {/* Question context */}
            <Skeleton className="h-3 w-64 mb-1" />

            {/* Answer card */}
            <div className="bg-white rounded-lg border border-warm-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-28 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex items-center gap-3 mt-3 pt-2 border-t border-warm-100">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
