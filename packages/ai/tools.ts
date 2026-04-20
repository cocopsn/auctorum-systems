/**
 * OpenAI function calling tool definitions.
 * These are the capabilities the LLM can invoke during a conversation.
 */

export const WHATSAPP_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'select_doctor',
      description:
        'Seleccionar el doctor con el que el paciente desea agendar. OBLIGATORIO llamar cuando el tenant tiene multiples doctores y el paciente indica con quien quiere cita. Una vez seleccionado, el doctor se recuerda para toda la conversacion.',
      parameters: {
        type: 'object',
        properties: {
          doctor_name: {
            type: 'string',
            description: 'Nombre del doctor que el paciente eligio (busqueda flexible por nombre parcial)',
          },
        },
        required: ['doctor_name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'check_availability',
      description:
        'Verifica si hay disponibilidad en el calendario para una fecha/hora especifica. SIEMPRE llama esto ANTES de create_appointment. Si no se proporciona hora, devuelve todos los slots disponibles del dia. En consultorios multi-doctor, filtra por el doctor seleccionado.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description:
              'Fecha en formato YYYY-MM-DD. NO envies fechas relativas — el modelo debe resolver a fecha absoluta antes de llamar.',
          },
          time: {
            type: 'string',
            description:
              'Hora deseada en formato HH:MM (24h). Si el paciente no especifico hora aun, omite este parametro y el tool devolvera los slots libres del dia.',
          },
          duration_min: {
            type: 'integer',
            description:
              'Duracion en minutos. Default 30 si el consultorio no especifica otro.',
            default: 30,
          },
          doctor_id: {
            type: 'string',
            description:
              'UUID del doctor (se obtiene de select_doctor). En consultorios multi-doctor es obligatorio.',
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
        'Crea una cita en el calendario del consultorio. Solo llamar DESPUES de: (1) confirmar disponibilidad con check_availability, (2) tener nombre completo y motivo de consulta, (3) el paciente haya CONFIRMADO explicitamente todos los datos.',
      parameters: {
        type: 'object',
        properties: {
          patient_name: {
            type: 'string',
            description: 'Nombre completo del paciente, tal como lo proporciono',
          },
          patient_phone: {
            type: 'string',
            description:
              'Numero de telefono del paciente (WhatsApp E.164 sin +, ej: 5218445387404)',
          },
          patient_email: {
            type: 'string',
            description: 'Email del paciente, si lo proporciono. Opcional.',
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
            description: 'Duracion en minutos. Default 30.',
            default: 30,
          },
          reason: {
            type: 'string',
            description:
              'Motivo de la consulta en palabras del paciente. Max 500 chars.',
          },
          doctor_id: {
            type: 'string',
            description:
              'UUID del doctor con quien se agenda (se obtiene de select_doctor). Obligatorio en multi-doctor.',
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
        'Retorna informacion estructurada del consultorio (direccion, horarios, costos, metodos de pago). Util cuando el paciente pide informacion general.',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            enum: ['all', 'location', 'hours', 'fees', 'payment_methods', 'contact'],
            description: 'Tema especifico del que se quiere info. all devuelve todo.',
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
        'Escala la conversacion a un humano (la doctora o staff). Usalo cuando: (1) EMERGENCIA REAL (urgency=emergency). (2) El paciente pide explicitamente hablar con la doctora (urgency=medium). (3) Preguntas medicas complejas (urgency=low). Dolor simple localizado NO es emergencia.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Motivo de la escalacion, descripcion breve',
          },
          urgency: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'emergency'],
            description: 'Nivel de urgencia.',
          },
          patient_message: {
            type: 'string',
            description: 'Mensaje original del paciente que motivo la escalacion',
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
        'Confirma una cita existente del paciente.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: {
            type: 'string',
            description: 'UUID de la cita a confirmar. Si no se conoce, omitir.',
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
        'Cancela una cita existente del paciente.',
      parameters: {
        type: 'object',
        properties: {
          appointment_id: {
            type: 'string',
            description: 'UUID de la cita a cancelar. Si no se conoce, omitir.',
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
  | 'select_doctor'
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
