import { Phone, Mail, MapPin } from 'lucide-react'

type ContactInfo = {
  phone: string
  email: string
  whatsapp: string
  address: string
}

export function PortalFooter({ contact }: { contact: ContactInfo }) {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-12">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm text-gray-600">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-tenant-primary/10 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-tenant-primary" />
            </div>
            <span>{contact.phone}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-tenant-primary/10 flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-tenant-primary" />
            </div>
            <span>{contact.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-tenant-primary/10 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-tenant-primary" />
            </div>
            <span>{contact.address}</span>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400 tracking-wide">
            Powered by <span className="font-semibold text-gray-500">Auctorum Systems</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
