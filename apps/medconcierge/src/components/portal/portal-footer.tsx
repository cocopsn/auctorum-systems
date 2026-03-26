import { Phone, Mail, MapPin } from 'lucide-react'

type ContactInfo = {
  phone: string
  email: string
  whatsapp: string
  address: string
}

export function PortalFooter({ contact }: { contact: ContactInfo }) {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <Phone className="w-4 h-4 mt-0.5 text-tenant-primary shrink-0" />
            <span>{contact.phone}</span>
          </div>
          <div className="flex items-start gap-2">
            <Mail className="w-4 h-4 mt-0.5 text-tenant-primary shrink-0" />
            <span>{contact.email}</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 text-tenant-primary shrink-0" />
            <span>{contact.address}</span>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
          Powered by Auctorum Systems
        </div>
      </div>
    </footer>
  )
}
