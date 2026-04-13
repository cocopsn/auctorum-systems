import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-slate-900 py-12 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-8 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Producto</h4>
            <div className="space-y-3">
              <Link href="/systems" className="block text-sm text-slate-400 hover:text-white transition-colors">Concierge Médico</Link>
              <Link href="/platform" className="block text-sm text-slate-400 hover:text-white transition-colors">Cotizador B2B</Link>
              <a href="/systems#precios" className="block text-sm text-slate-400 hover:text-white transition-colors">Precios</a>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Empresa</h4>
            <div className="space-y-3">
              <span className="block text-sm text-slate-400">Sobre nosotros</span>
              <span className="block text-sm text-slate-400">Blog</span>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
            <div className="space-y-3">
              <span className="block text-sm text-slate-400">Aviso de Privacidad</span>
              <span className="block text-sm text-slate-400">Términos de Servicio</span>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Contacto</h4>
            <div className="space-y-3">
              <a href="mailto:sistema@auctorum.com.mx" className="block text-sm text-slate-400 hover:text-white transition-colors">sistema@auctorum.com.mx</a>
              <span className="block text-sm text-slate-400">Saltillo, Coahuila, México</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Auctorum" width={24} height={24} className="h-6 w-auto opacity-70" />
            <span className="text-sm font-medium text-slate-300">Auctorum Systems</span>
          </div>
          <p className="text-xs text-slate-500">&copy; 2026 Auctorum Systems. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
