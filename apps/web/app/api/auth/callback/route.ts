import { NextRequest, NextResponse } from 'next/server'
import { createServerClient as createSSRClient } from '@supabase/ssr'
import { withAuthCookieDomain } from '@/lib/auth-cookie'
import { buildPortalUrl } from '@/lib/hosts'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  const host = request.headers.get('host') || 'auctorum.com.mx'
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const realOrigin = protocol + '://' + host

  // -- PKCE path: ?code= present in query params --
  if (code) {
    const response = NextResponse.redirect(buildPortalUrl('/dashboard'))
    const supabase = createSSRClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set({ name, value, ...withAuthCookieDomain(options ?? {}, host) })
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Auth callback error (PKCE):', error.message)
      return NextResponse.redirect(realOrigin + '/login?error=invalid_code')
    }

    return response
  }

  // -- Implicit path: tokens in hash fragment (#access_token=...) --
  // Hash is invisible to the server, so we serve a client-side page
  // that reads the fragment, POSTs the tokens back to this route (POST handler),
  // which sets proper cookies via @supabase/ssr, then redirects to /dashboard.
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Autenticando...</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
         background:#0a0a0a;font-family:system-ui,sans-serif;color:#fff}
    .card{text-align:center;padding:2rem}
    .spinner{width:40px;height:40px;margin:0 auto 1rem;border:3px solid #333;
             border-top-color:#6366f1;border-radius:50%;animation:spin .6s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    .error{color:#ef4444;margin-top:1rem}
    a{color:#6366f1}
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner" id="spinner"></div>
    <p id="msg">Verificando sesion...</p>
    <p class="error" id="err" style="display:none"></p>
  </div>
  <script>
    (async function(){
      var msgEl = document.getElementById('msg');
      var errEl = document.getElementById('err');
      var spinEl = document.getElementById('spinner');

      function fail(reason){
        spinEl.style.display='none';
        msgEl.textContent='Error de autenticacion';
        errEl.style.display='block';
        errEl.textContent=reason;
        var link=document.createElement('a');
        link.href='/login';
        link.textContent='Volver al login';
        errEl.appendChild(document.createElement('br'));
        errEl.appendChild(link);
      }

      try{
        var hash = window.location.hash.substring(1);
        if(!hash){
          fail('No se recibieron credenciales en la URL.');
          return;
        }

        var params = new URLSearchParams(hash);
        var access_token  = params.get('access_token');
        var refresh_token = params.get('refresh_token');
        var error_desc    = params.get('error_description');

        if(error_desc){
          fail(decodeURIComponent(error_desc));
          return;
        }

        if(!access_token || !refresh_token){
          fail('Tokens faltantes en la respuesta.');
          return;
        }

        msgEl.textContent='Estableciendo sesion...';

        // POST tokens to the server so @supabase/ssr sets proper cookies
        var resp = await fetch('/api/auth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: access_token, refresh_token: refresh_token })
        });

        if(!resp.ok){
          var data = await resp.json().catch(function(){ return {}; });
          fail(data.error || 'Error al establecer la sesion (HTTP ' + resp.status + ')');
          return;
        }

        msgEl.textContent='Listo, redirigiendo...';
        window.location.replace('${buildPortalUrl('/dashboard')}');
      }catch(e){
        fail(e.message || 'Error inesperado');
      }
    })();
  </script>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

/**
 * POST handler: receives access_token + refresh_token from the implicit flow
 * client-side page, calls supabase.auth.setSession() through @supabase/ssr
 * which sets the session cookies in the response. The browser stores these
 * cookies, so subsequent requests (e.g. to /dashboard) carry them and the
 * middleware can verify the session server-side.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { access_token, refresh_token } = body

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 })
    }

    const host = request.headers.get('host') || 'auctorum.com.mx'
    const response = NextResponse.json({ ok: true })

    const supabase = createSSRClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set({ name, value, ...withAuthCookieDomain(options ?? {}, host) })
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    })

    if (error) {
      console.error('Auth callback error (implicit):', error.message)
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    return response
  } catch (e) {
    console.error('Auth callback POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
