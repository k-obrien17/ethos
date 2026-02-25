import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EditProfileForm from '@/components/EditProfileForm'

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

  return (
    <div className="space-y-6">
      <section className="text-center py-4">
        <h1 className="text-2xl font-bold text-warm-900">
          Welcome to Ethos
        </h1>
        <p className="text-warm-600 mt-2 max-w-md mx-auto">
          Complete your profile so other experts know who you are.
          You can always update this later from your dashboard.
        </p>
      </section>

      <section className="bg-white rounded-lg border border-warm-200 p-6">
        <EditProfileForm profile={profile} redirectTo="/" />
      </section>
    </div>
  )
}
