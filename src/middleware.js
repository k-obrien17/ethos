import { updateSession } from '@/lib/supabase/middleware'
import { logWarn } from '@/lib/logger'

export async function middleware(request) {
  const startTime = Date.now()

  // Add request start timestamp for downstream latency tracking
  request.headers.set('x-request-start', startTime.toString())

  const response = await updateSession(request)

  // Log slow requests (over 5 seconds)
  const duration = Date.now() - startTime
  if (duration > 5000) {
    logWarn({
      route: request.nextUrl.pathname,
      method: request.method,
      message: `Slow request: ${duration}ms`,
      metadata: { durationMs: duration },
    })
  }

  // Add server timing header for observability
  response.headers.set('x-response-time', `${duration}ms`)

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
