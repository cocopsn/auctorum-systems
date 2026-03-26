export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server'
import { createAppointmentSchema } from '@/lib/validators/appointment'
import { createAppointment, AppointmentError } from '@/lib/appointments'
import { notifyNewAppointment } from '@/lib/notifications'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 req/min per IP
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
    const { success: rateLimitOk } = rateLimit(`appointments:${ip}`, 10, 60_000);
    if (!rateLimitOk) {
      return Response.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json()
    const parsed = createAppointmentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const result = await createAppointment(parsed.data)

    // Fire notifications (non-blocking)
    notifyNewAppointment(result.appointment, result.patient, parsed.data.tenantId).catch(
      (err) => console.error('Notification error:', err)
    )

    return NextResponse.json(
      { appointment: result.appointment, patient: result.patient },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof AppointmentError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    console.error('Appointment creation error:', error)
    return NextResponse.json(
      { error: 'Error interno al crear la cita' },
      { status: 500 }
    )
  }
}
