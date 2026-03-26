import { and, eq, notInArray, sql } from 'drizzle-orm'
import { db, tenants, patients, appointments, appointmentEvents } from '@quote-engine/db'
import type { Appointment, Patient } from '@quote-engine/db'

type CreateAppointmentData = {
  tenantId: string
  date: string
  startTime: string
  endTime: string
  patientName: string
  patientPhone: string
  patientEmail?: string
  reason?: string
  insurance?: string
}

type CreateAppointmentResult = {
  appointment: Appointment
  patient: Patient
  isNewPatient: boolean
}

export async function createAppointment(
  data: CreateAppointmentData
): Promise<CreateAppointmentResult> {
  // Verify tenant is active
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.id, data.tenantId), eq(tenants.isActive, true)))
    .limit(1)

  if (!tenant) {
    throw new AppointmentError('Tenant not found or inactive', 404)
  }

  // Check for double-booking using a transaction with row lock
  return await db.transaction(async (tx) => {
    // SELECT FOR UPDATE to lock the slot
    const existing = await tx
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, data.tenantId),
          eq(appointments.date, data.date),
          eq(appointments.startTime, data.startTime),
          notInArray(appointments.status, ['cancelled', 'rescheduled'])
        )
      )
      .for('update')

    if (existing.length > 0) {
      throw new AppointmentError('Slot already booked', 409)
    }

    // Normalize phone
    const phone = data.patientPhone.replace(/\D/g, '').slice(-10)

    // Upsert patient by (tenantId, phone)
    const existingPatients = await tx
      .select()
      .from(patients)
      .where(and(eq(patients.tenantId, data.tenantId), eq(patients.phone, phone)))
      .limit(1)

    let patient: Patient
    let isNewPatient = false

    if (existingPatients.length > 0) {
      // Update existing patient
      const [updated] = await tx
        .update(patients)
        .set({
          name: data.patientName,
          email: data.patientEmail || existingPatients[0].email,
          insuranceProvider: data.insurance || existingPatients[0].insuranceProvider,
          updatedAt: new Date(),
        })
        .where(eq(patients.id, existingPatients[0].id))
        .returning()
      patient = updated
    } else {
      // Insert new patient
      const [inserted] = await tx
        .insert(patients)
        .values({
          tenantId: data.tenantId,
          name: data.patientName,
          phone,
          email: data.patientEmail || null,
          insuranceProvider: data.insurance || null,
        })
        .returning()
      patient = inserted
      isNewPatient = true
    }

    // Get consultation fee from tenant config
    const config = tenant.config as Record<string, unknown>
    const medical = config?.medical as Record<string, unknown> | undefined
    const fee = medical?.consultation_fee as number | undefined

    // Insert appointment
    const [appointment] = await tx
      .insert(appointments)
      .values({
        tenantId: data.tenantId,
        patientId: patient.id,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        status: 'scheduled',
        reason: data.reason || null,
        consultationFee: fee ? String(fee) : null,
        paymentStatus: 'pending',
      })
      .returning()

    // Insert event
    await tx.insert(appointmentEvents).values({
      appointmentId: appointment.id,
      tenantId: data.tenantId,
      eventType: 'created',
      metadata: {
        source: 'portal',
        isNewPatient,
        insurance: data.insurance || null,
      },
    })

    // Update patient stats
    await tx
      .update(patients)
      .set({
        totalAppointments: sql`${patients.totalAppointments} + 1`,
        lastAppointmentAt: new Date(),
      })
      .where(eq(patients.id, patient.id))

    return { appointment, patient, isNewPatient }
  })
}

export class AppointmentError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message)
    this.name = 'AppointmentError'
  }
}
