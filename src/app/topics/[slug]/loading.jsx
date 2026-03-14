function Skeleton({ className }) {
  return <div className={`animate-pulse bg-warm-200 rounded ${className}`} />
}

export default function TopicDetailLoading() {
  return (
    <div>
      {/* Topic header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Skeleton className="h-7 w-48 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-2/3 mb-2" />
            <div className="flex items-center gap-3 mt-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-4" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-9 w-24 rounded-full flex-shrink-0" />
        </div>
      </div>

      {/* Question cards */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="py-5">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-full mb-1" />
            <Skeleton className="h-5 w-2/3 mb-2" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
