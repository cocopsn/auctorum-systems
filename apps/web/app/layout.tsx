import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Motor de Cotizaciones B2B',
  description: 'Genere cotizaciones profesionales al instante',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased bg-white text-gray-900">
        {children}
      </body>
    </html>
  );
}
