export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { and, asc, between, desc, eq } from 'drizzle-orm'
import { db, appointments, patients, patientPayments } from '@quote-engine/db'
import { getAuthTenant } from '@/lib/auth'

/**
 * GET /api/dashboard/reports/export?type=appointments|payments|patients&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns a CSV (UTF-8 with BOM for Excel compatibility) of the requested
 * dataset for the period. Tenant-scoped.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const sp = req.nextUrl.searchParams
    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0]
    const from = isIsoDate(sp.get('from')) ? sp.get('from')! : monthStart
    const to = isIsoDate(sp.get('to')) ? sp.get('to')! : today
    const type = (sp.get('type') ?? 'appointments') as 'appointments' | 'payments' | 'patients'

    if (!['appointments', 'payments', 'patients'].includes(type)) {
      return NextResponse.json({ error: 'type must be appointments|payments|patients' }, { status: 400 })
    }

    const tenantId = auth.tenant.id
    const fromTs = new Date(from + 'T00:00:00Z')
    const toTs = new Date(to + 'T23:59:59Z')

    let headers: string[]
    let rows: (string | number | null)[][]

    if (type === 'appointments') {
      headers = ['Fecha', 'Hora inicio', 'Hora fin', 'Paciente', 'Teléfono', 'Motivo', 'Status', 'Tarifa']
      const data = await db
        .select({
          date: appointments.date,
          startTime: appointments.startTime,
          endTime: appointments.endTime,
          name: patients.name,
          phone: patients.phone,
          reason: appointments.reason,
          status: appointments.status,
          fee: appointments.consultationFee,
        })
        .from(appointments)
        .innerJoin(patients, eq(appointments.patientId, patients.id))
        .where(and(eq(appointments.tenantId, tenantId), between(appointments.date, from, to)))
        .orderBy(asc(appointments.date), asc(appointments.startTime))
      rows = data.map((r) => [
        r.date, r.startTime ?? '', r.endTime ?? '',
        r.name, r.phone, r.reason ?? '', r.status ?? '',
        r.fee ?? '',
      ])
    } else if (type === 'payments') {
      headers = ['Fecha', 'Paciente', 'Concepto', 'Monto MXN', 'Comisión MXN', 'Neto MXN', 'Método', 'Status']
      const data = await db
        .select()
        .from(patientPayments)
        .where(and(
          eq(patientPayments.tenantId, tenantId),
          between(patientPayments.createdAt, fromTs, toTs),
        ))
        .orderBy(desc(patientPayments.createdAt))
      rows = data.map((p) => {
        const amount = Number(p.amount)
        const fee = Number(p.applicationFee)
        return [
          new Date(p.createdAt).toISOString().split('T')[0],
          p.patientName ?? '',
          p.description ?? '',
          (amount / 100).toFixed(2),
          (fee / 100).toFixed(2),
          ((amount - fee) / 100).toFixed(2),
          p.paymentMethod ?? '',
          p.status,
        ]
      })
    } else {
      // patients
      headers = ['Nombre', 'Teléfono', 'Email', 'Fecha nacimiento', 'Fecha registro']
      const data = await db
        .select()
        .from(patients)
        .where(and(eq(patients.tenantId, tenantId), between(patients.createdAt, fromTs, toTs)))
        .orderBy(desc(patients.createdAt))
      rows = data.map((p) => [
        p.name,
        p.phone,
        p.email ?? '',
        p.dateOfBirth ?? '',
        p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '',
      ])
    }

    const csvBody = [
      headers.map(csvCell).join(','),
      ...rows.map((row) => row.map(csvCell).join(',')),
    ].join('\r\n')

    // BOM (UTF-8) helps Excel auto-detect encoding
    const csv = '﻿' + csvBody

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reporte-${type}-${from}-${to}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[GET /api/dashboard/reports/export] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  // RFC 4180: quote if contains comma, quote, or newline; double internal quotes
  if (/[",\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function isIsoDate(v: string | null): boolean {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)
}
