export const dynamic = "force-dynamic";

import { SettingsForm } from '@/components/dashboard/settings-form'

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500">Perfil médico, colores y notificaciones.</p>
      </div>
      <SettingsForm />
    </div>
  )
}
