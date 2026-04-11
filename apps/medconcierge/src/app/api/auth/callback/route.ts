import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { withAuthCookieDomain } from '@/lib/auth-cookie'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  const host = request.headers.get('host') || 'auctorum.com.mx'
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const realOrigin = protocol + '://' + host

  // -- PKCE path: ?code= present in query params --
  if (code) {
    const response = NextResponse.redirect(realOrigin + '/citas')
    const supabase = createServerClient(
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

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Auth callback error (PKCE):', error.message)
      return NextResponse.redirect(realOrigin + '/login?error=invalid_code')
    }

    return response
  }

  // -- Implicit path: tokens in hash fragment --
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL  || ''
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Autenticando...</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
         background:#f9fafb;font-family:system-ui,sans-serif;color:#111}
    .card{text-align:center;padding:2rem}
    .spinner{width:40px;height:40px;margin:0 auto 1rem;border:3px solid #e5e7eb;
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
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
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

        var sb = window.supabase.createClient(
          '${supabaseUrl}',
          '${supabaseAnon}'
        );

        var res = await sb.auth.setSession({access_token:access_token, refresh_token:refresh_token});
        if(res.error){
          fail(res.error.message);
          return;
        }

        msgEl.textContent='Listo, redirigiendo...';
        window.location.replace('/citas');
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
