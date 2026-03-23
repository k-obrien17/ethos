import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logger'

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' }

  try {
    const checks = {}
    let overallStatus = 'healthy'

    // Database connectivity check with hard timeout
    const DB_TIMEOUT_MS = 5000
    const dbStart = performance.now()
    try {
      const supabase = createAdminClient()
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database query timed out')), DB_TIMEOUT_MS)
      )
      const query = supabase.from('profiles').select('id').limit(1)
      const { error } = await Promise.race([query, timeout])
      const latencyMs = Math.round(performance.now() - dbStart)

      if (error) {
        checks.database = { status: 'error', latencyMs }
        overallStatus = 'degraded'
      } else {
        checks.database = { status: 'ok', latencyMs }
      }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - dbStart)
      checks.database = { status: 'error', latencyMs }
      overallStatus = 'degraded'
    }

    const statusCode = overallStatus === 'healthy' ? 200 : 503

    return NextResponse.json(
      {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        uptime: process.uptime(),
        checks,
      },
      { status: statusCode, headers }
    )
  } catch (err) {
    logError({
      route: '/api/health',
      method: 'GET',
      message: err.message,
      stack: err.stack,
      statusCode: 503,
    })

    return NextResponse.json(
      { status: 'error' },
      { status: 503, headers }
    )
  }
}
