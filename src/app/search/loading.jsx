function Skeleton({ className }) {
  return <div className={`animate-pulse bg-warm-200 rounded ${className}`} />
}

export default function SearchLoading() {
  return (
    <div>
      {/* Search input skeleton */}
      <Skeleton className="h-12 w-full rounded-lg mb-6" />

      {/* Results skeleton */}
      <Skeleton className="h-7 w-48 mb-2" />
      <Skeleton className="h-4 w-24 mb-6" />

      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-white rounded-lg border border-warm-200">
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-5 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}
