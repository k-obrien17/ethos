function Skeleton({ className }) {
  return <div className={`animate-pulse bg-warm-200 rounded ${className}`} />
}

export default function ExpertProfileLoading() {
  return (
    <div className="space-y-8">
      {/* Profile header */}
      <section className="flex items-start gap-4">
        <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-7 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-1" />
          <Skeleton className="h-3 w-40 mb-2" />
          <div className="flex items-center gap-3 mt-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center gap-3 mt-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </section>

      {/* Bio */}
      <section>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </section>

      {/* Expertise tags */}
      <section>
        <Skeleton className="h-5 w-24 mb-3" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-md" />
          ))}
        </div>
      </section>

      {/* Stats grid */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-warm-200 p-4 text-center"
          >
            <Skeleton className="h-7 w-12 mx-auto mb-2" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </section>

      {/* Answers section */}
      <section>
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="divide-y divide-warm-100">
          {[1, 2, 3].map((i) => (
            <div key={i} className="py-6">
              <div className="flex items-center gap-2 mb-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-full mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
