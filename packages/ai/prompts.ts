/**
 * System prompt builder per tenant vertical.
 * Picks medical template for tenants with tenant_type='medical' OR tenant.config.medical defined.
 * Falls back to industrial (generic) for others.
 *
 * IMPORTANT: The medical template is calibrated to USE RAG context as authoritative,
 * without restrictive language that causes the LLM to over-censor factual info.
 */
import type { Tenant } from '@quote-engine/db';

const MEDICAL_TEMPLATE = `Eres el asistente oficial del consultorio de {{businessName}} operando por WhatsApp.

Tu propósito es ayudar a pacientes con información completa y precisa del consultorio, agendamiento de citas, y dudas logísticas. Respondes como lo haría una recepcionista profesional, cálida y servicial.

===== INFORMACIÓN QUE SIEMPRE DEBES COMPARTIR CUANDO SE PREGUNTE =====
Si la información está en el CONTEXTO DEL CONSULTORIO o en el CONTEXTO RAG, respóndela directamente. NO redirijas al paciente a "comunicarse con la doctora" para info que YA tienes:
- Dirección exacta del consultorio
- Horarios de atención
- Precios de consultas y servicios
- Teléfonos y métodos de contacto
- Formas de pago aceptadas
- Qué llevar a la cita
- Política de cancelación
- Servicios que ofrece el consultorio
- Información sobre primera consulta

===== LÍMITES CLÍNICOS (NUNCA cruzar) =====
1. NUNCA emites diagnósticos médicos.
2. NUNCA prescribes medicamentos ni dosis.
3. NUNCA interpretas síntomas específicos como una condición.
4. NUNCA sustituyes la consulta médica presencial.
5. Ante síntomas graves (dolor intenso, sangrado activo, desmayo, dificultad respiratoria, accidente, ideación suicida), responde INMEDIATAMENTE: "Por favor acude a urgencias o llama al 911. Tu salud es prioridad."

===== TONO =====
- Profesional, cálido, empático
- Frases cortas y claras (es WhatsApp, no un documento)
- Usa el nombre del paciente cuando lo sepas
- Emojis con moderación (máximo 1 por mensaje, solo si suma)
- Nunca uses lenguaje corporativo frío

===== CONTEXTO DEL CONSULTORIO =====
{{businessInfo}}

{{ragContext}}

{{customInstructions}}`;

const INDUSTRIAL_TEMPLATE = `Eres un asistente comercial B2B que opera por WhatsApp para {{businessName}}.

TUS FUNCIONES:
- Tomar solicitudes de cotización
- Dar información de productos del catálogo
- Derivar contactos calificados al equipo comercial
- Responder preguntas frecuentes sobre envíos, formas de pago, garantías

TU TONO:
- Profesional y directo
- Lenguaje técnico apropiado al sector industrial
- Respuestas concisas, orientadas a la acción

===== INFORMACIÓN DE LA EMPRESA =====
{{businessInfo}}

{{ragContext}}

{{customInstructions}}`;

function isMedicalTenant(tenant: Tenant): boolean {
  if ((tenant as any).tenant_type === 'medical') return true;
  const config = (tenant.config ?? {}) as Record<string, unknown>;
  if (config.medical != null) return true;
  const slug = (tenant.slug || '').toLowerCase();
  if (slug.startsWith('dra-') || slug.startsWith('dr-') || slug.includes('medico')) return true;
  return false;
}

function formatBusinessInfo(tenant: Tenant): string {
  const config = (tenant.config ?? {}) as Record<string, any>;
  const lines: string[] = [];
  lines.push(`- Nombre: ${tenant.name}`);

  // Contact info (new canonical location: config.contact)
  const contact = config.contact ?? {};
  if (contact.address) lines.push(`- Dirección: ${contact.address}`);
  if (contact.phone) lines.push(`- Teléfono: ${contact.phone}`);
  if (contact.email) lines.push(`- Email: ${contact.email}`);

  // Legacy top-level fields (backward compat)
  if (!contact.address && config.address) lines.push(`- Dirección: ${config.address}`);
  if (!contact.phone && config.phone) lines.push(`- Teléfono: ${config.phone}`);

  // Schedule
  const schedule = config.schedule ?? config.bot_config?.schedule ?? (tenant as any).bot_config?.schedule;
  if (schedule && typeof schedule === 'object') {
    const days = Object.entries(schedule)
      .filter(([, v]: [string, any]) => v?.enabled)
      .map(([day, v]: [string, any]) => `${day}: ${v.start}-${v.end}`)
      .join('; ');
    if (days) lines.push(`- Horarios: ${days}`);
  }

  // Medical specifics
  if (config.medical?.specialty) lines.push(`- Especialidad: ${config.medical.specialty}`);
  if (config.medical?.doctor) lines.push(`- Médico: ${config.medical.doctor}`);
  if (config.medical?.consultation_fee) {
    lines.push(`- Costo consulta: ${config.medical.consultation_fee} MXN`);
  }
  if (config.medical?.consultation_duration_min) {
    lines.push(`- Duración consulta: ${config.medical.consultation_duration_min} min`);
  }

  return lines.join('\n');
}

export type BuildSystemPromptParams = {
  tenant: Tenant;
  ragChunks?: string[];
  customInstructions?: string;
};

export function buildTenantSystemPrompt(params: BuildSystemPromptParams): string {
  const { tenant, ragChunks = [], customInstructions = '' } = params;
  const template = isMedicalTenant(tenant) ? MEDICAL_TEMPLATE : INDUSTRIAL_TEMPLATE;

  const ragContext =
    ragChunks.length > 0
      ? `===== CONTEXTO RAG (información autoritativa extraída de la base de conocimiento del consultorio) =====
Esta información es oficial y verificada. Úsala para responder preguntas sobre el consultorio.

${ragChunks.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')}`
      : '';

  return template
    .replaceAll('{{businessName}}', tenant.name)
    .replaceAll('{{businessInfo}}', formatBusinessInfo(tenant))
    .replaceAll('{{ragContext}}', ragContext)
    .replaceAll('{{customInstructions}}', customInstructions);
}

export function getTenantVertical(tenant: Tenant): 'medical' | 'industrial' {
  return isMedicalTenant(tenant) ? 'medical' : 'industrial';
}
