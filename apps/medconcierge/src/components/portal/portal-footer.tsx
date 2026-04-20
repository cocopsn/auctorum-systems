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
        <div className="flex flex-wrap gap-4 mt-4 text-[11px] text-[var(--text-tertiary)]">
          <a href="/privacy" className="hover:text-[var(--text-secondary)] transition-colors">Aviso de Privacidad</a>
          <a href="/terms" className="hover:text-[var(--text-secondary)] transition-colors">Términos y Condiciones</a>
          <a href="/cookies" className="hover:text-[var(--text-secondary)] transition-colors">Política de Cookies</a>
          <a href="/ai-policy" className="hover:text-[var(--text-secondary)] transition-colors">Política de IA</a>
        </div>
        <p className="mt-2 text-[11px] text-[var(--text-tertiary)]/50">
          Powered by{' '}
          <a href="https://auctorum.com.mx" className="hover:text-[var(--text-secondary)] transition-colors">
            Auctorum Systems
          </a>
        </p>
      </div>
    </footer>
  )
}
