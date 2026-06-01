import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SUPABASE_URL = 'https://mktmmbiwxpnswzpyqsxs.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rdG1tYml3eHBuc3d6cHlxc3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxMjgxMzIsImV4cCI6MjA5NTcwNDEzMn0.WW5RaJJkIuuWfF1aHQEOIzMU7xJRAE9c3HxjN0Sr4B4'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/signup/confirm'

  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|sw.js|manifest.json|workbox-.*).*)'],
}
