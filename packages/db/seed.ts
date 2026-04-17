import { db, tenants, products, DEFAULT_TENANT_CONFIG, type TenantConfig } from './index';

const DEMO_CONFIG: TenantConfig = {
  ...DEFAULT_TENANT_CONFIG,
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
    giro: 'Maquinados CNC de precisión',
  },
  quote_settings: {
    ...DEFAULT_TENANT_CONFIG.quote_settings,
    payment_terms: '50% anticipo, 50% contra entrega',
    delivery_terms: '5-7 días hábiles según volumen',
  },
};

const DEMO_PRODUCTS = [
  { name: 'Pieza torneada CNC Ø25mm', sku: 'CNC-T-025', unitPrice: '185.00', unitType: 'pieza', category: 'Torneado', description: 'Pieza de acero 1045 torneada en CNC, tolerancia ±0.01mm' },
  { name: 'Pieza fresada CNC 100x50mm', sku: 'CNC-F-100', unitPrice: '320.00', unitType: 'pieza', category: 'Fresado', description: 'Placa fresada aluminio 6061-T6, acabado fino' },
  { name: 'Brida mecanizada Ø150mm', sku: 'CNC-B-150', unitPrice: '750.00', unitType: 'pieza', category: 'Torneado', description: 'Brida de acero inoxidable 304, 6 barrenos M12' },
  { name: 'Eje rectificado Ø30x200mm', sku: 'CNC-E-030', unitPrice: '420.00', unitType: 'pieza', category: 'Rectificado', description: 'Eje de acero 4140 con rectificado cilíndrico Ra 0.4' },
  { name: 'Inserto de molde (EDM)', sku: 'CNC-M-EDM', unitPrice: '2800.00', unitType: 'pieza', category: 'Electroerosión', description: 'Inserto de acero D2 maquinado por electroerosión' },
  { name: 'Engrane recto módulo 2', sku: 'CNC-G-M2', unitPrice: '580.00', unitType: 'pieza', category: 'Fresado', description: 'Engrane de 40 dientes, acero 8620, tratamiento térmico' },
  { name: 'Prototipo rápido aluminio', sku: 'PROTO-AL', unitPrice: '1500.00', unitType: 'pieza', category: 'Prototipado', description: 'Prototipo mecanizado 5 ejes, entrega 48hrs' },
  { name: 'Servicio de maquinado por hora', sku: 'SRV-HORA', unitPrice: '650.00', unitType: 'hora', category: 'Servicio', description: 'Hora de maquinado CNC en centro de mecanizado Haas VF-2' },
  { name: 'Lote producción 100+ piezas', sku: 'LOTE-100', unitPrice: '145.00', unitType: 'pieza', category: 'Producción', description: 'Precio unitario para lotes de 100+ piezas estándar' },
  { name: 'Fixture/Jig a medida', sku: 'FIX-CUST', unitPrice: '3500.00', unitType: 'pieza', category: 'Herramental', description: 'Dispositivo de sujeción diseñado a medida para línea de producción' },
];

async function seed() {
  console.log('Seeding demo tenant...');

  const [tenant] = await db.insert(tenants).values({
    slug: 'demo',
    name: 'Maquinados Demo CNC',
    config: DEMO_CONFIG,
    plan: 'profesional',
  }).returning();

  console.log(`Tenant created: ${tenant.slug} (${tenant.id})`);

  for (const p of DEMO_PRODUCTS) {
    await db.insert(products).values({
      tenantId: tenant.id,
      ...p,
      isActive: true,
      sortOrder: DEMO_PRODUCTS.indexOf(p),
    });
  }

  console.log(`${DEMO_PRODUCTS.length} products seeded`);
  console.log(`\nDemo portal will be at: demo.auctorum.com.mx`);
  process.exit(0);
}

seed().catch(console.error);
