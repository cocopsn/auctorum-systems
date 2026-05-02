export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default function PagoExitosoPage({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  const sessionId = searchParams?.session_id
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">¡Pago recibido!</h1>
        <p className="mt-2 text-sm text-gray-600">
          Tu pago fue procesado exitosamente. Recibirás un comprobante por correo
          electrónico en los próximos minutos.
        </p>
        {sessionId && (
          <p className="mt-3 text-[11px] text-gray-400 font-mono break-all">
            ID: {sessionId}
          </p>
        )}
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Volver al portal
        </Link>
        <p className="mt-6 text-[11px] text-gray-400">
          Pago procesado por Auctorum + Stripe.
        </p>
      </div>
    </div>
  )
}
