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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg z-10 overflow-y-auto max-h-[90vh]">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {editProduct ? 'Editar producto' : 'Agregar producto'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              required
              placeholder="Ej: Caja de cartón doble canal"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
              <input
                type="text"
                value={form.sku}
                onChange={e => handleChange('sku', e.target.value)}
                placeholder="CJC-001"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio unitario <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.unitPrice}
                onChange={e => handleChange('unitPrice', e.target.value)}
                required
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
              <select
                value={form.unitType}
                onChange={e => handleChange('unitType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]"
              >
                {UNIT_TYPES.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <input
                type="text"
                value={form.category}
                onChange={e => handleChange('category', e.target.value)}
                placeholder="Empaque"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={form.description}
              onChange={e => handleChange('description', e.target.value)}
              rows={3}
              placeholder="Descripción opcional del producto…"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C] resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#1B3A5C] text-white text-sm font-medium hover:bg-[#15304d] disabled:opacity-50 transition-colors"
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
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">{products.length} productos activos</p>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-[#1B3A5C] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#15304d] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar producto
          </button>
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin productos</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-sm">Agregue su primer producto al catalogo para que sus clientes puedan cotizar.</p>
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-[#1B3A5C] text-white text-sm rounded-lg hover:bg-[#15304d] transition-colors"
            >
              Agregar producto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Nombre</th>
                  <th className="text-left px-6 py-3 font-medium hidden sm:table-cell">SKU</th>
                  <th className="text-left px-6 py-3 font-medium hidden md:table-cell">Categoría</th>
                  <th className="text-right px-6 py-3 font-medium">Precio</th>
                  <th className="text-center px-6 py-3 font-medium hidden sm:table-cell">Unidad</th>
                  <th className="text-center px-6 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-gray-400 truncate max-w-xs">{p.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500 font-mono text-xs hidden sm:table-cell">
                      {p.sku || '—'}
                    </td>
                    <td className="px-6 py-3 text-gray-500 hidden md:table-cell">
                      {p.category || '—'}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold tabular-nums">
                      {formatMXN(p.unitPrice)}
                    </td>
                    <td className="px-6 py-3 text-center text-gray-500 hidden sm:table-cell">
                      {p.unitType}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-xs text-[#1B3A5C] hover:underline font-medium"
                        >
                          Editar
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => handleDeactivate(p.id)}
                          disabled={deletingId === p.id}
                          className="text-xs text-red-500 hover:underline font-medium disabled:opacity-40"
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
