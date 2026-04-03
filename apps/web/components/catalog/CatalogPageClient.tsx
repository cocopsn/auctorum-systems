'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Product } from '@quote-engine/db';
import type { TenantConfig } from '@quote-engine/db';
import { ShoppingCart, Plus, Minus, X, ChevronUp, ChevronDown, ArrowRight } from 'lucide-react';

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
  const [addedId, setAddedId] = useState<string | null>(null);
  const [cartLoaded, setCartLoaded] = useState(false);

  const cartKey = `auctorum-cart-${tenantName.toLowerCase().replace(/\s+/g, '-')}`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(cartKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const ageMs = Date.now() - (parsed.savedAt || 0);
        if (ageMs < 24 * 60 * 60 * 1000) {
          setCart(parsed.items || []);
          if ((parsed.items || []).length > 0) setShowCart(true);
        } else {
          localStorage.removeItem(cartKey);
        }
      }
    } catch { /* ignore */ }
    setCartLoaded(true);
  }, [cartKey]);

  useEffect(() => {
    if (!cartLoaded) return;
    if (cart.length > 0) {
      localStorage.setItem(cartKey, JSON.stringify({ items: cart, savedAt: Date.now() }));
    } else {
      localStorage.removeItem(cartKey);
    }
  }, [cart, cartLoaded, cartKey]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setShowCart(true);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 300);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
      return;
    }
    setCart(prev =>
      prev.map(item => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.product.unitPrice) * item.quantity, 0);
  const tax = subtotal * tenantConfig.quote_settings!.tax_rate;
  const total = subtotal + tax;
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const formatMXN = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  const categories = [...new Set(products.map(p => p.category || 'General'))];

  return (
    <div className="relative pb-32">
      <div className="mb-10">
        <h2 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
          Catálogo de productos
        </h2>
        <p className="mt-2 text-[var(--text-secondary)] text-sm">
          Seleccione los productos que necesita y genere su cotización al instante.
        </p>
      </div>

      {categories.map(category => (
        <div key={category} className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-5 rounded-full bg-[var(--accent)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
              {category}
            </h3>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products
              .filter(p => (p.category || 'General') === category)
              .map(product => {
                const inCart = cart.find(item => item.product.id === product.id);
                const justAdded = addedId === product.id;
                return (
                  <div
                    key={product.id}
                    className="group bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl overflow-hidden hover:border-[var(--border-hover)] transition-all duration-200"
                  >
                    {product.imageUrl && (
                      <div className="overflow-hidden bg-[var(--bg-tertiary)] relative h-40">
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex justify-between items-start gap-3 mb-1">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-[var(--text-primary)] text-sm leading-tight">
                            {product.name}
                          </h4>
                          {product.sku && (
                            <p className="text-[11px] font-mono text-[var(--text-tertiary)] mt-0.5">
                              SKU: {product.sku}
                            </p>
                          )}
                        </div>
                        <span className="text-base font-bold whitespace-nowrap text-[var(--accent)]">
                          {formatMXN(parseFloat(product.unitPrice))}
                        </span>
                      </div>

                      {product.description && (
                        <p className="text-xs text-[var(--text-secondary)] mb-4 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                        <span className="text-[11px] font-mono text-[var(--text-tertiary)] uppercase tracking-wide">
                          por {product.unitType}
                        </span>
                        {inCart ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
                              className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors"
                              aria-label={`Reducir cantidad de ${product.name}`}
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="text-sm font-semibold w-7 text-center text-[var(--text-primary)]">
                              {inCart.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
                              className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition-colors"
                              aria-label={`Aumentar cantidad de ${product.name}`}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-all ${justAdded ? 'scale-95' : ''}`}
                          >
                            <Plus className="h-3 w-3" />
                            Agregar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {/* Floating cart */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
          <div className="bg-[var(--bg-elevated)]/95 backdrop-blur-xl border-t border-[var(--border)]">
            <div className="mx-auto max-w-6xl px-6 py-3">
              {showCart && (
                <div className="mb-3 max-h-48 overflow-y-auto divide-y divide-[var(--border)] rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-[var(--text-primary)]">{item.product.name}</span>
                        <span className="ml-2 inline-flex items-center justify-center rounded bg-[var(--accent-muted)] px-1.5 py-0.5 text-[11px] font-mono font-semibold text-[var(--accent)]">
                          x{item.quantity}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className="font-medium text-[var(--text-primary)] tabular-nums text-sm">
                          {formatMXN(parseFloat(item.product.unitPrice) * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="rounded p-1 text-[var(--text-tertiary)] hover:text-[var(--error)] transition-colors"
                          aria-label={`Eliminar ${item.product.name} del carrito`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <button
                  onClick={() => setShowCart(!showCart)}
                  className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <div className="relative">
                    <ShoppingCart className="h-5 w-5" />
                    <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                      {totalItems}
                    </span>
                  </div>
                  <span className="font-medium">
                    {cart.length} producto{cart.length !== 1 ? 's' : ''}
                  </span>
                  {showCart ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>

                <div className="flex items-center gap-3 sm:gap-5 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <p className="text-xs text-[var(--text-tertiary)] hidden sm:block">
                      Subtotal: {formatMXN(subtotal)}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)] hidden sm:block">
                      IVA ({(tenantConfig.quote_settings!.tax_rate * 100).toFixed(0)}%): {formatMXN(tax)}
                    </p>
                    <p className="text-lg font-bold text-[var(--accent)] tracking-tight">
                      {formatMXN(total)}
                    </p>
                  </div>
                  <a
                    href={`/quote?items=${encodeURIComponent(JSON.stringify(cart.map(i => ({ id: i.product.id, qty: i.quantity }))))}`}
                    className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-white font-medium text-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors"
                  >
                    Generar cotización
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
