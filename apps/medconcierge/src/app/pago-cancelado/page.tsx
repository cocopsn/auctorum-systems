export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { XCircle } from 'lucide-react'

export default function PagoCanceladoPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-4">
          <XCircle className="h-7 w-7 text-rose-600" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Pago cancelado</h1>
        <p className="mt-2 text-sm text-gray-600">
          No se realizó ningún cargo. Si quieres intentarlo de nuevo, vuelve al
          mensaje de WhatsApp del consultorio y abre el link otra vez.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Volver al portal
        </Link>
      </div>
    </div>
  )
}
