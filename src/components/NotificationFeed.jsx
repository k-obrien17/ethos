'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { markAllNotificationsRead } from '@/app/actions/notifications'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

const ICONS = {
  like: (
    <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
    </svg>
  ),
  comment: (
    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  featured: (
    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  ),
}

function getMessage(notif) {
  const actor = notif.actor?.display_name || 'Someone'
  switch (notif.type) {
    case 'like':
      return <><strong>{actor}</strong> liked your answer</>
    case 'comment':
      return <><strong>{actor}</strong> commented on your answer</>
    case 'featured':
      return <>Your answer was <strong>featured</strong> as an editorial pick</>
    default:
      return 'New notification'
  }
}

function getHref(notif) {
  if (notif.answer?.questions?.slug) {
    return `/q/${notif.answer.questions.slug}`
  }
  if (notif.answer?.id) {
    return `/answers/${notif.answer.id}`
  }
  return null
}

export default function NotificationFeed({ notifications }) {
  const [isPending, startTransition] = useTransition()
  const hasUnread = notifications.some(n => !n.read_at)

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsRead()
    })
  }

  if (notifications.length === 0) {
    return (
      <div className="p-8 text-center text-warm-500 text-sm">
        No notifications yet. When someone likes or comments on your answers, you'll see it here.
      </div>
    )
  }

  return (
    <div>
      {hasUnread && (
        <div className="px-4 py-3 border-b border-warm-200 flex justify-between items-center">
          <span className="text-sm text-warm-500">
            {notifications.filter(n => !n.read_at).length} unread
          </span>
          <button
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="text-sm text-warm-600 hover:text-warm-900 disabled:opacity-50"
          >
            {isPending ? 'Marking...' : 'Mark all as read'}
          </button>
        </div>
      )}
      <ul>
        {notifications.map(notif => {
          const href = getHref(notif)
          const content = (
            <div className={`flex items-start gap-3 px-4 py-3 border-b border-warm-100 last:border-b-0 transition-colors ${!notif.read_at ? 'bg-amber-50/50' : 'hover:bg-warm-50'}`}>
              <div className="mt-0.5 flex-shrink-0">
                {ICONS[notif.type] || ICONS.comment}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-warm-800">{getMessage(notif)}</p>
                {notif.body && (
                  <p className="text-xs text-warm-500 mt-0.5 truncate">&ldquo;{notif.body}&rdquo;</p>
                )}
                {notif.answer?.questions?.body && (
                  <p className="text-xs text-warm-400 mt-0.5 truncate">
                    on: {notif.answer.questions.body}
                  </p>
                )}
                <p className="text-xs text-warm-400 mt-1">{timeAgo(notif.created_at)}</p>
              </div>
              {!notif.read_at && (
                <div className="mt-1.5 w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
              )}
            </div>
          )

          return href ? (
            <li key={notif.id}>
              <Link href={href} className="block">{content}</Link>
            </li>
          ) : (
            <li key={notif.id}>{content}</li>
          )
        })}
      </ul>
    </div>
  )
}
