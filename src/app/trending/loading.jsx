function Skeleton({ className }) {
  return <div className={`animate-pulse bg-warm-200 rounded ${className}`} />
}

export default function TrendingLoading() {
  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      {/* Trending answer cards */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-warm-200 p-5"
          >
            <div className="flex items-start gap-3 mb-3">
              {/* Rank number */}
              <Skeleton className="h-6 w-6 flex-shrink-0 mt-0.5" />

              <div className="min-w-0 flex-1">
                {/* Category + question */}
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-4 w-full mb-2" />

                {/* Expert */}
                <div className="flex items-center gap-2 mb-3">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-32 hidden sm:block" />
                </div>

                {/* Answer preview */}
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-3/4" />

                {/* Footer stats */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-warm-100">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-10" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
