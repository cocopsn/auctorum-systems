import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentos Legales — Auctorum Systems",
  description: "Políticas de privacidad, términos de servicio y documentos legales de Auctorum Systems",
};

const NAV_LINKS = [
  { href: "/privacy", label: "Privacidad" },
  { href: "/terms", label: "Términos" },
  { href: "/ai-policy", label: "Política IA" },
  { href: "/cookies", label: "Cookies" },
  { href: "/data-deletion", label: "Eliminación de Datos" },
] as const;

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-200 py-4 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight text-teal-600 hover:text-teal-700 transition-colors">
            AUCTORUM
          </Link>
          <nav className="hidden md:flex gap-4 text-sm text-gray-500">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-teal-600 transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
          <details className="md:hidden relative">
            <summary className="cursor-pointer text-gray-500 hover:text-teal-600 list-none">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </summary>
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-20">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="block px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-teal-600">
                  {link.label}
                </Link>
              ))}
            </div>
          </details>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
        {children}
      </main>

      <footer className="border-t border-gray-200 py-6 mt-auto">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-gray-400 space-y-1">
          <p>&copy; {new Date().getFullYear()} Auctorum Systems S.A.P.I. de C.V. — Saltillo, Coahuila, México</p>
          <p>
            <a href="mailto:contacto@auctorum.com.mx" className="hover:text-teal-600 transition-colors">contacto@auctorum.com.mx</a>
            {" | "}
            <a href="tel:+528445387404" className="hover:text-teal-600 transition-colors">+52 844 538 7404</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
