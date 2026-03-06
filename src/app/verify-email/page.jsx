import Link from 'next/link'

export const metadata = { title: 'Email Verification' }

export default async function VerifyEmailPage({ searchParams }) {
  const params = await searchParams
  const success = params.success === 'true'
  const already = params.already === 'true'
  const error = params.error === 'invalid'

  return (
    <div className="text-center py-16 space-y-4">
      {success && (
        <>
          <div className="text-4xl">✓</div>
          <h1 className="text-2xl font-bold text-warm-900">Email verified</h1>
          <p className="text-warm-600">
            Your email has been verified. You can now submit answers on Ethos.
          </p>
        </>
      )}

      {already && (
        <>
          <h1 className="text-2xl font-bold text-warm-900">Already verified</h1>
          <p className="text-warm-600">
            Your email was already verified. You&apos;re all set.
          </p>
        </>
      )}

      {error && (
        <>
          <h1 className="text-2xl font-bold text-warm-900">Invalid link</h1>
          <p className="text-warm-600">
            This verification link is invalid or expired. Try requesting a new one from your dashboard.
          </p>
        </>
      )}

      <div className="pt-4">
        <Link
          href="/"
          className="px-4 py-2 bg-warm-800 text-warm-50 rounded-lg text-sm font-medium hover:bg-warm-900 transition-colors"
        >
          Go to Ethos
        </Link>
      </div>
    </div>
  )
}
