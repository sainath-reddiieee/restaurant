import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const path = req.nextUrl.pathname

  const allCookies = req.cookies.getAll()
  const authTokenCookie = allCookies.find(cookie =>
    cookie.name.includes('auth-token') && !cookie.name.includes('code-verifier')
  )

  if (!authTokenCookie?.value) {
    if (path.startsWith('/admin') || path.startsWith('/dashboard') || path.startsWith('/profile')) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return res
  }

  try {
    let authData;
    try {
      authData = JSON.parse(authTokenCookie.value);
    } catch (e) {
      console.error('Failed to parse auth token:', e);
      if (path.startsWith('/admin') || path.startsWith('/dashboard') || path.startsWith('/profile')) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      return res;
    }

    if (!authData?.access_token) {
      if (path.startsWith('/admin') || path.startsWith('/dashboard') || path.startsWith('/profile')) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      return res
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${authData.access_token}`
          }
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser(authData.access_token)

    if (!user) {
      if (path.startsWith('/admin') || path.startsWith('/dashboard') || path.startsWith('/profile')) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      return res
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      if (path.startsWith('/admin') || path.startsWith('/dashboard') || path.startsWith('/profile')) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      return res
    }

    const role = profile.role

    if (path.startsWith('/admin')) {
      if (role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    if (path.startsWith('/dashboard')) {
      if (role === 'CUSTOMER') {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error);
    if (path.startsWith('/admin') || path.startsWith('/dashboard') || path.startsWith('/profile')) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return res
  }
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/profile/:path*'],
}
