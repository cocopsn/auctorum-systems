export const dynamic = "force-dynamic";

import { SoapNotesPage } from '@/components/dashboard/soap-editor'

export default function NotasPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Notas Clínicas</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Notas SOAP asociadas a consultas y pacientes.</p>
      </div>
      <SoapNotesPage />
    </div>
  )
}
