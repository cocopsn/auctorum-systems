import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://auctorum.com.mx'),
  title: 'Auctorum — Software e Inteligencia Artificial',
  description:
    'Organización tecnológica. IA personal soberana y software comercial vertical.',
  keywords: ['IA personal', 'inteligencia artificial', 'soberanía digital', 'open source', 'Auctorum', 'SaaS', 'B2B'],
  authors: [{ name: 'Armando Flores' }],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Auctorum — Software e Inteligencia Artificial',
    description: 'Organización tecnológica. IA personal soberana y software comercial vertical.',
    url: 'https://auctorum.com.mx',
    siteName: 'Auctorum',
    locale: 'es_MX',
    type: 'website',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'Auctorum' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600&family=Sora:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-sora">
        {children}
      </body>
    </html>
  );
}
