import { createAdminClient } from '@/lib/supabase/admin'
import { format } from 'date-fns'
import ErrorRow from './ErrorRow'

export const metadata = { title: 'Monitoring — Admin' }

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

function SummaryCard({ label, value, color }) {
  const colors = {
    red: 'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
  }
  return (
    <div className={`rounded-lg border px-4 py-3 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm font-medium">{label}</p>
    </div>
  )
}

export default async function AdminMonitoringPage({ searchParams }) {
  const params = await searchParams
  const severity = params?.severity || 'all'
  const route = params?.route || ''
  const page = Math.max(1, parseInt(params?.page || '1', 10))
  const perPage = 50
  const offset = (page - 1) * perPage

  const supabase = createAdminClient()

  // Build main query
  let query = supabase
    .from('error_logs')
    .select('*', { count: 'exact' })
    .order('timestamp', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (severity && severity !== 'all') query = query.eq('severity', severity)
  if (route) query = query.eq('route', route)

  // Get distinct routes for filter dropdown
  const routesPromise = supabase
    .from('error_logs')
    .select('route')
    .order('route')

  // Get last-24h counts by severity
  const twentyFourHoursAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString()
  const recentErrorsPromise = supabase
    .from('error_logs')
    .select('severity')
    .gte('timestamp', twentyFourHoursAgo)

  const [{ data: logs, count }, { data: routeRows }, { data: recentEntries }] = await Promise.all([
    query,
    routesPromise,
    recentErrorsPromise,
  ])

  const uniqueRoutes = [...new Set(routeRows?.map(r => r.route).filter(Boolean))]

  // Count by severity in last 24h
  const severityCounts = { error: 0, warn: 0, info: 0 }
  for (const entry of recentEntries ?? []) {
    if (severityCounts[entry.severity] !== undefined) {
      severityCounts[entry.severity]++
    }
  }

  const totalPages = Math.ceil((count || 0) / perPage)

  function buildUrl(overrides) {
    const p = new URLSearchParams()
    const newSeverity = overrides.severity ?? severity
    const newRoute = overrides.route ?? route
    const newPage = overrides.page ?? page
    if (newSeverity && newSeverity !== 'all') p.set('severity', newSeverity)
    if (newRoute) p.set('route', newRoute)
    if (newPage > 1) p.set('page', String(newPage))
    const qs = p.toString()
    return `/admin/monitoring${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-warm-900">Monitoring</h1>
        <p className="text-sm text-warm-500 mt-1">{count ?? 0} total error log entries</p>
      </div>

      {/* Summary stats - last 24 hours */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Errors (24h)" value={severityCounts.error} color="red" />
        <SummaryCard label="Warnings (24h)" value={severityCounts.warn} color="amber" />
        <SummaryCard label="Info (24h)" value={severityCounts.info} color="blue" />
      </div>

      {/* Filters */}
      <form method="GET" action="/admin/monitoring" className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-warm-700">
          Severity
          <select
            name="severity"
            defaultValue={severity}
            className="rounded border border-warm-300 bg-white px-2 py-1.5 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-warm-400"
          >
            <option value="all">All</option>
            <option value="error">Error</option>
            <option value="warn">Warn</option>
            <option value="info">Info</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-warm-700">
          Route
          <select
            name="route"
            defaultValue={route}
            className="rounded border border-warm-300 bg-white px-2 py-1.5 text-sm text-warm-900 focus:outline-none focus:ring-2 focus:ring-warm-400"
          >
            <option value="">All Routes</option>
            {uniqueRoutes.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="rounded bg-warm-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-warm-900 transition-colors"
        >
          Filter
        </button>
      </form>

      {/* Error log table */}
      <div className="bg-white border border-warm-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-warm-200 bg-warm-50">
              <th className="px-4 py-2 text-left text-xs font-medium text-warm-500 uppercase tracking-wide">Timestamp</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-warm-500 uppercase tracking-wide">Severity</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-warm-500 uppercase tracking-wide">Route</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-warm-500 uppercase tracking-wide">Method</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-warm-500 uppercase tracking-wide">Message</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-warm-500 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100">
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-warm-400">
                  No error logs found.
                </td>
              </tr>
            )}
            {(logs ?? []).map(log => (
              <ErrorRow key={log.id} log={log} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-warm-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={buildUrl({ page: page - 1 })}
                className="rounded border border-warm-300 bg-white px-3 py-1.5 text-sm text-warm-700 hover:bg-warm-50 transition-colors"
              >
                Previous
              </a>
            )}
            {page < totalPages && (
              <a
                href={buildUrl({ page: page + 1 })}
                className="rounded border border-warm-300 bg-white px-3 py-1.5 text-sm text-warm-700 hover:bg-warm-50 transition-colors"
              >
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
