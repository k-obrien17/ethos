import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request })

  // Password gate — skip for password page, API auth, and static assets
  const pathname = request.nextUrl.pathname
  const isPasswordRoute = pathname === '/password' || pathname === '/api/auth/password'
  const isApiRoute = pathname.startsWith('/api/')

  const isStaticAsset = pathname.startsWith('/_next/') || pathname.startsWith('/favicon') || /\.(ico|png|jpg|svg|css|js|woff2?)$/.test(pathname)

  if (!isPasswordRoute && !isApiRoute && !isStaticAsset && process.env.SITE_PASSWORD) {
    const accessCookie = request.cookies.get('site_access')
    if (accessCookie?.value !== 'granted') {
      const url = request.nextUrl.clone()
      url.pathname = '/password'
      return NextResponse.redirect(url)
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Only check auth for protected routes
  const isAdminRoute = pathname.startsWith('/admin')
  const isDashboardRoute = pathname.startsWith('/dashboard')

  if (!isAdminRoute && !isDashboardRoute) {
    return supabaseResponse
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Admin role enforcement (only for /admin routes)
  if (isAdminRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
