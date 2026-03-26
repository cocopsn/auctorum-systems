'use client';

import { useState, useEffect } from 'react';
import type { Product } from '@quote-engine/db';
import type { TenantConfig } from '@quote-engine/db';

// ============================================================
// This is the PUBLIC portal page that industrial clients see.
// URL: toolroom.cotizarapido.mx
// Shows: product catalog grid + floating cart + "Generate Quote" CTA
// ============================================================

interface CartItem {
  product: Product;
  quantity: number;
}

interface CatalogPageClientProps {
  products: Product[];
  tenantName: string;
  tenantConfig: TenantConfig;
}

export default function CatalogPageClient({ products, tenantName, tenantConfig }: CatalogPageClientProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setShowCart(true);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + parseFloat(item.product.unitPrice) * item.quantity, 0
  );
  const tax = subtotal * tenantConfig.quote_settings!.tax_rate;
  const total = subtotal + tax;

  const formatMXN = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  // Group products by category
  const categories = [...new Set(products.map(p => p.category || 'General'))];

  return (
    <div className="relative">
      {/* Page title */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Catálogo de productos</h2>
        <p className="mt-1 text-gray-500">
          Seleccione los productos que necesita y genere su cotización al instante.
        </p>
      </div>

      {/* Product grid by category */}
      {categories.map(category => (
        <div key={category} className="mb-10">
          <h3
            className="text-lg font-semibold mb-4 pb-2 border-b"
            style={{ color: 'var(--tenant-primary)', borderColor: 'var(--tenant-primary)' }}
          >
            {category}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products
              .filter(p => (p.category || 'General') === category)
              .map(product => {
                const inCart = cart.find(item => item.product.id === product.id);
                return (
                  <div
                    key={product.id}
                    className="rounded-lg border bg-white p-4 hover:shadow-md transition-shadow"
                  >
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-40 object-cover rounded mb-3"
                      />
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900">{product.name}</h4>
                        {product.sku && (
                          <p className="text-xs text-gray-400">SKU: {product.sku}</p>
                        )}
                      </div>
                      <span
                        className="text-lg font-bold whitespace-nowrap"
                        style={{ color: 'var(--tenant-primary)' }}
                      >
                        {formatMXN(parseFloat(product.unitPrice))}
                      </span>
                    </div>
                    {product.description && (
                      <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        por {product.unitType}
                      </span>
                      {inCart ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
                            className="w-8 h-8 rounded-full border flex items-center justify-center text-gray-600 hover:bg-gray-100"
                          >
                            -
                          </button>
                          <span className="text-sm font-medium w-8 text-center">
                            {inCart.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
                            className="w-8 h-8 rounded-full border flex items-center justify-center text-gray-600 hover:bg-gray-100"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="rounded-full px-4 py-1.5 text-sm text-white font-medium transition-opacity hover:opacity-90"
                          style={{ backgroundColor: 'var(--tenant-primary)' }}
                        >
                          Agregar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {/* Floating cart summary */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
          <div className="mx-auto max-w-6xl px-4 py-3">
            {showCart && (
              <div className="mb-3 max-h-48 overflow-y-auto divide-y">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="flex-1">
                      <span className="font-medium">{item.product.name}</span>
                      <span className="text-gray-400 ml-2">x{item.quantity}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        {formatMXN(parseFloat(item.product.unitPrice) * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowCart(!showCart)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                {cart.length} producto{cart.length !== 1 ? 's' : ''} ·{' '}
                {showCart ? 'Ocultar detalle' : 'Ver detalle'}
              </button>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Subtotal: {formatMXN(subtotal)}</p>
                  <p className="text-xs text-gray-400">IVA ({(tenantConfig.quote_settings!.tax_rate * 100).toFixed(0)}%): {formatMXN(tax)}</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--tenant-primary)' }}>
                    Total: {formatMXN(total)}
                  </p>
                </div>
                <a
                  href={`/quote?items=${encodeURIComponent(JSON.stringify(cart.map(i => ({ id: i.product.id, qty: i.quantity }))))}`}
                  className="rounded-lg px-6 py-3 text-white font-semibold text-sm transition-opacity hover:opacity-90"
                  style={{ backgroundColor: 'var(--tenant-secondary)' }}
                >
                  Generar cotización
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
