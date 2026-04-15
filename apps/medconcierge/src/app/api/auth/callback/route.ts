import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { withAuthCookieDomain } from '@/lib/auth-cookie'

function makeSupabaseClient(request: NextRequest, response: NextResponse, host: string) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: Record<string, unknown>) {
          response.cookies.set({ name, value, ...withAuthCookieDomain(options ?? {}, host) })
        },
        remove(name: string, options: Record<string, unknown>) {
          response.cookies.set({ name, value: '', ...withAuthCookieDomain(options ?? {}, host) })
        },
      },
    }
  )
}

/** Clear all Supabase cookies to recover from corruption. */
function clearSupabaseCookies(request: NextRequest, response: NextResponse, host: string) {
  const cookieDomain = host.includes('localhost')
    ? undefined
    : `.${process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'auctorum.com.mx'}`

  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('auth-token') || cookie.name.includes('code-verifier')) {
      response.cookies.set({
        name: cookie.name,
        value: '',
        maxAge: 0,
        path: '/',
        ...(cookieDomain ? { domain: cookieDomain } : {}),
      })
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  const host = request.headers.get('host') || 'auctorum.com.mx'
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const realOrigin = protocol + '://' + host

  // -- PKCE path: ?code= present in query params --
  if (code) {
    console.log('[auth-callback] PKCE code received, attempting exchangeCodeForSession')

    const response = NextResponse.redirect(realOrigin + '/citas')
    const supabase = makeSupabaseClient(request, response, host)

    // Step 1: Try PKCE exchangeCodeForSession (preferred)
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        console.log('[auth-callback] PKCE exchange successful, redirecting to /citas')
        return response
      }
      console.error('[auth-callback] PKCE exchange returned error:', error.message)
    } catch (err) {
      console.error(
        '[auth-callback] PKCE exchange threw:',
        err instanceof Error ? err.message : err,
      )
    }

    // Step 2: Fallback — try verifyOtp with the code as token_hash
    console.log('[auth-callback] Trying verifyOtp fallback')
    try {
      const fallbackResponse = NextResponse.redirect(realOrigin + '/citas')
      const fallbackSupabase = makeSupabaseClient(request, fallbackResponse, host)

      const { error: otpError } = await fallbackSupabase.auth.verifyOtp({
        token_hash: code,
        type: 'magiclink',
      })
      if (!otpError) {
        console.log('[auth-callback] verifyOtp fallback successful')
        return fallbackResponse
      }
      console.error('[auth-callback] verifyOtp fallback error:', otpError.message)
    } catch (err) {
      console.error(
        '[auth-callback] verifyOtp fallback threw:',
        err instanceof Error ? err.message : err,
      )
    }

    // Step 3: Both failed — clean up and redirect to login
    console.error('[auth-callback] All auth methods failed, clearing cookies and redirecting to /login')
    const errorResponse = NextResponse.redirect(realOrigin + '/login?error=auth_failed')
    clearSupabaseCookies(request, errorResponse, host)
    return errorResponse
  }

  // -- Implicit path: tokens in hash fragment --
  const html = [
    '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>',
    '<meta name="viewport" content="width=device-width,initial-scale=1"/>',
    '<title>Autenticando...</title>',
    '<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;',
    'background:#f9fafb;font-family:system-ui,sans-serif;color:#111}',
    '.card{text-align:center;padding:2rem}',
    '.spinner{width:40px;height:40px;margin:0 auto 1rem;border:3px solid #e5e7eb;',
    'border-top-color:#6366f1;border-radius:50%;animation:spin .6s linear infinite}',
    '@keyframes spin{to{transform:rotate(360deg)}}',
    '.error{color:#ef4444;margin-top:1rem}a{color:#6366f1}</style></head><body>',
    '<div class="card"><div class="spinner" id="spinner"></div>',
    '<p id="msg">Verificando sesion...</p>',
    '<p class="error" id="err" style="display:none"></p></div>',
    '<script>',
    '(async function(){',
    'var msgEl=document.getElementById("msg"),errEl=document.getElementById("err"),spinEl=document.getElementById("spinner");',
    'function fail(r){spinEl.style.display="none";msgEl.textContent="Error de autenticacion";',
    'errEl.style.display="block";errEl.textContent=r;',
    'var a=document.createElement("a");a.href="/login";a.textContent=" Volver al login";errEl.appendChild(a)}',
    'try{var hash=window.location.hash.substring(1);',
    'if(!hash){fail("No se recibieron credenciales.");return}',
    'var p=new URLSearchParams(hash),at=p.get("access_token"),rt=p.get("refresh_token"),ed=p.get("error_description");',
    'if(ed){fail(decodeURIComponent(ed));return}',
    'if(!at||!rt){fail("Tokens faltantes.");return}',
    'msgEl.textContent="Estableciendo sesion...";',
    'var res=await fetch("/api/auth/callback",{method:"POST",headers:{"Content-Type":"application/json"},',
    'body:JSON.stringify({access_token:at,refresh_token:rt})});',
    'if(!res.ok){var d=await res.json().catch(function(){return{}});fail(d.error||"Error al establecer sesion");return}',
    'msgEl.textContent="Listo, redirigiendo...";window.location.replace("/citas");',
    '}catch(e){fail(e.message||"Error inesperado")}',
    '})();',
    '</script></body></html>',
  ].join('\n')

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

/**
 * POST handler — receives access_token + refresh_token from the implicit flow
 * HTML page, calls setSession to validate them, and sets proper httpOnly cookies
 * with the correct domain so the middleware can read them.
 */
export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token } = await request.json()

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 })
    }

    const host = request.headers.get('host') || 'auctorum.com.mx'
    const response = NextResponse.json({ ok: true })
    const supabase = makeSupabaseClient(request, response, host)

    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    })

    if (error) {
      console.error('[auth-callback] POST setSession error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('[auth-callback] POST setSession successful')
    return response
  } catch (e: any) {
    console.error('[auth-callback] POST exception:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
