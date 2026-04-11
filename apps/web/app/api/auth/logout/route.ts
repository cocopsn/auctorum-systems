import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-ssr'

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServer()
  await supabase.auth.signOut()

  const host = request.headers.get('host') || 'auctorum.com.mx'
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  const realOrigin = protocol + '://' + host

  return NextResponse.redirect(realOrigin + '/login')
}
