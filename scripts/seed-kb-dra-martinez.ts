/**
 * Seed knowledge_base for dra-martinez with 8 rich content chunks.
 * Run: source apps/medconcierge/.env.local && npx tsx scripts/seed-kb-dra-martinez.ts
 *
 * Re-runnable: clears existing KB for this tenant then re-inserts.
 */
import { db } from '../packages/db/index';
import { sql } from 'drizzle-orm';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

const DRA_MARTINEZ_KB = [
  {
    title: 'Ubicación del consultorio',
    content:
      'El consultorio de la Dra. Laura Martínez está ubicado en Saltillo, Coahuila, México. La dirección exacta es Boulevard V. Carranza #3515, Colonia Los Maestros, CP 25240, Saltillo, Coahuila. El consultorio cuenta con estacionamiento propio y acceso para sillas de ruedas. A 5 minutos del Centro Médico Muguerza.',
  },
  {
    title: 'Horarios de atención',
    content:
      'La Dra. Martínez atiende consultas de Lunes a Viernes de 9:00 a 14:00 y de 16:00 a 19:00. Los sábados atiende de 9:00 a 13:00 únicamente con cita previa. Los domingos y días festivos permanece cerrado. Las urgencias dermatológicas se pueden atender fuera de horario mediante WhatsApp previa evaluación.',
  },
  {
    title: 'Servicios y precios',
    content:
      'La consulta de dermatología general tiene un costo de $800 MXN e incluye valoración completa y receta. El tratamiento para acné incluye consulta, análisis de piel y plan personalizado con costo de $1,200 MXN la primera consulta y $600 MXN las revisiones subsecuentes. El manejo de manchas tiene un precio de $1,500 MXN por sesión. La revisión de lunares con dermatoscopia digital cuesta $950 MXN. Los procedimientos de dermatología estética tienen precios variables que se cotizan por valoración.',
  },
  {
    title: 'Formas de pago',
    content:
      'Se aceptan los siguientes métodos de pago: efectivo, transferencia bancaria SPEI al BBVA cuenta CLABE 012180001234567890 a nombre de Dra. Laura Martínez, tarjetas de débito y crédito Visa y MasterCard, y pago con terminal directa en el consultorio. No se aceptan cheques. Todas las consultas incluyen factura electrónica (CFDI) con RFC proporcionado.',
  },
  {
    title: 'Qué llevar a la cita',
    content:
      'Para su primera consulta se recomienda llevar: identificación oficial (INE o pasaporte), historial médico previo si lo tiene, lista de medicamentos actuales, estudios dermatológicos previos si aplican, y llegar 10 minutos antes para llenar formato de primera vez. Para revisiones subsecuentes solo requiere presentar su número de expediente o nombre completo.',
  },
  {
    title: 'Política de cancelación',
    content:
      'Las cancelaciones se pueden realizar hasta 24 horas antes de la cita sin costo. Cancelaciones con menos de 24 horas de anticipación pueden estar sujetas a un cargo del 30% del valor de la consulta. Las reprogramaciones son gratuitas siempre que se realicen con al menos 12 horas de anticipación. Para cancelar o reprogramar puede usar este mismo chat de WhatsApp.',
  },
  {
    title: 'Primera vez',
    content:
      'Si es su primera consulta con la Dra. Martínez, el proceso es: 1) Agendar cita por WhatsApp proporcionando nombre, teléfono, motivo de consulta y horario preferido. 2) Recibir confirmación con dirección y recomendaciones previas. 3) Llegar 10 minutos antes para registro. 4) Consulta de 30-45 minutos con la Dra. 5) Entrega de plan de tratamiento y receta si aplica. La consulta de primera vez es más extensa para conocer su historial.',
  },
  {
    title: 'Urgencias y casos graves',
    content:
      'IMPORTANTE: Si presenta síntomas graves como sangrado, dolor intenso, reacciones alérgicas severas, dificultad respiratoria, o lesiones que crezcan rápidamente, debe acudir DIRECTAMENTE a urgencias médicas. El servicio de WhatsApp no reemplaza atención de emergencia. Servicios de urgencia cercanos: Cruz Roja Saltillo 844-414-3333, IMSS Urgencias 844-415-1500, Hospital Muguerza 844-450-0000.',
  },
];

async function embed(text: string): Promise<number[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set');
  const res = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
  });
  if (!res.ok) throw new Error(`embedding failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return json.data[0].embedding;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set');
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');

  const tenantRows = (await db.execute(sql`
    SELECT id FROM tenants WHERE slug='dra-martinez' LIMIT 1
  `)) as unknown as Array<{ id: string }>;
  const tenantId = tenantRows[0]?.id;
  if (!tenantId) throw new Error('Tenant dra-martinez not found');
  console.log(`Tenant dra-martinez id: ${tenantId}`);

  await db.execute(sql`DELETE FROM knowledge_base WHERE tenant_id = ${tenantId}::uuid`);
  console.log('Cleared previous KB entries');

  for (const item of DRA_MARTINEZ_KB) {
    console.log(`Ingesting: ${item.title}`);
    const embedding = await embed(item.content);
    const embeddingStr = `[${embedding.join(',')}]`;
    const metadata = JSON.stringify({ title: item.title, source: 'seed-dra-martinez' });
    await db.execute(sql`
      INSERT INTO knowledge_base (tenant_id, content, embedding, metadata)
      VALUES (${tenantId}::uuid, ${item.content}, ${embeddingStr}::vector, ${metadata}::jsonb)
    `);
  }

  const countRows = (await db.execute(sql`
    SELECT COUNT(*)::int AS c FROM knowledge_base WHERE tenant_id = ${tenantId}::uuid
  `)) as unknown as Array<{ c: number }>;
  console.log(`Total KB chunks for dra-martinez: ${countRows[0].c}`);
}

main()
  .then(() => {
    console.log('KB seed complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
