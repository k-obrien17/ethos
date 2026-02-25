import { Inter } from 'next/font/google'
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
    default: 'Ethos',
    template: '%s — Ethos',
  },
  description: 'What you choose to answer reveals what you stand for.',
  openGraph: {
    type: 'website',
    siteName: 'Ethos',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-warm-50 text-warm-900 antialiased min-h-screen">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
