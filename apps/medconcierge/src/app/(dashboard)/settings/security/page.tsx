'use client';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Shield, AlertTriangle } from 'lucide-react';

/**
 * Security settings — placeholder.
 *
 * Pre-2026-05-10 this page exposed a TOTP enrollment flow that called
 * /api/dashboard/settings/security/2fa/{enable,verify,disable}. Those
 * endpoints stored a secret on `users.two_factor_secret` and flipped
 * `users.two_factor_enabled = true` — but the login flow (Supabase magic
 * link + /api/auth/callback) NEVER read that flag. Enabling 2FA gave
 * the user no extra protection at sign-in time. We don't ship security
 * theatre, so the UI is replaced with an honest disclaimer until the
 * auth callback enforces the TOTP challenge end-to-end.
 *
 * The /api/dashboard/settings/security/2fa/* routes still exist (and
 * persist secrets) so an existing 2FA-enabled tenant doesn't lose state,
 * but they're no longer reachable from the UI.
 */
export default function SecuritySettingsPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-600" />
          Seguridad
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Acceso a tu cuenta y opciones de protección adicional.
        </p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-900">
            Autenticación de dos factores (2FA) — próximamente
          </p>
          <p className="text-sm text-amber-800">
            El flujo de TOTP por aplicación autenticadora se está terminando
            de integrar al login. Hoy el acceso usa enlace mágico (magic
            link) enviado a tu correo, lo cual ya provee un factor adicional
            sobre contraseña. Cuando 2FA esté listo te avisaremos por email.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">
          Cómo proteger tu cuenta hoy
        </h2>
        <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
          <li>
            Usa una contraseña fuerte y única en tu correo electrónico (es la
            llave del enlace mágico).
          </li>
          <li>
            Activa 2FA en tu proveedor de correo (Gmail, iCloud, Outlook).
            Eso protege el canal por el que entras.
          </li>
          <li>
            Cierra sesión cuando uses una computadora compartida en{' '}
            <Link href="/dashboard" className="text-indigo-600 underline">
              el panel
            </Link>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}
