import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db, products } from '@quote-engine/db';
import { eq, and, isNull } from 'drizzle-orm';
import { validateOrigin } from '@/lib/csrf';

const updateProductSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(255).optional(),
  sku: z.string().max(100).optional().or(z.literal('')),
  unitPrice: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Precio inválido').optional(),
  unitType: z.string().max(50).optional(),
  category: z.string().max(100).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
});

type RouteContext = { params: { productId: string } };

// PUT /api/products/[productId]
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    // CSRF: validate origin for state-changing requests
    if (!validateOrigin(request)) {
      return Response.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const { productId } = params;
    const body = await request.json();
    const parsed = updateProductSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), isNull(products.deletedAt)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const { name, sku, unitPrice, unitType, category, description } = parsed.data;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (sku !== undefined) updateData.sku = sku || null;
    if (unitPrice !== undefined) updateData.unitPrice = unitPrice;
    if (unitType !== undefined) updateData.unitType = unitType;
    if (category !== undefined) updateData.category = category || null;
    if (description !== undefined) updateData.description = description || null;

    const [updated] = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, productId))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('PUT /api/products/[productId] error:', error);
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
  }
}

// DELETE /api/products/[productId] — soft delete (set deleted_at)
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    // CSRF: validate origin for state-changing requests
    if (!validateOrigin(_request)) {
      return Response.json({ error: 'Invalid origin' }, { status: 403 });
    }

    const { productId } = params;

    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), isNull(products.deletedAt)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    await db
      .update(products)
      .set({ isActive: false, deletedAt: new Date() })
      .where(eq(products.id, productId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/products/[productId] error:', error);
    return NextResponse.json({ error: 'Error al desactivar producto' }, { status: 500 });
  }
}
