import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import EditProfileForm from '@/components/EditProfileForm'
import VerifyEmailBanner from '@/components/VerifyEmailBanner'

export const metadata = {
  title: 'Welcome',
}

export default async function WelcomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // If profile is already complete, redirect to homepage
  if (profile?.headline) redirect('/')

  // Fetch today's question for the final step
  const today = new Date().toISOString().slice(0, 10)
  const { data: todayQuestion } = await supabase
    .from('questions')
    .select('slug, body')
    .lte('publish_date', today)
    .in('status', ['scheduled', 'published'])
    .order('publish_date', { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <section className="text-center py-4">
        <h1 className="text-2xl font-bold text-warm-900">
          Welcome to Ethos
        </h1>
        <p className="text-warm-600 mt-2">
          What you choose to answer reveals what you stand for.
        </p>
      </section>

      {/* How it works */}
      <section className="bg-warm-50 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-warm-800 mb-3">How Ethos works</h2>
        <div className="space-y-3 text-sm text-warm-600">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-600 text-white flex items-center justify-center text-xs font-bold">1</span>
            <p>One curated question is published every day.</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-600 text-white flex items-center justify-center text-xs font-bold">2</span>
            <p>You have a limited number of answers per month. Choose which questions matter to you.</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-600 text-white flex items-center justify-center text-xs font-bold">3</span>
            <p>All answers must be human-written. AI-generated content is detected and blocked.</p>
          </div>
        </div>
      </section>

      {/* Email verification */}
      {!profile?.email_verified_at && (
        <section>
          <h2 className="text-sm font-semibold text-warm-800 mb-2">Step 1: Verify your email</h2>
          <VerifyEmailBanner />
        </section>
      )}

      {/* Profile setup */}
      <section>
        <h2 className="text-sm font-semibold text-warm-800 mb-2">
          {!profile?.email_verified_at ? 'Step 2' : 'Step 1'}: Complete your profile
        </h2>
        <div className="bg-white rounded-lg border border-warm-200 p-6">
          <EditProfileForm profile={profile} redirectTo="/" />
        </div>
      </section>

      {/* Today's question teaser */}
      {todayQuestion && (
        <section className="text-center py-2">
          <p className="text-sm text-warm-500">
            Today&apos;s question is waiting:
          </p>
          <p className="text-warm-800 font-medium mt-1">
            &ldquo;{todayQuestion.body}&rdquo;
          </p>
        </section>
      )}
    </div>
  )
}
