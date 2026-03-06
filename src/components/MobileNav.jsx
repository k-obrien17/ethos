'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function MobileNav({ isAuthenticated }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-warm-500 hover:text-warm-900"
        aria-label="Toggle menu"
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full bg-white border-b border-warm-200 z-50 px-4 py-3 space-y-1">
          <Link href="/topics" onClick={() => setOpen(false)} className="block py-2 text-sm text-warm-600 hover:text-warm-900">
            Topics
          </Link>
          <Link href="/questions" onClick={() => setOpen(false)} className="block py-2 text-sm text-warm-600 hover:text-warm-900">
            Archive
          </Link>
          <Link href="/trending" onClick={() => setOpen(false)} className="block py-2 text-sm text-warm-600 hover:text-warm-900">
            Trending
          </Link>
          <Link href="/leaderboard" onClick={() => setOpen(false)} className="block py-2 text-sm text-warm-600 hover:text-warm-900">
            Leaderboard
          </Link>
          {isAuthenticated && (
            <>
              <Link href="/following" onClick={() => setOpen(false)} className="block py-2 text-sm text-warm-600 hover:text-warm-900">
                Following
              </Link>
              <Link href="/dashboard" onClick={() => setOpen(false)} className="block py-2 text-sm text-warm-600 hover:text-warm-900">
                Dashboard
              </Link>
            </>
          )}
          {!isAuthenticated && (
            <Link href="/login" onClick={() => setOpen(false)} className="block py-2 text-sm font-medium text-accent-600">
              Sign in
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
