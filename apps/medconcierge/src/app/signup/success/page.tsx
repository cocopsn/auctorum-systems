/**
 * Post-signup landing for enterprise tenants.
 *
 * Enterprise plans skip the Stripe/MercadoPago checkout — the user is
 * placed in `pending_plan` and our sales team reaches out to finalize
 * the contract. This page tells them so, instead of the 404 they'd
 * previously hit (the signup route returned `redirect: '/signup/success'`
 * but the page didn't exist pre-2026-05-12).
 */
export const dynamic = 'force-static'

import Link from 'next/link'

export default function SignupSuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50 px-4 py-12">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="mx-auto mb-6 inline-flex items-center justify-center h-14 w-14 rounded-full bg-teal-50 text-teal-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">
          ¡Tu cuenta está lista!
        </h1>
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
          Hemos recibido tu solicitud para un plan empresarial. Nuestro
          equipo de ventas te contactará en las próximas 24 horas hábiles
          para activar tu cuenta y ajustar el contrato a la medida de tu
          clínica.
        </p>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          Mientras tanto, te enviamos un correo de verificación. Confírmalo
          para acceder a tu panel cuando esté listo.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/login"
            className="block w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
          >
            Ir al login
          </Link>
          <a
            href="mailto:ventas@auctorum.com.mx"
            className="block w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hablar con ventas
          </a>
        </div>
      </div>
    </main>
  )
}
