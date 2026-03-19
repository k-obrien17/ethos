import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/logger'

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' }

  try {
    const checks = {}
    let overallStatus = 'healthy'

    // Database connectivity check
    const dbStart = performance.now()
    try {
      const supabase = createAdminClient()
      const { error } = await supabase.from('profiles').select('id').limit(1)
      const latencyMs = Math.round(performance.now() - dbStart)

      if (error) {
        checks.database = { status: 'error', latencyMs, error: error.message }
        overallStatus = 'degraded'
      } else if (latencyMs > 5000) {
        checks.database = { status: 'error', latencyMs, error: 'Timeout: query exceeded 5000ms' }
        overallStatus = 'degraded'
      } else {
        checks.database = { status: 'ok', latencyMs }
      }
    } catch (err) {
      const latencyMs = Math.round(performance.now() - dbStart)
      checks.database = { status: 'error', latencyMs, error: err.message }
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
      { status: 'error', message: err.message },
      { status: 503, headers }
    )
  }
}
