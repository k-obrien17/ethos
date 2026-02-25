import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Ethos',
  description: 'What you choose to answer reveals what you stand for.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-warm-50 text-warm-900 antialiased min-h-screen">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
