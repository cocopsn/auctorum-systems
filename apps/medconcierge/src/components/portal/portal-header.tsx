import { Stethoscope } from 'lucide-react'

export function PortalHeader({
  doctorName,
  specialty,
}: {
  doctorName: string
  specialty: string
}) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-200/80">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-tenant-primary to-tenant-secondary flex items-center justify-center shadow-md">
          <Stethoscope className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{doctorName}</h1>
          <span className="inline-block mt-0.5 px-2.5 py-0.5 bg-tenant-primary/10 text-tenant-primary text-xs font-medium rounded-full">
            {specialty}
          </span>
        </div>
      </div>
    </header>
  )
}
