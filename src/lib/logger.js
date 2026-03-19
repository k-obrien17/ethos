/**
 * Structured logging utility with Supabase persistence.
 *
 * Writes structured JSON to console (visible in Vercel function logs)
 * and fire-and-forget inserts into the error_logs table via admin client.
 *
 * Usage in API route handlers:
 * ```javascript
 * import { logError } from '@/lib/logger'
 *
 * export async function GET(request) {
 *   try {
 *     // ... route logic
 *   } catch (err) {
 *     logError({
 *       route: '/api/v1/questions',
 *       method: 'GET',
 *       message: err.message,
 *       stack: err.stack
 *     })
 *     return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
 *   }
 * }
 * ```
 */

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Persist a log entry to the error_logs table.
 * Fire-and-forget -- failures are caught and logged to console only.
 */
function persistToDb(entry) {
  try {
    const supabase = createAdminClient()
    // Fire-and-forget: do not await in caller
    supabase
      .from('error_logs')
      .insert({
        severity: entry.severity,
        route: entry.route || null,
        method: entry.method || null,
        user_id: entry.userId || null,
        message: entry.message,
        stack: entry.stack || null,
        metadata: entry.metadata || null,
        status_code: entry.statusCode || null,
      })
      .then(({ error }) => {
        if (error) {
          console.error('[logger] DB insert failed:', error.message)
        }
      })
      .catch((err) => {
        console.error('[logger] DB insert exception:', err.message)
      })
  } catch (err) {
    console.error('[logger] Failed to create admin client:', err.message)
  }
}

/**
 * Build a structured log object.
 */
function buildEntry(severity, params) {
  return {
    severity,
    timestamp: new Date().toISOString(),
    route: params.route,
    method: params.method,
    userId: params.userId,
    message: params.message,
    stack: params.stack,
    metadata: params.metadata,
    statusCode: params.statusCode,
  }
}

/**
 * Log an error. Writes to console.error and persists to error_logs.
 *
 * @param {Object} params - Log parameters
 * @param {string} params.route - API route path (e.g. "/api/v1/questions")
 * @param {string} params.method - HTTP method (GET, POST, etc.)
 * @param {string} [params.userId] - Authenticated user ID if available
 * @param {string} params.message - Error message
 * @param {string} [params.stack] - Stack trace
 * @param {Object} [params.metadata] - Extra context (request body shape, query params, etc.)
 * @param {number} [params.statusCode] - HTTP response status code
 * @param {Error} [error] - Optional Error object to extract message and stack from
 */
export function logError(params, error) {
  const message = error?.message || params.message
  const stack = error?.stack || params.stack
  const entry = buildEntry('error', { ...params, message, stack })
  console.error(JSON.stringify(entry))
  persistToDb(entry)
}

/**
 * Log a warning. Writes to console.warn and persists to error_logs.
 *
 * @param {Object} params - Log parameters (same shape as logError)
 */
export function logWarn(params) {
  const entry = buildEntry('warn', params)
  console.warn(JSON.stringify(entry))
  persistToDb(entry)
}

/**
 * Log an info event. Writes to console.log and persists to error_logs.
 *
 * @param {Object} params - Log parameters (same shape as logError)
 */
export function logInfo(params) {
  const entry = buildEntry('info', params)
  console.log(JSON.stringify(entry))
  persistToDb(entry)
}
