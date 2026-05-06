// OpenAPI 3.0 spec served as JSON. Public — no auth required so the
// Swagger UI page can fetch it directly. URL: /api/v1/spec

import { NextResponse } from 'next/server'

const SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'Auctorum Med API',
    description:
      'API pública para integración con el sistema de Concierge Médico Auctorum. Permite gestionar citas, pacientes, disponibilidad y doctores. Autenticación por API key (Bearer) emitida desde Settings → API Keys.',
    version: '1.0.0',
    contact: {
      name: 'Auctorum Systems',
      email: 'contacto@auctorum.com.mx',
      url: 'https://auctorum.com.mx',
    },
  },
  servers: [
    { url: 'https://portal.auctorum.com.mx/api/v1', description: 'Producción (portal)' },
  ],
  security: [{ ApiKeyAuth: [] }],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'ak_live_*',
        description: 'API Key del tenant. Formato: `Bearer ak_live_<64 hex chars>`',
      },
    },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' } } },
      Pagination: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          page: { type: 'integer' },
          per_page: { type: 'integer' },
        },
      },
      Patient: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string', nullable: true },
          dateOfBirth: { type: 'string', format: 'date', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Appointment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          patientId: { type: 'string', format: 'uuid' },
          patientName: { type: 'string' },
          patientPhone: { type: 'string' },
          doctorId: { type: 'string', format: 'uuid', nullable: true },
          date: { type: 'string', format: 'date' },
          startTime: { type: 'string', example: '10:30' },
          endTime: { type: 'string', example: '11:00' },
          status: {
            type: 'string',
            enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'],
          },
          reason: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Slot: {
        type: 'object',
        properties: {
          start: { type: 'string', example: '10:00' },
          end: { type: 'string', example: '10:30' },
          available: { type: 'boolean' },
        },
      },
    },
  },
  paths: {
    '/appointments': {
      get: {
        summary: 'Listar citas',
        description: 'Devuelve citas del consultorio paginadas. Filtros opcionales por status y rango de fechas.',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
          { name: 'per_page', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'],
            },
          },
          { name: 'date_from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'date_to', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Appointment' } },
                    meta: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          401: { description: 'API key inválida' },
        },
      },
      post: {
        summary: 'Crear cita',
        description:
          'Si `patientId` no se proporciona, debe enviarse `patientName` + `patientPhone` y el sistema busca o crea el paciente por teléfono. Requiere permiso `write`.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['date', 'startTime'],
                properties: {
                  patientId: { type: 'string', format: 'uuid' },
                  patientName: { type: 'string' },
                  patientPhone: { type: 'string', example: '+528441234567' },
                  doctorId: { type: 'string', format: 'uuid' },
                  date: { type: 'string', format: 'date' },
                  startTime: { type: 'string', example: '10:30' },
                  endTime: { type: 'string', example: '11:00' },
                  reason: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Cita creada' },
          400: { description: 'Datos inválidos' },
          401: { description: 'API key inválida' },
          403: { description: 'Permisos insuficientes (requiere write)' },
          404: { description: 'patientId no encontrado en el tenant' },
        },
      },
    },
    '/patients': {
      get: {
        summary: 'Listar pacientes',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'per_page', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'search', in: 'query', schema: { type: 'string', minLength: 2 }, description: 'Busca por nombre, teléfono o email' },
        ],
        responses: { 200: { description: 'OK' } },
      },
      post: {
        summary: 'Crear paciente',
        description: 'Idempotente por (tenant, phone): si ya existe, lo retorna con `existing: true`. Requiere `write`.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'phone'],
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string', example: '+528441234567' },
                  email: { type: 'string', format: 'email' },
                  dateOfBirth: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Creado' },
          200: { description: 'Existente (idempotente)' },
        },
      },
    },
    '/availability': {
      get: {
        summary: 'Consultar disponibilidad',
        description: 'Slots disponibles para una fecha basados en la configuración de horarios menos las citas ya agendadas.',
        parameters: [
          { name: 'date', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'doctor_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'OK' },
          400: { description: 'Falta el parámetro `date`' },
        },
      },
    },
    '/doctors': {
      get: {
        summary: 'Listar doctores del consultorio',
        responses: { 200: { description: 'OK' }, 401: { description: 'API key inválida' } },
      },
    },
  },
}

export async function GET() {
  return NextResponse.json(SPEC, {
    headers: {
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
