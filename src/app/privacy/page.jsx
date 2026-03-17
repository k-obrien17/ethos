export const revalidate = 86400

export const metadata = {
  title: 'Privacy Policy',
  description: 'Ethos privacy policy.',
}

export default function PrivacyPage() {
  return (
    <article className="[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-warm-900 [&_h1]:mb-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-warm-800 [&_h2]:mt-6 [&_h2]:mb-3 [&_p]:text-warm-700 [&_p]:mb-4 [&_p]:leading-relaxed [&_em]:text-warm-500">
      <h1>Privacy Policy</h1>
      <p><em>Last updated: February 2026</em></p>

      <h2>What we collect</h2>
      <p>
        When you sign in via Google or LinkedIn, we store your name, email address,
        and profile photo. When you answer questions, we store the text of your answers
        along with the date they were submitted.
      </p>

      <h2>How we use it</h2>
      <p>
        Your profile and answers are displayed publicly on Ethos. Your email address
        is used for authentication and is not displayed publicly or shared with third
        parties.
      </p>

      <h2>Data retention</h2>
      <p>
        Your data is retained as long as your account is active. You can delete your
        account at any time from your dashboard, which permanently removes your
        profile and all associated answers.
      </p>

      <h2>Third parties</h2>
      <p>
        We use Supabase for our database and authentication, Vercel for hosting,
        and Google and LinkedIn for sign-in. These services may process your data
        in accordance with their own privacy policies.
      </p>

      <h2>Contact</h2>
      <p>Questions about this policy? Reach out at privacy@ethos.example.com.</p>
    </article>
  )
}
