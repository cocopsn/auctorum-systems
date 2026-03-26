import { Stethoscope } from 'lucide-react'

export function PortalHeader({
  doctorName,
  specialty,
}: {
  doctorName: string
  specialty: string
}) {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-tenant-primary flex items-center justify-center">
          <Stethoscope className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{doctorName}</h1>
          <p className="text-sm text-gray-500">{specialty}</p>
        </div>
      </div>
    </header>
  )
}
