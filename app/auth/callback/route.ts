import { createClient } from '@/src/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  console.log('[auth/callback] Step 1: Received callback', { code: code ? 'present' : 'missing', origin });

  if (!code) {
    console.error('[auth/callback] Step 1 FAILED: No code in query params');
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = await createClient();
  console.log('[auth/callback] Step 2: Supabase client created');

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] Step 3 FAILED: exchangeCodeForSession', {
      message: error.message,
      status: error.status,
      code: error.code,
    });
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  console.log('[auth/callback] Step 3: Session created', { userId: data.user?.id });

  return NextResponse.redirect(`${origin}${next}`);
}
