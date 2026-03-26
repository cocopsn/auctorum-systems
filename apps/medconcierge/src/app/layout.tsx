import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Concierge AI Médico — Auctorum Systems',
  description: 'Portal de gestión de consultorio médico con IA',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
