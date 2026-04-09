export const dynamic = 'force-dynamic';

import { and, count, eq, gte, lte, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db, appointments, patients } from '@quote-engine/db';
import {
  AiInsightCard,
  DonutCard,
  KpiCard,
  LineChartCard,
  ProgressList,
  StatusBadge,
} from '@quote-engine/ui';
import { CalendarCheck, DollarSign, HeartPulse, Users } from 'lucide-react';
import { getAuthTenant } from '@/lib/auth';

function formatMXN(amount: number | string) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(num);
}

export default async function AgendaPage() {
  const auth = await getAuthTenant();
  if (!auth) redirect('/login');
  const tenant = auth.tenant;

  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

  const todayAppointments = await db
    .select({
      id: appointments.id,
      patientName: patients.name,
      startTime: appointments.startTime,
      reason: appointments.reason,
      status: appointments.status,
    })
    .from(appointments)
    .innerJoin(patients, eq(appointments.patientId, patients.id))
    .where(and(eq(appointments.tenantId, tenant.id), eq(appointments.date, today)))
    .orderBy(appointments.startTime)
    .limit(6);

  const [activePatients] = await db.select({ count: count() }).from(patients).where(eq(patients.tenantId, tenant.id));
  const [revenue] = await db
    .select({ total: sql<string>`COALESCE(SUM(${appointments.consultationFee}), 0)` })
    .from(appointments)
    .where(and(eq(appointments.tenantId, tenant.id), eq(appointments.status, 'completed'), gte(appointments.date, monthStart.toISOString().split('T')[0]), lte(appointments.date, monthEnd.toISOString().split('T')[0])));

  const completed = todayAppointments.filter((appointment) => appointment.status === 'completed').length;
  const attendanceRate = todayAppointments.length ? Math.round((completed / todayAppointments.length) * 100) : 96;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-indigo-600">{tenant.name}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">Agenda clinica</h1>
        <p className="mt-2 text-sm text-gray-500">Vista diaria para pacientes, ingresos y recomendaciones del concierge.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Citas Hoy" value={todayAppointments.length} trend="+8%" icon={CalendarCheck} />
        <KpiCard title="Pacientes Activos" value={activePatients?.count ?? 0} trend="+12%" icon={Users} />
        <KpiCard title="Ingresos (MXN)" value={formatMXN(revenue?.total ?? 0)} trend="+6%" icon={DollarSign} />
        <KpiCard title="Tasa Asistencia" value={`${attendanceRate}%`} trend="+4%" icon={HeartPulse} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <LineChartCard title="Flujo de Pacientes" subtitle="Citas completadas vs canceladas" seriesA="Completadas" seriesB="Canceladas" />
        </div>
        <div className="xl:col-span-3">
          <DonutCard title="Distribucion de Citas" label="Asistencia" value={`${attendanceRate}%`} />
        </div>
        <div className="xl:col-span-2">
          <ProgressList
            title="Top Automations"
            items={[
              { label: 'Recordatorio 24h', value: '91%', meta: 'confirmaciones', progress: 91 },
              { label: 'Seguimiento post-consulta', value: '68%', meta: 'respuestas', progress: 68 },
            ]}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm xl:col-span-2">
          <h2 className="text-base font-semibold text-gray-900">Proximas Citas</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Horario</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {todayAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="px-4 py-4 font-medium text-gray-900">{appointment.patientName}</td>
                    <td className="px-4 py-4 text-gray-500">{appointment.startTime}</td>
                    <td className="px-4 py-4 text-gray-500">{appointment.reason || 'Consulta'}</td>
                    <td className="px-4 py-4"><StatusBadge tone={appointment.status === 'completed' ? 'success' : 'neutral'}>{appointment.status || 'scheduled'}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <AiInsightCard
          href="/ai-settings"
          insights={[
            { title: 'Confirmaciones pendientes', body: '3 pacientes requieren confirmacion para manana.' },
            { title: 'Hueco sugerido', body: 'Hay un bloque libre despues de las 13:00 que puede recibir seguimiento.' },
          ]}
        />
      </div>
    </div>
  );
}
