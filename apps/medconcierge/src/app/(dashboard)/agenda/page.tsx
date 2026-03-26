export const dynamic = "force-dynamic";

import { eq, and, gte, lte, sql, count } from 'drizzle-orm'
import { db } from '@quote-engine/db'
import { appointments, patients, tenants } from '@quote-engine/db'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { DayTimeline } from '@/components/dashboard/day-timeline'

// TODO: Replace with requireAuth() tenant
async function getTenantId() {
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, 'dra-martinez'))
    .limit(1)
  return tenant?.id
}

export default async function AgendaPage() {
  const tenantId = await getTenantId()
  if (!tenantId) return <div>No tenant found</div>

  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toTimeString().slice(0, 8)

  // Today's appointments with patient data
  const todayAppointments = await db
    .select({
      id: appointments.id,
      tenantId: appointments.tenantId,
      patientId: appointments.patientId,
      date: appointments.date,
      startTime: appointments.startTime,
      endTime: appointments.endTime,
      status: appointments.status,
      reason: appointments.reason,
      notes: appointments.notes,
      diagnosis: appointments.diagnosis,
      prescription: appointments.prescription,
      consultationFee: appointments.consultationFee,
      paymentStatus: appointments.paymentStatus,
      paymentMethod: appointments.paymentMethod,
      reminder24hSent: appointments.reminder24hSent,
      reminder24hSentAt: appointments.reminder24hSentAt,
      reminder2hSent: appointments.reminder2hSent,
      reminder2hSentAt: appointments.reminder2hSentAt,
      confirmedByPatient: appointments.confirmedByPatient,
      confirmedAt: appointments.confirmedAt,
      cancelledAt: appointments.cancelledAt,
      completedAt: appointments.completedAt,
      noShowMarkedAt: appointments.noShowMarkedAt,
      createdAt: appointments.createdAt,
      patient: {
        id: patients.id,
        tenantId: patients.tenantId,
        name: patients.name,
        email: patients.email,
        phone: patients.phone,
        dateOfBirth: patients.dateOfBirth,
        gender: patients.gender,
        bloodType: patients.bloodType,
        allergies: patients.allergies,
        chronicConditions: patients.chronicConditions,
        emergencyContactName: patients.emergencyContactName,
        emergencyContactPhone: patients.emergencyContactPhone,
        insuranceProvider: patients.insuranceProvider,
        insurancePolicy: patients.insurancePolicy,
        notes: patients.notes,
        totalAppointments: patients.totalAppointments,
        totalNoShows: patients.totalNoShows,
        totalSpent: patients.totalSpent,
        lastAppointmentAt: patients.lastAppointmentAt,
        createdAt: patients.createdAt,
        updatedAt: patients.updatedAt,
      },
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(and(eq(appointments.tenantId, tenantId), eq(appointments.date, today)))
    .orderBy(appointments.startTime)

  // Stats
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const monthStart = new Date()
  monthStart.setDate(1)
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)

  const [weekStats] = await db
    .select({ count: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        gte(appointments.date, weekStart.toISOString().split('T')[0]),
        lte(appointments.date, weekEnd.toISOString().split('T')[0])
      )
    )

  const [noShowStats] = await db
    .select({ count: count() })
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.status, 'no_show'),
        gte(appointments.date, monthStart.toISOString().split('T')[0]),
        lte(appointments.date, monthEnd.toISOString().split('T')[0])
      )
    )

  const [revenueStats] = await db
    .select({ total: sql<string>`COALESCE(SUM(${appointments.consultationFee}), 0)` })
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.status, 'completed'),
        gte(appointments.date, monthStart.toISOString().split('T')[0]),
        lte(appointments.date, monthEnd.toISOString().split('T')[0])
      )
    )

  const stats = {
    todayCount: todayAppointments.length,
    weekCount: weekStats?.count ?? 0,
    monthNoShows: noShowStats?.count ?? 0,
    monthRevenue: Number(revenueStats?.total ?? 0),
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Agenda del Día</h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('es-MX', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      <div className="space-y-6">
        <StatsCards stats={stats} />
        <DayTimeline appointments={todayAppointments} currentTime={now} />
      </div>
    </div>
  )
}
