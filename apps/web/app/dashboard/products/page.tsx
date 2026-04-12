'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { Package, Loader2 } from 'lucide-react'
import ProductsClient from '@/components/dashboard/ProductsClient'

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [tenantSlug, setTenantSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/products', { credentials: 'include' })
      if (!res.ok) throw new Error('Error al cargar productos')
      const data = await res.json()
      setProducts(data.products || [])
      setTenantSlug(data.tenantSlug || '')
    } catch (err: any) {
      setError(err?.message || 'Error al cargar productos')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Productos</h1>
        <p className="text-sm text-[var(--text-tertiary)] mt-0.5">Catálogo de productos del tenant</p>
      </div>
      <ProductsClient
        initialProducts={products}
        tenantSlug={tenantSlug}
      />
    </div>
  )
}
