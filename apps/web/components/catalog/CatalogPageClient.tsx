'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Product } from '@quote-engine/db';
import type { TenantConfig } from '@quote-engine/db';
import { ShoppingCart, Plus, Minus, X, ChevronUp, ChevronDown, ArrowRight } from 'lucide-react';

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
  const [addedId, setAddedId] = useState<string | null>(null);
  const [cartLoaded, setCartLoaded] = useState(false);

  // Derive tenant slug from tenantConfig or tenantName for localStorage key
  const cartKey = `auctorum-cart-${tenantName.toLowerCase().replace(/\s+/g, '-')}`;

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(cartKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const ageMs = Date.now() - (parsed.savedAt || 0);
        if (ageMs < 24 * 60 * 60 * 1000) { // 24 hours
          setCart(parsed.items || []);
          if ((parsed.items || []).length > 0) setShowCart(true);
        } else {
          localStorage.removeItem(cartKey);
        }
      }
    } catch { /* ignore corrupt data */ }
    setCartLoaded(true);
  }, [cartKey]);

  // Save cart to localStorage on change (only after initial load)
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
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
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

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const formatMXN = (amount: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

  // Group products by category
  const categories = [...new Set(products.map(p => p.category || 'General'))];

  return (
    <div className="relative pb-32">
      {/* Page title */}
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Catalogo de productos</h2>
        <p className="mt-2 text-gray-500 text-base">
          Seleccione los productos que necesita y genere su cotizacion al instante.
        </p>
      </div>

      {/* Product grid by category */}
      {categories.map(category => (
        <div key={category} className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-7 rounded-full bg-tenant-primary" />
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">
              {category}
            </h3>
            <div className="flex-1 h-px bg-gray-100" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {products
              .filter(p => (p.category || 'General') === category)
              .map(product => {
                const inCart = cart.find(item => item.product.id === product.id);
                const justAdded = addedId === product.id;
                return (
                  <div
                    key={product.id}
                    className="group rounded-xl border border-gray-100 bg-white overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-tenant-primary/10 hover:border-tenant-primary/20 hover-lift"
                  >
                    {product.imageUrl && (
                      <div className="overflow-hidden bg-gray-50 relative h-44">
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex justify-between items-start gap-3 mb-1.5">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-gray-900 leading-tight">{product.name}</h4>
                          {product.sku && (
                            <p className="text-[11px] font-mono text-gray-400 mt-0.5">SKU: {product.sku}</p>
                          )}
                        </div>
                        <span className="text-lg font-bold whitespace-nowrap text-tenant-primary">
                          {formatMXN(parseFloat(product.unitPrice))}
                        </span>
                      </div>
                      {product.description && (
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                          por {product.unitType}
                        </span>
                        {inCart ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
                              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 transition-all hover:bg-gray-50 hover:border-gray-300 active:scale-95"
                              aria-label={`Reducir cantidad de ${product.name}`}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-sm font-bold w-8 text-center text-gray-900" aria-label={`Cantidad: ${inCart.quantity}`}>
                              {inCart.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
                              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 transition-all hover:bg-gray-50 hover:border-gray-300 active:scale-95"
                              aria-label={`Aumentar cantidad de ${product.name}`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-white font-semibold bg-tenant-primary shadow-sm shadow-tenant-primary/20 transition-all duration-200 hover:shadow-md hover:shadow-tenant-primary/30 hover:brightness-110 active:scale-95 ${justAdded ? 'scale-95' : ''}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
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

      {/* Floating cart summary */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
          <div className="bg-white/90 backdrop-blur-xl border-t border-gray-200/50 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
            <div className="mx-auto max-w-6xl px-4 py-3">
              {showCart && (
                <div className="mb-3 max-h-48 overflow-y-auto divide-y divide-gray-100 rounded-lg bg-gray-50/50 border border-gray-100">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-gray-900">{item.product.name}</span>
                        <span className="ml-2 inline-flex items-center justify-center rounded-md bg-tenant-primary/10 px-1.5 py-0.5 text-xs font-bold text-tenant-primary">
                          x{item.quantity}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className="font-semibold text-gray-900 tabular-nums">
                          {formatMXN(parseFloat(item.product.unitPrice) * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
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
                  className="group flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <div className="relative">
                    <ShoppingCart className="h-5 w-5" />
                    <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-tenant-primary text-[10px] font-bold text-white">
                      {totalItems}
                    </span>
                  </div>
                  <span className="font-medium">
                    {cart.length} producto{cart.length !== 1 ? 's' : ''}
                  </span>
                  {showCart
                    ? <ChevronDown className="h-4 w-4 text-gray-400" />
                    : <ChevronUp className="h-4 w-4 text-gray-400" />
                  }
                </button>
                <div className="flex items-center gap-3 sm:gap-5 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <p className="text-xs text-gray-400 hidden sm:block">Subtotal: {formatMXN(subtotal)}</p>
                    <p className="text-xs text-gray-400 hidden sm:block">IVA ({(tenantConfig.quote_settings!.tax_rate * 100).toFixed(0)}%): {formatMXN(tax)}</p>
                    <p className="text-lg sm:text-xl font-bold text-tenant-primary tracking-tight">
                      {formatMXN(total)}
                    </p>
                  </div>
                  <a
                    href={`/quote?items=${encodeURIComponent(JSON.stringify(cart.map(i => ({ id: i.product.id, qty: i.quantity }))))}`}
                    className="group inline-flex items-center gap-2 rounded-xl px-4 sm:px-6 py-3 text-white font-bold text-sm bg-tenant-secondary shadow-lg shadow-tenant-secondary/25 transition-all duration-200 hover:shadow-xl hover:shadow-tenant-secondary/30 hover:brightness-110 active:scale-[0.97]"
                  >
                    Generar cotizacion
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
