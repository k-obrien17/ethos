import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="mt-16 py-6 border-t border-warm-200">
      <div className="max-w-2xl mx-auto px-4 flex items-center justify-between text-xs text-warm-400">
        <span>&copy; {new Date().getFullYear()} Ethos</span>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-warm-600">Privacy</Link>
          <Link href="/terms" className="hover:text-warm-600">Terms</Link>
        </div>
      </div>
    </footer>
  )
}
