import { z } from 'zod'

export const createAppointmentSchema = z.object({
  tenantId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  patientName: z.string().min(2, 'El nombre es requerido').max(255),
  patientPhone: z
    .string()
    .min(10, 'El teléfono debe tener al menos 10 dígitos')
    .regex(/^[\d\s\-+()]+$/, 'Formato de teléfono inválido'),
  patientEmail: z
    .string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  reason: z.string().max(500).optional(),
  insurance: z.string().max(255).optional(),
})

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>

export const bookingFormSchema = z.object({
  patientName: z.string().min(2, 'El nombre es requerido'),
  patientPhone: z
    .string()
    .min(10, 'El teléfono debe tener al menos 10 dígitos')
    .regex(/^[\d\s\-+()]+$/, 'Formato de teléfono inválido'),
  patientEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  reason: z.string().max(500, 'Máximo 500 caracteres').optional(),
  insurance: z.string().optional(),
})

export type BookingFormInput = z.infer<typeof bookingFormSchema>
