import Link from 'next/link'

export const metadata = {
  title: 'Join Ethos — Expert Recruitment',
  description: 'Join Ethos as a vetted expert. Share your expertise, build your reputation, and fuel the next generation of AI with authentic human insight.',
}

export default function JoinPage() {
  return (
    <div className="space-y-12 py-8">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-warm-900 leading-tight tracking-tight">
          Your expertise deserves a better platform
        </h1>
        <p className="text-warm-500 mt-4 max-w-xl mx-auto text-lg leading-relaxed">
          Ethos is an invite-only Q&amp;A platform where vetted experts answer one curated question at a time.
          No noise. No algorithms. Just signal.
        </p>
      </section>

      {/* Value props */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-warm-200 p-6">
          <div className="text-2xl mb-3">&#x1F3AF;</div>
          <h3 className="font-semibold text-warm-900 mb-2">Deliberate, not reactive</h3>
          <p className="text-sm text-warm-500 leading-relaxed">
            You get a limited number of answers per month. Every response is a deliberate signal of what you care about and know deeply.
          </p>
        </div>
        <div className="bg-white rounded-lg border border-warm-200 p-6">
          <div className="text-2xl mb-3">&#x1F916;</div>
          <h3 className="font-semibold text-warm-900 mb-2">Fuel the AI layer</h3>
          <p className="text-sm text-warm-500 leading-relaxed">
            Your answers train LLMs to represent your perspective accurately. When someone asks AI about your domain, your voice is in the mix.
          </p>
        </div>
        <div className="bg-white rounded-lg border border-warm-200 p-6">
          <div className="text-2xl mb-3">&#x1F4C8;</div>
          <h3 className="font-semibold text-warm-900 mb-2">Compounding reputation</h3>
          <p className="text-sm text-warm-500 leading-relaxed">
            Likes, features, and community endorsement build your expert profile over time. Quality compounds.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-xl font-bold text-warm-900 mb-6 text-center">How it works</h2>
        <div className="space-y-4 max-w-lg mx-auto">
          <div className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-600 text-white flex items-center justify-center text-sm font-bold">1</span>
            <div>
              <p className="font-medium text-warm-900">Get invited</p>
              <p className="text-sm text-warm-500">Request access or receive an invite from an existing expert.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-600 text-white flex items-center justify-center text-sm font-bold">2</span>
            <div>
              <p className="font-medium text-warm-900">Answer what matters to you</p>
              <p className="text-sm text-warm-500">Each day features a curated question. Use your limited monthly budget on the ones in your wheelhouse.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-600 text-white flex items-center justify-center text-sm font-bold">3</span>
            <div>
              <p className="font-medium text-warm-900">Build your profile</p>
              <p className="text-sm text-warm-500">Your answers, expertise areas, and community engagement build a permanent record of your thought leadership.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-600 text-white flex items-center justify-center text-sm font-bold">4</span>
            <div>
              <p className="font-medium text-warm-900">Your perspective enters the AI layer</p>
              <p className="text-sm text-warm-500">Every answer is decomposed into claims, frameworks, and evidence — feeding AI models with authentic, attributed human expertise.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Who it&apos;s for */}
      <section className="bg-warm-50 rounded-lg border border-warm-200 p-8">
        <h2 className="text-xl font-bold text-warm-900 mb-4 text-center">Who we&apos;re looking for</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
          <div className="flex items-start gap-2">
            <span className="text-accent-600 mt-0.5">&#x2713;</span>
            <span className="text-sm text-warm-700">C-suite and VP-level leaders</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-accent-600 mt-0.5">&#x2713;</span>
            <span className="text-sm text-warm-700">Founders and operators</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-accent-600 mt-0.5">&#x2713;</span>
            <span className="text-sm text-warm-700">Subject matter experts</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-accent-600 mt-0.5">&#x2713;</span>
            <span className="text-sm text-warm-700">Industry thought leaders</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-accent-600 mt-0.5">&#x2713;</span>
            <span className="text-sm text-warm-700">People with strong, earned opinions</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-accent-600 mt-0.5">&#x2713;</span>
            <span className="text-sm text-warm-700">Anyone tired of performative LinkedIn</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center">
        <h2 className="text-xl font-bold text-warm-900 mb-3">Ready to join?</h2>
        <p className="text-warm-500 mb-6 text-sm">
          Ethos is invite-only during beta. If you have an invite code, sign up now. Otherwise, request access below.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/login"
            className="px-6 py-2.5 bg-accent-600 text-white rounded-md text-sm font-medium hover:bg-accent-700 transition-colors"
          >
            Sign up with invite code
          </Link>
          <a
            href="mailto:hello@ethos.today?subject=Ethos Access Request"
            className="px-6 py-2.5 bg-warm-100 text-warm-700 rounded-md text-sm font-medium hover:bg-warm-200 transition-colors"
          >
            Request access
          </a>
        </div>
      </section>
    </div>
  )
}
