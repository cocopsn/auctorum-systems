'use client';

import { useState } from 'react';
import type { TenantConfig } from '@quote-engine/db';

type Props = {
  tenantSlug: string;
  tenantName: string;
  logoUrl: string;
  config: TenantConfig;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-6 mb-5">
      <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function SettingsClient({ tenantSlug, tenantName, logoUrl, config }: Props) {
  const [name, setName] = useState(tenantName);
  const [logo, setLogo] = useState(logoUrl);

  // Colors
  const [primaryColor, setPrimaryColor] = useState(config.colors.primary);
  const [secondaryColor, setSecondaryColor] = useState(config.colors.secondary);

  // Contact
  const [phone, setPhone] = useState(config.contact.phone);
  const [email, setEmail] = useState(config.contact.email);
  const [whatsapp, setWhatsapp] = useState(config.contact.whatsapp);
  const [address, setAddress] = useState(config.contact.address);

  // Business
  const [razonSocial, setRazonSocial] = useState(config.business.razon_social);
  const [rfc, setRfc] = useState(config.business.rfc);
  const [giro, setGiro] = useState(config.business.giro);

  // Quote settings
  const [currency, setCurrency] = useState(config.quote_settings!.currency);
  const [taxRate, setTaxRate] = useState(String(config.quote_settings!.tax_rate * 100));
  const [validityDays, setValidityDays] = useState(String(config.quote_settings!.validity_days));
  const [paymentTerms, setPaymentTerms] = useState(config.quote_settings!.payment_terms);
  const [deliveryTerms, setDeliveryTerms] = useState(config.quote_settings!.delivery_terms);
  const [customFooter, setCustomFooter] = useState(config.quote_settings!.custom_footer);
  const [autoPrefix, setAutoPrefix] = useState(
    config.quote_settings?.auto_number_prefix || 'COT'
  );
  const [showSku, setShowSku] = useState(
    config.quote_settings?.show_sku !== false
  );

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setLoading(true);

    const payload = {
      tenantSlug,
      name,
      logoUrl: logo,
      config: {
        colors: {
          primary: primaryColor,
          secondary: secondaryColor,
          background: config.colors.background,
        },
        contact: { phone, email, whatsapp, address },
        business: { razon_social: razonSocial, rfc, giro },
        quote_settings: {
          currency,
          tax_rate: parseFloat(taxRate) / 100,
          validity_days: parseInt(validityDays, 10),
          payment_terms: paymentTerms,
          delivery_terms: deliveryTerms,
          custom_footer: customFooter,
          auto_number_prefix: autoPrefix.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10) || 'COT',
          show_sku: showSku,
        },
        ai: config.ai,
      },
    };

    try {
      const res = await fetch('/api/tenant/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al guardar configuración');
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 transition';

  return (
    <form onSubmit={handleSubmit}>
      <Section title="Información general">
        <Field label="Nombre del negocio">
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            required className={inputCls} />
        </Field>
        <Field label="URL del logotipo">
          <input type="url" value={logo} onChange={e => setLogo(e.target.value)}
            placeholder="https://storage.ejemplo.com/logo.png" className={inputCls} />
        </Field>
      </Section>

      <Section title="Colores de marca">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Color primario">
            <div className="flex gap-2 items-center">
              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                className="h-9 w-12 rounded cursor-pointer border border-[var(--border)]" />
              <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                placeholder="#1B3A5C" className={inputCls} />
            </div>
          </Field>
          <Field label="Color secundario">
            <div className="flex gap-2 items-center">
              <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                className="h-9 w-12 rounded cursor-pointer border border-[var(--border)]" />
              <input type="text" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                placeholder="#C0392B" className={inputCls} />
            </div>
          </Field>
        </div>
      </Section>

      <Section title="Información de contacto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Teléfono">
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="844 416 2555" className={inputCls} />
          </Field>
          <Field label="Correo electrónico">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="ventas@empresa.com" className={inputCls} />
          </Field>
          <Field label="WhatsApp (con código de país)">
            <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
              placeholder="528441234567" className={inputCls} />
          </Field>
          <Field label="Dirección">
            <input type="text" value={address} onChange={e => setAddress(e.target.value)}
              placeholder="Parque Industrial X, Nave 12, Saltillo" className={inputCls} />
          </Field>
        </div>
      </Section>

      <Section title="Datos fiscales">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Razón social">
            <input type="text" value={razonSocial} onChange={e => setRazonSocial(e.target.value)}
              placeholder="Empresa S.A. de C.V." className={inputCls} />
          </Field>
          <Field label="RFC">
            <input type="text" value={rfc} onChange={e => setRfc(e.target.value)}
              placeholder="EMP123456ABC" className={`${inputCls} uppercase`} />
          </Field>
          <Field label="Giro comercial">
            <input type="text" value={giro} onChange={e => setGiro(e.target.value)}
              placeholder="Maquinados CNC de precisión" className={inputCls} />
          </Field>
        </div>
      </Section>

      <Section title="Configuración de cotizaciones">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Moneda">
            <select value={currency} onChange={e => setCurrency(e.target.value)} className={inputCls}>
              <option value="MXN">MXN — Peso mexicano</option>
              <option value="USD">USD — Dólar americano</option>
            </select>
          </Field>
          <Field label="IVA (%)">
            <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)}
              min="0" max="100" step="0.01" className={inputCls} />
          </Field>
          <Field label="Vigencia (días)">
            <input type="number" value={validityDays} onChange={e => setValidityDays(e.target.value)}
              min="1" max="365" className={inputCls} />
          </Field>
        </div>
        <Field label="Condiciones de pago">
          <input type="text" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}
            placeholder="50% anticipo, 50% contra entrega" className={inputCls} />
        </Field>
        <Field label="Condiciones de entrega">
          <input type="text" value={deliveryTerms} onChange={e => setDeliveryTerms(e.target.value)}
            placeholder="3-5 días hábiles" className={inputCls} />
        </Field>
        <Field label="Nota al pie de cotización">
          <textarea value={customFooter} onChange={e => setCustomFooter(e.target.value)}
            rows={2} placeholder="Precios sujetos a cambio sin previo aviso."
            className={`${inputCls} resize-none`} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Prefijo de folio">
            <input
              type="text"
              value={autoPrefix}
              onChange={e => setAutoPrefix(e.target.value)}
              maxLength={10}
              placeholder="COT"
              className={`${inputCls} uppercase`}
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              Aparecerá antes del número (ej: COT-0001).
            </p>
          </Field>
          <Field label="Mostrar SKU en PDF">
            <label className="inline-flex items-center gap-2 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSku}
                onChange={e => setShowSku(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border)]"
              />
              <span className="text-sm text-[var(--text-secondary)]">
                Incluir columna SKU en el PDF
              </span>
            </label>
          </Field>
        </div>
      </Section>

      {error && (
        <div className="mb-4 p-3 bg-[var(--error)]/10 border border-[var(--error)]/20 rounded-lg text-sm text-[var(--error)]">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-4 p-3 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-lg text-sm text-[var(--success)]">
          Configuración guardada correctamente.
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-[var(--accent)] text-white font-medium text-sm rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
        >
          {loading ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </div>
    </form>
  );
}
