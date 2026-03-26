import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Auctorum — Privacidad. Control. Autoría.',
  description:
    'Sé el autor de tu propia inteligencia artificial. Plataforma de IA personal soberana: todo local, cero costo recurrente, tus datos nunca salen de tu máquina.',
  keywords: ['IA personal', 'inteligencia artificial', 'soberanía digital', 'open source', 'Auctorum'],
  authors: [{ name: 'Armando Flores' }],
  openGraph: {
    title: 'Auctorum — Privacidad. Control. Autoría.',
    description: 'Sé el autor de tu propia inteligencia artificial.',
    url: 'https://auctorum.com.mx',
    siteName: 'Auctorum',
    locale: 'es_MX',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600&family=Sora:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-auctorum-bg text-auctorum-body font-sora">
        {children}
      </body>
    </html>
  );
}
