'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function NavLink({ href, children, className = '' }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={`text-sm transition-colors ${
        isActive
          ? 'text-warm-900 font-medium'
          : 'text-warm-500 hover:text-warm-900'
      } ${className}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}
