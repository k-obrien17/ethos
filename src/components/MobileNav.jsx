'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import BudgetIndicator from '@/components/BudgetIndicator'

function MobileNavLink({ href, onClick, children }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block py-2 text-sm transition-colors ${
        isActive
          ? 'text-warm-900 font-medium border-l-2 border-accent-600 pl-3'
          : 'text-warm-600 hover:text-warm-900 pl-3'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}

export default function MobileNav({ isAuthenticated, budgetData }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 text-warm-500 hover:text-warm-900"
        aria-label="Toggle navigation menu"
        aria-expanded={open}
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
        <nav role="dialog" aria-label="Navigation menu" className="absolute left-0 right-0 top-full bg-white border-b border-warm-200 z-50 px-4 py-3 space-y-1">
          <MobileNavLink href="/topics" onClick={close}>Topics</MobileNavLink>
          <MobileNavLink href="/questions" onClick={close}>Archive</MobileNavLink>
          <MobileNavLink href="/trending" onClick={close}>Trending</MobileNavLink>
          <MobileNavLink href="/leaderboard" onClick={close}>Leaderboard</MobileNavLink>
          <MobileNavLink href="/experts" onClick={close}>Experts</MobileNavLink>
          {isAuthenticated && (
            <>
              <MobileNavLink href="/following" onClick={close}>Following</MobileNavLink>
              <MobileNavLink href="/dashboard" onClick={close}>Dashboard</MobileNavLink>
              {budgetData && (
                <div className="py-2 border-t border-warm-100 mt-1 pt-2">
                  <BudgetIndicator used={budgetData.used} limit={budgetData.limit} />
                </div>
              )}
            </>
          )}
          {!isAuthenticated && (
            <Link href="/login" onClick={close} className="block py-2 text-sm font-medium text-accent-600 pl-3">
              Sign in
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
