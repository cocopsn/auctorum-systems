type ContactInfo = {
  phone: string
  email: string
  whatsapp: string
  address: string
}

export function PortalFooter({ contact }: { contact: ContactInfo }) {
  return (
    <footer className="border-t border-[var(--border)] mt-12 py-8 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap gap-6 text-xs text-[var(--text-tertiary)]">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="hover:text-[var(--text-secondary)] transition-colors">
              {contact.phone}
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="hover:text-[var(--text-secondary)] transition-colors">
              {contact.email}
            </a>
          )}
          {contact.address && (
            <span>{contact.address}</span>
          )}
        </div>
        <p className="mt-4 text-[11px] text-[var(--text-tertiary)]/50">
          Powered by{' '}
          <a href="https://auctorum.com.mx" className="hover:text-[var(--text-secondary)] transition-colors">
            Auctorum Systems
          </a>
        </p>
      </div>
    </footer>
  )
}
