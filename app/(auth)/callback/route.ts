import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'pkce',
          detectSessionInUrl: false,
        },
      }
    );

    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(new URL('/login?error=callback_error', requestUrl.origin));
    }

    if (session) {
      const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!.match(/https:\/\/([^.]+)/)?.[1] || 'hoyixqooigrcwgmnpela';
      const authTokenKey = `sb-${projectRef}-auth-token`;

      const sessionData = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: session.user,
      };

      cookieStore.set(authTokenKey, JSON.stringify(sessionData), {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });

      const { data: profile } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }).then(() =>
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()
      );

      if (profile) {
        let redirectUrl = '/';
        switch (profile.role) {
          case 'SUPER_ADMIN':
            redirectUrl = '/admin';
            break;
          case 'RESTAURANT':
            redirectUrl = '/dashboard';
            break;
          case 'CUSTOMER':
          default:
            redirectUrl = '/';
            break;
        }
        return NextResponse.redirect(new URL(redirectUrl, requestUrl.origin));
      }

      return NextResponse.redirect(new URL('/admin', requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
