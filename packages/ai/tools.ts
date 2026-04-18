/**
 * OpenAI function calling tool definitions.
 * These are the capabilities the LLM can invoke during a conversation.
 */

export const WHATSAPP_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'check_availability',
      description:
        'Verifica si hay disponibilidad en el calendario para una fecha/hora específica. SIEMPRE llama esto ANTES de create_appointment. Si no se proporciona hora, devuelve todos los slots disponibles del día.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description:
              'Fecha en formato YYYY-MM-DD. NO envíes "mañana" o "hoy" — el modelo debe resolver a fecha absoluta antes de llamar.',
          },
          time: {
            type: 'string',
            description:
              'Hora deseada en formato HH:MM (24h). Si el paciente no especificó hora aún, omite este parámetro y el tool devolverá los slots libres del día.',
          },
          duration_min: {
            type: 'integer',
            description:
              'Duración en minutos. Default 30 si el consultorio no especifica otro.',
            default: 30,
          },
        },
        required: ['date'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_appointment',
      description:
        'Crea una cita en el calendario del consultorio. Solo llamar DESPUÉS de: (1) confirmar disponibilidad con check_availability, (2) tener nombre completo y motivo de consulta, (3) el paciente haya CONFIRMADO explícitamente todos los datos.',
      parameters: {
        type: 'object',
        properties: {
          patient_name: {
            type: 'string',
            description: 'Nombre completo del paciente, tal como lo proporcionó',
          },
          patient_phone: {
            type: 'string',
            description:
              'Número de teléfono del paciente (WhatsApp E.164 sin +, ej: 5218445387404)',
          },
          patient_email: {
            type: 'string',
            description: 'Email del paciente, si lo proporcionó. Opcional.',
          },
          date: {
            type: 'string',
            description: 'Fecha en formato YYYY-MM-DD',
          },
          time: {
            type: 'string',
            description: 'Hora inicio en formato HH:MM (24h)',
          },
          duration_min: {
            type: 'integer',
            description: 'Duración en minutos. Default 30.',
            default: 30,
          },
          reason: {
            type: 'string',
            description:
              'Motivo de la consulta en palabras del paciente. Máx 500 chars.',
          },
        },
        required: ['patient_name', 'patient_phone', 'date', 'time', 'reason'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_consultation_info',
      description:
        'Retorna información estructurada del consultorio (dirección, horarios, costos, métodos de pago). Útil cuando el paciente pide información general. Los chunks de RAG ya están disponibles en el contexto — este tool es para casos donde necesitas datos estructurados (ej. al confirmar una cita, incluir el costo).',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: ['all', 'location', 'hours', 'fees', 'payment_methods', 'contact'],
            description: 'Tema específico del que se quiere info. "all" devuelve todo.',
          },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'escalate_to_human',
      description:
        'Escala la conversación a un humano (la doctora o staff). Úsalo cuando: (1) el paciente menciona síntomas graves (dolor intenso, sangrado activo, dificultad respiratoria, desmayo, accidente, emergencia), (2) el paciente pide explícitamente hablar con la doctora o un humano, (3) la conversación excede tu capacidad (preguntas médicas complejas, quejas formales).',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Motivo de la escalación, descripción breve',
          },
          urgency: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'emergency'],
            description:
              'Nivel de urgencia. "emergency" activa alertas inmediatas.',
          },
          patient_message: {
            type: 'string',
            description:
              'Mensaje original del paciente que motivó la escalación',
          },
        },
        required: ['reason', 'urgency'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'confirm_appointment',
      description:
        'Confirma una cita existente del paciente. Usar cuando el paciente dice "confirmo", "si", "si confirmo", "ahi estare" o similar en respuesta a un recordatorio de cita.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: {
            type: 'string',
            description:
              'UUID de la cita a confirmar. Si no se conoce, omitir y el sistema buscara la proxima cita del paciente.',
          },
          patient_phone: {
            type: 'string',
            description: 'Numero de telefono del paciente (del contexto de WhatsApp)',
          },
        },
        required: ['patient_phone'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cancel_appointment',
      description:
        'Cancela una cita existente del paciente. Usar cuando el paciente dice "cancelo", "no puedo", "no voy a poder", "cancelo la cita" o similar.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: {
            type: 'string',
            description:
              'UUID de la cita a cancelar. Si no se conoce, omitir y el sistema buscara la proxima cita del paciente.',
          },
          patient_phone: {
            type: 'string',
            description: 'Numero de telefono del paciente (del contexto de WhatsApp)',
          },
          reason: {
            type: 'string',
            description: 'Motivo de cancelacion proporcionado por el paciente',
          },
        },
        required: ['patient_phone'],
      },
    },
  },
];

export type ToolName =
  | 'check_availability'
  | 'create_appointment'
  | 'get_consultation_info'
  | 'escalate_to_human'
  | 'confirm_appointment'
  | 'cancel_appointment';

export type ToolCallResult = {
  tool: ToolName;
  success: boolean;
  result: Record<string, any>;
  error?: string;
};
