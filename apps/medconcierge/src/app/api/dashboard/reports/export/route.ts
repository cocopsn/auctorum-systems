import { NextRequest, NextResponse } from 'next/server'
import { db, quotes } from '@quote-engine/db'
import { eq, and, gte, lte } from 'drizzle-orm'
import { getAuthTenant } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthTenant()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]
    const type = searchParams.get('type') || 'csv'

    const conditions = and(
      eq(quotes.tenantId, auth.tenant.id),
      gte(quotes.createdAt, new Date(startDate)),
      lte(quotes.createdAt, new Date(endDate + 'T23:59:59Z'))
    )

    const allQuotes = await db.select().from(quotes).where(conditions)

    if (type === 'csv') {
      const headers = ['Folio', 'Cliente', 'Email', 'Subtotal', 'IVA', 'Total', 'Estado', 'Fecha']
      const rows = allQuotes.map(q => [
        q.tenantSeq ? `COT-${String(q.tenantSeq).padStart(4, '0')}` : q.quoteNumber,
        (q.clientName || '').replace(/,/g, ' '),
        (q.clientEmail || '').replace(/,/g, ' '),
        q.subtotal,
        q.taxAmount,
        q.total,
        q.status || 'generated',
        q.createdAt ? new Date(q.createdAt).toISOString().split('T')[0] : '',
      ])

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="reporte-cotizaciones-${startDate}-${endDate}.csv"`,
        },
      })
    }

    // PDF: simple HTML table
    const totalValue = allQuotes.reduce((s, q) => s + Number(q.total || 0), 0)
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Reporte</title>
    <style>body{font-family:system-ui;margin:2rem;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:1rem}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f3f4f6}.header{display:flex;justify-content:space-between;align-items:center}.total{margin-top:1rem;font-weight:bold;font-size:14px}</style></head>
    <body><div class="header"><div><h1>${auth.tenant.name}</h1><p>Reporte de Cotizaciones</p><p>${startDate} — ${endDate}</p></div></div>
    <table><thead><tr><th>Folio</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>
    ${allQuotes.map(q => `<tr><td>${q.tenantSeq ? `COT-${String(q.tenantSeq).padStart(4,'0')}` : q.quoteNumber}</td><td>${q.clientName || ''}</td><td>$${Number(q.total || 0).toLocaleString('es-MX', {minimumFractionDigits:2})}</td><td>${q.status || 'generated'}</td><td>${q.createdAt ? new Date(q.createdAt).toLocaleDateString('es-MX') : ''}</td></tr>`).join('')}
    </tbody></table><p class="total">Total: $${totalValue.toLocaleString('es-MX', {minimumFractionDigits:2})} MXN</p></body></html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="reporte-${startDate}-${endDate}.html"`,
      },
    })
  } catch (err: any) {
    console.error('Reports export error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
