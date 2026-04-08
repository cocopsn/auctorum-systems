'use client';

import { useState } from 'react';
import type { Product } from '@quote-engine/db';

// ─── Types ─────────────────────────────────────────────────────────────────

type ProductForm = {
  name: string;
  sku: string;
  unitPrice: string;
  unitType: string;
  category: string;
  description: string;
};

const EMPTY_FORM: ProductForm = {
  name: '',
  sku: '',
  unitPrice: '',
  unitType: 'pieza',
  category: '',
  description: '',
};

const UNIT_TYPES = ['pieza', 'kg', 'm', 'm²', 'litro', 'hora', 'servicio', 'lote'];

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatMXN(amount: string | number) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
}

const inputClass =
  'w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 transition';

// ─── Modal ─────────────────────────────────────────────────────────────────

function ProductModal({
  open,
  editProduct,
  tenantSlug,
  onClose,
  onSaved,
}: {
  open: boolean;
  editProduct: Product | null;
  tenantSlug: string;
  onClose: () => void;
  onSaved: (product: Product) => void;
}) {
  const [form, setForm] = useState<ProductForm>(
    editProduct
      ? {
          name: editProduct.name,
          sku: editProduct.sku ?? '',
          unitPrice: editProduct.unitPrice,
          unitType: editProduct.unitType ?? 'pieza',
          category: editProduct.category ?? '',
          description: editProduct.description ?? '',
        }
      : EMPTY_FORM
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  function handleChange(field: keyof ProductForm, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        ...form,
        tenantSlug,
      };

      const res = editProduct
        ? await fetch(`/api/products/${editProduct.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al guardar el producto');
        return;
      }

      onSaved(data.data);
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-xl w-full max-w-lg z-10 overflow-y-auto max-h-[90vh]">
        <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {editProduct ? 'Editar producto' : 'Agregar producto'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Nombre <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              required
              placeholder="Ej: Caja de cartón doble canal"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={e => handleChange('sku', e.target.value)}
                placeholder="CJC-001"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Precio unitario <span className="text-[var(--error)]">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.unitPrice}
                onChange={e => handleChange('unitPrice', e.target.value)}
                required
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Unidad</label>
              <select
                value={form.unitType}
                onChange={e => handleChange('unitType', e.target.value)}
                className={inputClass}
              >
                {UNIT_TYPES.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Categoría</label>
              <input
                type="text"
                value={form.category}
                onChange={e => handleChange('category', e.target.value)}
                placeholder="Empaque"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              rows={3}
              placeholder="Descripción opcional del producto…"
              className={`${inputClass} resize-none`}
            />
          </div>

          {error && <p className="text-sm text-[var(--error)]">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Guardando…' : editProduct ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Client Component ──────────────────────────────────────────────────

export default function ProductsClient({
  initialProducts,
  tenantSlug,
}: {
  initialProducts: Product[];
  tenantSlug: string;
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openAdd() {
    setEditProduct(null);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditProduct(product);
    setModalOpen(true);
  }

  function handleSaved(saved: Product) {
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === saved.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = saved;
        return updated;
      }
      return [saved, ...prev];
    });
    setModalOpen(false);
  }

  async function handleDeactivate(productId: string) {
    if (!confirm('¿Desactivar este producto? Dejará de aparecer en el catálogo.')) return;
    setDeletingId(productId);

    try {
      const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== productId));
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <p className="text-sm text-[var(--text-tertiary)]">{products.length} productos activos</p>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-[var(--accent)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar producto
          </button>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[var(--text-tertiary)] opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Sin productos</h3>
            <p className="text-sm text-[var(--text-tertiary)] mb-6 max-w-sm">Agregue su primer producto al catalogo para que sus clientes puedan cotizar.</p>
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-[var(--accent)] text-white text-sm rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
            >
              Agregar producto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)]">
                <tr className="text-[var(--text-tertiary)]">
                  <th className="text-left px-6 py-3 text-[11px] font-mono uppercase tracking-wide">Nombre</th>
                  <th className="text-left px-6 py-3 text-[11px] font-mono uppercase tracking-wide hidden sm:table-cell">SKU</th>
                  <th className="text-left px-6 py-3 text-[11px] font-mono uppercase tracking-wide hidden md:table-cell">Categoría</th>
                  <th className="text-right px-6 py-3 text-[11px] font-mono uppercase tracking-wide">Precio</th>
                  <th className="text-center px-6 py-3 text-[11px] font-mono uppercase tracking-wide hidden sm:table-cell">Unidad</th>
                  <th className="text-center px-6 py-3 text-[11px] font-mono uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium text-[var(--text-primary)]">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-[var(--text-tertiary)] truncate max-w-xs">{p.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-3 text-[var(--text-tertiary)] font-mono text-xs hidden sm:table-cell">
                      {p.sku || '—'}
                    </td>
                    <td className="px-6 py-3 text-[var(--text-secondary)] hidden md:table-cell">
                      {p.category || '—'}
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-medium text-[var(--text-primary)]">
                      {formatMXN(p.unitPrice)}
                    </td>
                    <td className="px-6 py-3 text-center text-[var(--text-secondary)] hidden sm:table-cell">
                      {p.unitType}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-xs text-[var(--accent)] hover:underline font-medium"
                        >
                          Editar
                        </button>
                        <span className="text-[var(--border)]">|</span>
                        <button
                          onClick={() => handleDeactivate(p.id)}
                          disabled={deletingId === p.id}
                          className="text-xs text-[var(--error)] hover:underline font-medium disabled:opacity-40"
                        >
                          {deletingId === p.id ? '…' : 'Desactivar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductModal
        open={modalOpen}
        editProduct={editProduct}
        tenantSlug={tenantSlug}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </>
  );
}
