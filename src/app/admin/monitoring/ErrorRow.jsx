'use client'

import { useState } from 'react'
import { format } from 'date-fns'

function SeverityBadge({ severity }) {
  const styles = {
    error: 'bg-red-100 text-red-700',
    warn: 'bg-amber-100 text-amber-700',
    info: 'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[severity] || 'bg-warm-100 text-warm-700'}`}>
      {severity}
    </span>
  )
}

export default function ErrorRow({ log }) {
  const [expanded, setExpanded] = useState(false)

  const truncatedMessage = log.message?.length > 80
    ? log.message.slice(0, 80) + '...'
    : log.message

  return (
    <>
      <tr
        className="hover:bg-warm-50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-2 text-warm-700 whitespace-nowrap">
          {log.timestamp ? format(new Date(log.timestamp), 'MMM d, HH:mm:ss') : '—'}
        </td>
        <td className="px-4 py-2">
          <SeverityBadge severity={log.severity} />
        </td>
        <td className="px-4 py-2 text-warm-700 font-mono text-xs">{log.route || '—'}</td>
        <td className="px-4 py-2 text-warm-700 text-xs">{log.method || '—'}</td>
        <td className="px-4 py-2 text-warm-900">
          <span className="flex items-center gap-1">
            <span className={`text-xs ${expanded ? 'rotate-90' : ''} transition-transform text-warm-400`}>
              &#9654;
            </span>
            {expanded ? log.message : truncatedMessage}
          </span>
        </td>
        <td className="px-4 py-2 text-warm-700 text-xs">{log.status_code || '—'}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-warm-50/50">
            <div className="space-y-3 max-w-full">
              {/* Full message */}
              <div>
                <p className="text-xs font-medium text-warm-500 mb-1">Full Message</p>
                <p className="text-sm text-warm-900">{log.message}</p>
              </div>

              {/* Stack trace */}
              {log.stack && (
                <div>
                  <p className="text-xs font-medium text-warm-500 mb-1">Stack Trace</p>
                  <pre className="text-xs font-mono bg-warm-50 p-3 rounded overflow-x-auto text-warm-800 border border-warm-200">
                    {log.stack}
                  </pre>
                </div>
              )}

              {/* Metadata */}
              {log.metadata && (
                <div>
                  <p className="text-xs font-medium text-warm-500 mb-1">Metadata</p>
                  <pre className="text-xs font-mono bg-warm-50 p-3 rounded overflow-x-auto text-warm-800 border border-warm-200">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {/* User ID */}
              {log.user_id && (
                <div>
                  <p className="text-xs font-medium text-warm-500 mb-1">User ID</p>
                  <p className="text-sm text-warm-700 font-mono">{log.user_id}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
