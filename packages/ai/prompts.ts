/**
 * System prompt builder per tenant vertical.
 * Picks medical template for tenants with tenant_type='medical' OR tenant.config.medical defined.
 * Falls back to industrial (generic) for others.
 */
import type { Tenant } from '@quote-engine/db';

const MEDICAL_TEMPLATE = `Eres un asistente virtual de atención médica que opera por WhatsApp para el consultorio de {{businessName}}.

REGLAS ESTRICTAS E INQUEBRANTABLES:
1. NUNCA emites diagnósticos médicos.
2. NUNCA prescribes medicamentos ni dosis.
3. NUNCA interpretas síntomas como una condición específica.
4. NUNCA sustituyes la consulta médica presencial.
5. Si el paciente describe síntomas graves (dolor intenso, sangrado, desmayo, dificultad respiratoria, accidente, ideación suicida), responde INMEDIATAMENTE: "Por favor contacta al servicio de emergencias o ve a urgencias. Tu salud es prioridad."

TUS FUNCIONES:
- Agendar, confirmar, reprogramar o cancelar citas
- Dar información del consultorio: dirección, horarios, servicios, precios
- Responder dudas logísticas (qué llevar a la cita, cómo llegar, formas de pago)
- Tomar datos del paciente para una cita (nombre, motivo, datos de contacto)

TU TONO:
- Profesional, cálido y empático
- Frases cortas y claras (WhatsApp no es un documento)
- Usa el nombre del paciente cuando lo sepas
- Emojis con moderación (máximo 1 por mensaje, solo si suma)

INFORMACIÓN DEL CONSULTORIO:
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

INFORMACIÓN DE LA EMPRESA:
{{businessInfo}}

{{ragContext}}

{{customInstructions}}`;

function isMedicalTenant(tenant: Tenant): boolean {
  if ((tenant as any).tenant_type === 'medical') return true;
  const config = (tenant.config ?? {}) as Record<string, unknown>;
  if (config.medical != null) return true;
  // Fallback: known medical slugs
  const slug = (tenant.slug || '').toLowerCase();
  if (slug.startsWith('dra-') || slug.startsWith('dr-') || slug.includes('medico')) return true;
  return false;
}

function formatBusinessInfo(tenant: Tenant): string {
  const config = (tenant.config ?? {}) as Record<string, any>;
  const lines: string[] = [];
  lines.push(`- Nombre: ${tenant.name}`);
  const botCfg = (tenant as any).bot_config || config.bot_config || {};
  if (botCfg?.schedule) {
    const days = Object.entries(botCfg.schedule)
      .filter(([, v]: [string, any]) => v?.enabled)
      .map(([day, v]: [string, any]) => `${day}: ${v.start}-${v.end}`)
      .join('; ');
    if (days) lines.push(`- Horarios: ${days}`);
  }
  if (config.address) lines.push(`- Dirección: ${config.address}`);
  if (config.phone) lines.push(`- Teléfono: ${config.phone}`);
  if (config.medical?.specialty) lines.push(`- Especialidad: ${config.medical.specialty}`);
  if (config.medical?.doctor) lines.push(`- Médico: ${config.medical.doctor}`);
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
      ? `CONTEXTO RELEVANTE DE LA BASE DE CONOCIMIENTO (usa SOLO esta información para responder consultas específicas del negocio):\n${ragChunks
          .map((c, i) => `[${i + 1}] ${c}`)
          .join('\n\n')}`
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
