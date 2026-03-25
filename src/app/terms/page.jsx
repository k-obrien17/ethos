export const revalidate = 86400

export const metadata = {
  title: 'Terms of Service',
  description: 'Credo terms of service.',
}

export default function TermsPage() {
  return (
    <article className="[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-warm-900 [&_h1]:mb-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-warm-800 [&_h2]:mt-6 [&_h2]:mb-3 [&_p]:text-warm-700 [&_p]:mb-4 [&_p]:leading-relaxed [&_em]:text-warm-500">
      <h1>Terms of Service</h1>
      <p><em>Last updated: February 2026</em></p>

      <h2>The service</h2>
      <p>
        Credo is a platform where experts answer curated questions to build a public
        record of their thinking. By using Credo, you agree to these terms.
      </p>

      <h2>Your content</h2>
      <p>
        You retain ownership of your answers. By posting on Credo, you grant us a
        non-exclusive license to display your content publicly on the platform.
      </p>

      <h2>Conduct</h2>
      <p>
        Answers must be authentic and your own. Automated, AI-generated, or spam
        answers may be removed without notice. We reserve the right to moderate
        content that violates these standards.
      </p>

      <h2>Account termination</h2>
      <p>
        You may delete your account at any time from your dashboard. We may also
        remove content or suspend accounts that violate these terms.
      </p>

      <h2>Disclaimers</h2>
      <p>
        Credo is provided as-is during beta. We make no guarantees about uptime,
        data availability, or continued operation of the service. Use at your own
        discretion.
      </p>
    </article>
  )
}
