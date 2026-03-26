'use client';

import { useState } from 'react';

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState({
    // Step 1: Business Info
    businessName: '',
    slug: '',
    phone: '',
    email: '',
    address: '',
    // Step 2: First Product
    productName: '',
    productPrice: '',
    productUnit: 'pieza',
    // Step 3: Share
  });

  const updateData = (field: string, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-12">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono ${
                s <= step
                  ? 'bg-auctorum-blue text-white'
                  : 'bg-auctorum-surface-2 text-auctorum-body/50 border border-auctorum-border'
              }`}
            >
              {s}
            </div>
            <span className={`text-xs font-mono ${s <= step ? 'text-auctorum-white' : 'text-auctorum-body/50'}`}>
              {s === 1 ? 'Negocio' : s === 2 ? 'Producto' : 'Compartir'}
            </span>
            {s < 3 && <div className={`flex-1 h-px ${s < step ? 'bg-auctorum-blue' : 'bg-auctorum-border'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Business Info */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-auctorum-white mb-2">Configura tu negocio</h2>
            <p className="text-sm text-auctorum-body">Informacion basica para tu portal de cotizaciones.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-auctorum-light mb-1.5">Nombre del negocio</label>
              <input
                type="text"
                value={data.businessName}
                onChange={(e) => updateData('businessName', e.target.value)}
                placeholder="Mi Empresa S.A. de C.V."
                className="w-full px-4 py-2.5 bg-auctorum-surface-1 border border-auctorum-border rounded-lg text-auctorum-white placeholder:text-auctorum-body/40 focus:border-auctorum-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-auctorum-light mb-1.5">URL del portal</label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 bg-auctorum-surface-2 border border-r-0 border-auctorum-border rounded-l-lg text-sm text-auctorum-body/60 font-mono">
                  https://
                </span>
                <input
                  type="text"
                  value={data.slug}
                  onChange={(e) => updateData('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="mi-empresa"
                  className="flex-1 px-4 py-2.5 bg-auctorum-surface-1 border border-auctorum-border rounded-r-lg text-auctorum-white placeholder:text-auctorum-body/40 focus:border-auctorum-blue focus:outline-none font-mono"
                />
                <span className="px-3 py-2.5 text-sm text-auctorum-body/60 font-mono">
                  .auctorum.com.mx
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-auctorum-light mb-1.5">Telefono</label>
                <input
                  type="tel"
                  value={data.phone}
                  onChange={(e) => updateData('phone', e.target.value)}
                  placeholder="844 123 4567"
                  className="w-full px-4 py-2.5 bg-auctorum-surface-1 border border-auctorum-border rounded-lg text-auctorum-white placeholder:text-auctorum-body/40 focus:border-auctorum-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-auctorum-light mb-1.5">Email</label>
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => updateData('email', e.target.value)}
                  placeholder="ventas@miempresa.com"
                  className="w-full px-4 py-2.5 bg-auctorum-surface-1 border border-auctorum-border rounded-lg text-auctorum-white placeholder:text-auctorum-body/40 focus:border-auctorum-blue focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-auctorum-light mb-1.5">Direccion</label>
              <input
                type="text"
                value={data.address}
                onChange={(e) => updateData('address', e.target.value)}
                placeholder="Calle, Col., Ciudad, Estado"
                className="w-full px-4 py-2.5 bg-auctorum-surface-1 border border-auctorum-border rounded-lg text-auctorum-white placeholder:text-auctorum-body/40 focus:border-auctorum-blue focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!data.businessName || !data.slug}
            className="w-full px-6 py-3 bg-auctorum-blue hover:bg-auctorum-blue-bright disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors press-scale"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Step 2: First Product */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-auctorum-white mb-2">Agrega tu primer producto</h2>
            <p className="text-sm text-auctorum-body">Puedes agregar mas despues desde el dashboard.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-auctorum-light mb-1.5">Nombre del producto</label>
              <input
                type="text"
                value={data.productName}
                onChange={(e) => updateData('productName', e.target.value)}
                placeholder="Balero 6205-2RS"
                className="w-full px-4 py-2.5 bg-auctorum-surface-1 border border-auctorum-border rounded-lg text-auctorum-white placeholder:text-auctorum-body/40 focus:border-auctorum-blue focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-auctorum-light mb-1.5">Precio unitario (MXN)</label>
                <input
                  type="number"
                  step="0.01"
                  value={data.productPrice}
                  onChange={(e) => updateData('productPrice', e.target.value)}
                  placeholder="150.00"
                  className="w-full px-4 py-2.5 bg-auctorum-surface-1 border border-auctorum-border rounded-lg text-auctorum-white placeholder:text-auctorum-body/40 focus:border-auctorum-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-auctorum-light mb-1.5">Unidad</label>
                <select
                  value={data.productUnit}
                  onChange={(e) => updateData('productUnit', e.target.value)}
                  className="w-full px-4 py-2.5 bg-auctorum-surface-1 border border-auctorum-border rounded-lg text-auctorum-white focus:border-auctorum-blue focus:outline-none"
                >
                  <option value="pieza">Pieza</option>
                  <option value="kg">Kilogramo</option>
                  <option value="litro">Litro</option>
                  <option value="metro">Metro</option>
                  <option value="servicio">Servicio</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-auctorum-border text-auctorum-light rounded-lg hover:border-auctorum-blue/50 transition-colors press-scale"
            >
              ← Atras
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 px-6 py-3 bg-auctorum-blue hover:bg-auctorum-blue-bright text-white font-medium rounded-lg transition-colors press-scale"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Share */}
      {step === 3 && (
        <div className="space-y-6 text-center">
          <div>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-auctorum-green/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-auctorum-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-auctorum-white mb-2">Tu portal esta listo!</h2>
            <p className="text-sm text-auctorum-body">Comparte esta URL con tus clientes.</p>
          </div>

          <div className="p-4 bg-auctorum-surface-1 border border-auctorum-border rounded-lg">
            <p className="font-mono text-auctorum-blue text-lg">
              https://{data.slug || 'mi-empresa'}.auctorum.com.mx
            </p>
          </div>

          <p className="text-xs text-auctorum-body/60">
            Nota: El portal se activara cuando Armando configure el subdominio en el VPS.
            Mientras tanto, puedes acceder desde el dashboard.
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 border border-auctorum-border text-auctorum-light rounded-lg hover:border-auctorum-blue/50 transition-colors press-scale"
            >
              ← Atras
            </button>
            <a
              href="/dashboard"
              className="px-6 py-3 bg-auctorum-blue hover:bg-auctorum-blue-bright text-white font-medium rounded-lg transition-colors press-scale"
            >
              Ir al dashboard
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
