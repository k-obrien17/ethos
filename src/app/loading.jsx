function Skeleton({ className }) {
  return <div className={`animate-pulse bg-warm-200 rounded ${className}`} />
}

export default function HomeLoading() {
  return (
    <div className="space-y-8">
      {/* Today's question skeleton */}
      <section>
        <Skeleton className="h-3 w-28 mb-2" />
        <div className="p-6 bg-white rounded-lg border-2 border-warm-300">
          <Skeleton className="h-3 w-20 mb-3" />
          <Skeleton className="h-7 w-full mb-2" />
          <Skeleton className="h-7 w-3/4 mb-3" />
          <Skeleton className="h-4 w-32" />
        </div>
      </section>

      {/* Answer skeletons */}
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-lg border border-warm-200 p-5">
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
          </div>
        ))}
      </div>

      {/* Recent questions skeleton */}
      <section>
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-white rounded-lg border border-warm-200">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-5 w-full mb-1" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
