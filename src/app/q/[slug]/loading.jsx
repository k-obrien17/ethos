function Skeleton({ className }) {
  return <div className={`animate-pulse bg-warm-200 rounded ${className}`} />
}

export default function QuestionLoading() {
  return (
    <div className="space-y-8">
      {/* Question skeleton */}
      <section>
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-8 w-full mb-2" />
        <Skeleton className="h-8 w-3/4 mb-3" />
        <Skeleton className="h-4 w-40" />
      </section>

      {/* Answer form skeleton */}
      <div className="bg-white rounded-lg border border-warm-200 p-6">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>

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
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}
