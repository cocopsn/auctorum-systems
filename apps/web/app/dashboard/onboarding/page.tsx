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

  const inputClass =
    'w-full px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none transition';

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-12">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono ${
                s <= step
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] border border-[var(--border)]'
              }`}
            >
              {s}
            </div>
            <span className={`text-xs font-mono ${s <= step ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'}`}>
              {s === 1 ? 'Negocio' : s === 2 ? 'Producto' : 'Compartir'}
            </span>
            {s < 3 && <div className={`flex-1 h-px ${s < step ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Business Info */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Configura tu negocio</h2>
            <p className="text-sm text-[var(--text-secondary)]">Informacion basica para tu portal de cotizaciones.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Nombre del negocio</label>
              <input
                type="text"
                value={data.businessName}
                onChange={(e) => updateData('businessName', e.target.value)}
                placeholder="Mi Empresa S.A. de C.V."
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">URL del portal</label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 bg-[var(--bg-tertiary)] border border-r-0 border-[var(--border)] rounded-l-lg text-sm text-[var(--text-tertiary)] font-mono">
                  https://
                </span>
                <input
                  type="text"
                  value={data.slug}
                  onChange={(e) => updateData('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="mi-empresa"
                  className="flex-1 px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-r-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none font-mono"
                />
                <span className="px-3 py-2.5 text-sm text-[var(--text-tertiary)] font-mono">
                  .auctorum.com.mx
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Telefono</label>
                <input
                  type="tel"
                  value={data.phone}
                  onChange={(e) => updateData('phone', e.target.value)}
                  placeholder="844 123 4567"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Email</label>
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => updateData('email', e.target.value)}
                  placeholder="ventas@miempresa.com"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Direccion</label>
              <input
                type="text"
                value={data.address}
                onChange={(e) => updateData('address', e.target.value)}
                placeholder="Calle, Col., Ciudad, Estado"
                className={inputClass}
              />
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!data.businessName || !data.slug}
            className="w-full px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* Step 2: First Product */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Agrega tu primer producto</h2>
            <p className="text-sm text-[var(--text-secondary)]">Puedes agregar mas despues desde el dashboard.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Nombre del producto</label>
              <input
                type="text"
                value={data.productName}
                onChange={(e) => updateData('productName', e.target.value)}
                placeholder="Balero 6205-2RS"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Precio unitario (MXN)</label>
                <input
                  type="number"
                  step="0.01"
                  value={data.productPrice}
                  onChange={(e) => updateData('productPrice', e.target.value)}
                  placeholder="150.00"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Unidad</label>
                <select
                  value={data.productUnit}
                  onChange={(e) => updateData('productUnit', e.target.value)}
                  className={inputClass}
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
              className="px-6 py-3 border border-[var(--border)] text-[var(--text-secondary)] rounded-lg hover:border-[var(--border-hover)] transition-colors"
            >
              ← Atras
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded-lg transition-colors"
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
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--success)]/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Tu portal esta listo!</h2>
            <p className="text-sm text-[var(--text-secondary)]">Comparte esta URL con tus clientes.</p>
          </div>

          <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg">
            <p className="font-mono text-[var(--accent)] text-lg">
              https://{data.slug || 'mi-empresa'}.auctorum.com.mx
            </p>
          </div>

          <p className="text-xs text-[var(--text-tertiary)]">
            Nota: El portal se activara cuando Armando configure el subdominio en el VPS.
            Mientras tanto, puedes acceder desde el dashboard.
          </p>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 border border-[var(--border)] text-[var(--text-secondary)] rounded-lg hover:border-[var(--border-hover)] transition-colors"
            >
              ← Atras
            </button>
            <a
              href="/dashboard"
              className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-medium rounded-lg transition-colors"
            >
              Ir al dashboard
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
