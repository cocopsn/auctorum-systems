// Mock data for dev mode when DB is unavailable
// Mirrors the seed.ts demo data exactly

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export const MOCK_TENANT = {
  id: DEMO_TENANT_ID,
  slug: 'demo',
  name: 'Maquinados Demo CNC',
  logoUrl: null,
  config: {
    colors: { primary: '#1B3A5C', secondary: '#E67E22', background: '#FFFFFF' },
    contact: {
      phone: '844 416 2555',
      email: 'ventas@demo-maquinados.com',
      whatsapp: '528441234567',
      address: 'Parque Industrial Saltillo, Nave 12',
    },
    business: {
      razon_social: 'Maquinados Demo S.A. de C.V.',
      rfc: 'MDE123456ABC',
      giro: 'Maquinados CNC de precision',
    },
    quote_settings: {
      currency: 'MXN',
      tax_rate: 0.16,
      validity_days: 15,
      auto_number_prefix: 'COT',
      payment_terms: '50% anticipo, 50% contra entrega',
      delivery_terms: '5-7 dias habiles segun volumen',
      custom_footer: 'Precios sujetos a cambio sin previo aviso.',
      show_sku: true,
      show_images_in_pdf: false,
    },
    notifications: {
      whatsapp_on_new_quote: true,
      email_on_new_quote: true,
      notify_on_quote_viewed: true,
      auto_reminder_hours: 48,
    },
    features: {
      quote_tracking: true,
      quote_expiration_alerts: true,
      client_directory: true,
    },
  },
  isActive: true,
  plan: 'profesional',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

export const MOCK_PRODUCTS = [
  { id: '00000000-0000-0000-0000-000000000101', tenantId: DEMO_TENANT_ID, name: 'Pieza torneada CNC O25mm', sku: 'CNC-T-025', unitPrice: '185.00', unitType: 'pieza', category: 'Torneado', description: 'Pieza de acero 1045 torneada en CNC, tolerancia +/-0.01mm', imageUrl: null, isActive: true, sortOrder: 0, createdAt: new Date() },
  { id: '00000000-0000-0000-0000-000000000102', tenantId: DEMO_TENANT_ID, name: 'Pieza fresada CNC 100x50mm', sku: 'CNC-F-100', unitPrice: '320.00', unitType: 'pieza', category: 'Fresado', description: 'Placa fresada aluminio 6061-T6, acabado fino', imageUrl: null, isActive: true, sortOrder: 1, createdAt: new Date() },
  { id: '00000000-0000-0000-0000-000000000103', tenantId: DEMO_TENANT_ID, name: 'Brida mecanizada O150mm', sku: 'CNC-B-150', unitPrice: '750.00', unitType: 'pieza', category: 'Torneado', description: 'Brida de acero inoxidable 304, 6 barrenos M12', imageUrl: null, isActive: true, sortOrder: 2, createdAt: new Date() },
  { id: '00000000-0000-0000-0000-000000000104', tenantId: DEMO_TENANT_ID, name: 'Eje rectificado O30x200mm', sku: 'CNC-E-030', unitPrice: '420.00', unitType: 'pieza', category: 'Rectificado', description: 'Eje de acero 4140 con rectificado cilindrico Ra 0.4', imageUrl: null, isActive: true, sortOrder: 3, createdAt: new Date() },
  { id: '00000000-0000-0000-0000-000000000105', tenantId: DEMO_TENANT_ID, name: 'Inserto de molde (EDM)', sku: 'CNC-M-EDM', unitPrice: '2800.00', unitType: 'pieza', category: 'Electroerosion', description: 'Inserto de acero D2 maquinado por electroerosion', imageUrl: null, isActive: true, sortOrder: 4, createdAt: new Date() },
  { id: '00000000-0000-0000-0000-000000000106', tenantId: DEMO_TENANT_ID, name: 'Engrane recto modulo 2', sku: 'CNC-G-M2', unitPrice: '580.00', unitType: 'pieza', category: 'Fresado', description: 'Engrane de 40 dientes, acero 8620, tratamiento termico', imageUrl: null, isActive: true, sortOrder: 5, createdAt: new Date() },
  { id: '00000000-0000-0000-0000-000000000107', tenantId: DEMO_TENANT_ID, name: 'Prototipo rapido aluminio', sku: 'PROTO-AL', unitPrice: '1500.00', unitType: 'pieza', category: 'Prototipado', description: 'Prototipo mecanizado 5 ejes, entrega 48hrs', imageUrl: null, isActive: true, sortOrder: 6, createdAt: new Date() },
  { id: '00000000-0000-0000-0000-000000000108', tenantId: DEMO_TENANT_ID, name: 'Servicio de maquinado por hora', sku: 'SRV-HORA', unitPrice: '650.00', unitType: 'pieza', category: 'Servicio', description: 'Hora de maquinado CNC en centro de mecanizado Haas VF-2', imageUrl: null, isActive: true, sortOrder: 7, createdAt: new Date() },
  { id: '00000000-0000-0000-0000-000000000109', tenantId: DEMO_TENANT_ID, name: 'Lote produccion 100+ piezas', sku: 'LOTE-100', unitPrice: '145.00', unitType: 'pieza', category: 'Produccion', description: 'Precio unitario para lotes de 100+ piezas estandar', imageUrl: null, isActive: true, sortOrder: 8, createdAt: new Date() },
  { id: '00000000-0000-0000-0000-000000000110', tenantId: DEMO_TENANT_ID, name: 'Fixture/Jig a medida', sku: 'FIX-CUST', unitPrice: '3500.00', unitType: 'pieza', category: 'Herramental', description: 'Dispositivo de sujecion disenado a medida para linea de produccion', imageUrl: null, isActive: true, sortOrder: 9, createdAt: new Date() },
];

export const MOCK_QUOTES = [
  {
    id: '00000000-0000-0000-0000-000000000201',
    tenantId: DEMO_TENANT_ID,
    quoteNumber: 1,
    trackingToken: 'abc123def456',
    clientName: 'Juan Perez',
    clientEmail: 'juan@magna.com',
    clientPhone: '8441234567',
    clientCompany: 'Magna International',
    subtotal: '1255.00',
    taxRate: '0.1600',
    taxAmount: '200.80',
    total: '1455.80',
    pdfUrl: null,
    status: 'viewed',
    createdAt: new Date(Date.now() - 2 * 86400000),
    sentAt: new Date(Date.now() - 2 * 86400000),
    viewedAt: new Date(Date.now() - 86400000),
    acceptedAt: null,
    expiresAt: new Date(Date.now() + 13 * 86400000),
  },
  {
    id: '00000000-0000-0000-0000-000000000202',
    tenantId: DEMO_TENANT_ID,
    quoteNumber: 2,
    trackingToken: 'xyz789abc012',
    clientName: 'Maria Garcia',
    clientEmail: 'maria@lear.com',
    clientPhone: '8449876543',
    clientCompany: 'Lear Corporation',
    subtotal: '5600.00',
    taxRate: '0.1600',
    taxAmount: '896.00',
    total: '6496.00',
    pdfUrl: null,
    status: 'sent',
    createdAt: new Date(Date.now() - 86400000),
    sentAt: new Date(Date.now() - 86400000),
    viewedAt: null,
    acceptedAt: null,
    expiresAt: new Date(Date.now() + 14 * 86400000),
  },
  {
    id: '00000000-0000-0000-0000-000000000203',
    tenantId: DEMO_TENANT_ID,
    quoteNumber: 3,
    trackingToken: 'mno345pqr678',
    clientName: 'Carlos Lopez',
    clientEmail: 'carlos@stellantis.com',
    clientPhone: '8445551234',
    clientCompany: 'Stellantis',
    subtotal: '14500.00',
    taxRate: '0.1600',
    taxAmount: '2320.00',
    total: '16820.00',
    pdfUrl: null,
    status: 'accepted',
    createdAt: new Date(Date.now() - 7 * 86400000),
    sentAt: new Date(Date.now() - 7 * 86400000),
    viewedAt: new Date(Date.now() - 6 * 86400000),
    acceptedAt: new Date(Date.now() - 5 * 86400000),
    expiresAt: new Date(Date.now() + 8 * 86400000),
  },
];

export function getMockTenant(slug: string) {
  if (slug === 'demo') return MOCK_TENANT;
  return null;
}

export function getMockProducts(_tenantId: string) {
  return MOCK_PRODUCTS;
}

export function getMockQuotes(_tenantId: string) {
  return MOCK_QUOTES;
}
