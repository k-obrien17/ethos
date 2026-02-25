import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <h1 className="text-2xl font-bold text-warm-900 mb-4">
        Authentication Error
      </h1>
      <p className="text-warm-600 mb-6">
        Something went wrong during sign in. Please try again.
      </p>
      <Link
        href="/login"
        className="text-warm-700 underline hover:text-warm-900"
      >
        Back to login
      </Link>
    </div>
  )
}
