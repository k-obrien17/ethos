import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Credo',
    template: '%s — Credo',
  },
  description: 'What you choose to answer reveals what you stand for.',
  openGraph: {
    type: 'website',
    siteName: 'Credo',
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    canonical: './',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-warm-50 text-warm-900 antialiased min-h-screen">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Credo',
              url: process.env.NEXT_PUBLIC_SITE_URL || 'https://credo.vercel.app',
              description: 'Human-only thought leadership platform. One question per day, limited answers per month.',
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://credo.vercel.app'}/search?q={search_term_string}`,
                },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        <Header />
        <main id="main-content" className="mx-auto max-w-2xl px-4 py-10">
          {children}
        </main>
        <Footer />
        <Toaster position="bottom-right" richColors duration={3000} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
