export const dynamic = "force-dynamic";

import { SoapNotesPage } from '@/components/dashboard/soap-editor'

export default function NotasPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notas Clínicas</h1>
        <p className="text-sm text-gray-500">Notas SOAP asociadas a consultas y pacientes.</p>
      </div>
      <SoapNotesPage />
    </div>
  )
}
