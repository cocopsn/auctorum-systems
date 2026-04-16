import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Replicate the schemas from the route files so tests can run independently
// without spinning up Next.js. If the canonical schemas are ever extracted to
// a shared `@quote-engine/validators` package, swap these imports.
// ---------------------------------------------------------------------------

// From apps/web/app/api/quotes/route.ts
const quoteRequestSchema = z.object({
  tenantSlug: z.string().min(1, 'Tenant requerido').max(63),
  clientName: z.string().min(2, 'Nombre requerido (min. 2 caracteres)').max(255),
  clientEmail: z.string().email('Correo invalido').max(255).optional().or(z.literal('')),
  clientPhone: z.string().min(7, 'Telefono requerido (min. 7 digitos)').max(20),
  clientCompany: z.string().min(2, 'Empresa requerida').max(255),
  items: z.array(z.object({
    id: z.string().uuid('ID de producto invalido'),
    qty: z.number().positive('Cantidad debe ser positiva').max(99999),
  })).min(1, 'Debe incluir al menos un producto').max(50),
});

// From apps/web/app/api/products/route.ts
const createProductSchema = z.object({
  tenantSlug: z.string().min(1).max(63),
  name: z.string().min(1, 'Nombre requerido').max(255),
  sku: z.string().max(100).optional().or(z.literal('')),
  unitPrice: z.string().refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Precio invalido'),
  unitType: z.string().max(50).default('pieza'),
  category: z.string().max(100).optional().or(z.literal('')),
  description: z.string().optional().or(z.literal('')),
});

// From apps/web/app/api/tracking/route.ts
const VALID_EVENT_TYPES = [
  'opened',
  'pdf_downloaded',
  'time_on_page',
  'accepted',
  'rejected',
] as const;

const trackingSchema = z.object({
  token: z.string().min(1).max(64),
  eventType: z.enum(VALID_EVENT_TYPES),
  quoteId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('quoteRequestSchema', () => {
  const validInput = {
    tenantSlug: 'toolroom',
    clientName: 'Juan Perez',
    clientEmail: 'juan@example.com',
    clientPhone: '5551234567',
    clientCompany: 'Acme SA de CV',
    items: [
      { id: '550e8400-e29b-41d4-a716-446655440000', qty: 10 },
    ],
  };

  it('should accept valid input', () => {
    const result = quoteRequestSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should accept valid input without email', () => {
    const result = quoteRequestSchema.safeParse({ ...validInput, clientEmail: '' });
    expect(result.success).toBe(true);
  });

  it('should accept valid input with email omitted', () => {
    const { clientEmail, ...noEmail } = validInput;
    const result = quoteRequestSchema.safeParse(noEmail);
    expect(result.success).toBe(true);
  });

  it('should reject empty items array', () => {
    const result = quoteRequestSchema.safeParse({ ...validInput, items: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('al menos un producto');
    }
  });

  it('should reject more than 50 items', () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      id: '550e8400-e29b-41d4-a716-446655440000',
      qty: 1,
    }));
    const result = quoteRequestSchema.safeParse({ ...validInput, items });
    expect(result.success).toBe(false);
  });

  it('should reject negative quantities', () => {
    const result = quoteRequestSchema.safeParse({
      ...validInput,
      items: [{ id: '550e8400-e29b-41d4-a716-446655440000', qty: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it('should reject zero quantity', () => {
    const result = quoteRequestSchema.safeParse({
      ...validInput,
      items: [{ id: '550e8400-e29b-41d4-a716-446655440000', qty: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('should reject quantity exceeding 99999', () => {
    const result = quoteRequestSchema.safeParse({
      ...validInput,
      items: [{ id: '550e8400-e29b-41d4-a716-446655440000', qty: 100000 }],
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing client name', () => {
    const result = quoteRequestSchema.safeParse({ ...validInput, clientName: '' });
    expect(result.success).toBe(false);
  });

  it('should reject client name shorter than 2 characters', () => {
    const result = quoteRequestSchema.safeParse({ ...validInput, clientName: 'A' });
    expect(result.success).toBe(false);
  });

  it('should reject missing tenant slug', () => {
    const result = quoteRequestSchema.safeParse({ ...validInput, tenantSlug: '' });
    expect(result.success).toBe(false);
  });

  it('should reject phone shorter than 7 characters', () => {
    const result = quoteRequestSchema.safeParse({ ...validInput, clientPhone: '123' });
    expect(result.success).toBe(false);
  });

  it('should reject phone longer than 20 characters', () => {
    const result = quoteRequestSchema.safeParse({ ...validInput, clientPhone: '1'.repeat(21) });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const result = quoteRequestSchema.safeParse({ ...validInput, clientEmail: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('should reject non-UUID product id', () => {
    const result = quoteRequestSchema.safeParse({
      ...validInput,
      items: [{ id: 'not-a-uuid', qty: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing company', () => {
    const result = quoteRequestSchema.safeParse({ ...validInput, clientCompany: '' });
    expect(result.success).toBe(false);
  });

  it('should reject company shorter than 2 characters', () => {
    const result = quoteRequestSchema.safeParse({ ...validInput, clientCompany: 'X' });
    expect(result.success).toBe(false);
  });

  it('should accept multiple valid items', () => {
    const result = quoteRequestSchema.safeParse({
      ...validInput,
      items: [
        { id: '550e8400-e29b-41d4-a716-446655440000', qty: 5 },
        { id: '660e8400-e29b-41d4-a716-446655440001', qty: 100 },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('createProductSchema', () => {
  const validProduct = {
    tenantSlug: 'toolroom',
    name: 'Motor electrico 5HP',
    unitPrice: '12500.00',
    unitType: 'pieza',
  };

  it('should accept valid product', () => {
    const result = createProductSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('should default unitType to pieza', () => {
    const { unitType, ...noUnitType } = validProduct;
    const result = createProductSchema.safeParse(noUnitType);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unitType).toBe('pieza');
    }
  });

  it('should reject empty name', () => {
    const result = createProductSchema.safeParse({ ...validProduct, name: '' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid price (non-numeric)', () => {
    const result = createProductSchema.safeParse({ ...validProduct, unitPrice: 'abc' });
    expect(result.success).toBe(false);
  });

  it('should reject negative price', () => {
    const result = createProductSchema.safeParse({ ...validProduct, unitPrice: '-100' });
    expect(result.success).toBe(false);
  });

  it('should accept zero price', () => {
    const result = createProductSchema.safeParse({ ...validProduct, unitPrice: '0' });
    expect(result.success).toBe(true);
  });

  it('should accept optional sku as empty string', () => {
    const result = createProductSchema.safeParse({ ...validProduct, sku: '' });
    expect(result.success).toBe(true);
  });

  it('should accept optional category', () => {
    const result = createProductSchema.safeParse({ ...validProduct, category: 'Motores' });
    expect(result.success).toBe(true);
  });
});

describe('trackingSchema', () => {
  it('should accept valid tracking event', () => {
    const result = trackingSchema.safeParse({
      token: 'abc123',
      eventType: 'opened',
    });
    expect(result.success).toBe(true);
  });

  it('should accept event with optional quoteId', () => {
    const result = trackingSchema.safeParse({
      token: 'abc123',
      eventType: 'pdf_downloaded',
      quoteId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('should accept event with metadata', () => {
    const result = trackingSchema.safeParse({
      token: 'abc123',
      eventType: 'time_on_page',
      metadata: { seconds: 42 },
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid event type', () => {
    const result = trackingSchema.safeParse({
      token: 'abc123',
      eventType: 'invalid_event',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty token', () => {
    const result = trackingSchema.safeParse({
      token: '',
      eventType: 'opened',
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-UUID quoteId', () => {
    const result = trackingSchema.safeParse({
      token: 'abc123',
      eventType: 'opened',
      quoteId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should accept all valid event types', () => {
    for (const eventType of VALID_EVENT_TYPES) {
      const result = trackingSchema.safeParse({ token: 'abc', eventType });
      expect(result.success).toBe(true);
    }
  });
});
