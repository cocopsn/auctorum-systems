"use client";

interface DashboardData {
  tenantName: string;
  monthCount: number;
  monthTotal: number;
  acceptedCount: number;
  prospectsCount: number;
  recentQuotes: Array<{
    id: string;
    quoteNumber: string | null;
    clientName: string;
    total: string;
    status: string | null;
    createdAt: string;
  }>;
}

function formatMXN(amount: number | string) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(num);
}

const statusColors: Record<string, string> = {
  generated: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-slate-100 text-slate-500",
};

export default function DashboardClient({ data }: { data: DashboardData }) {
  const {
    tenantName,
    monthCount,
    monthTotal,
    acceptedCount,
    prospectsCount,
    recentQuotes,
  } = data;
  const convRate =
    monthCount > 0 ? Math.round((acceptedCount / monthCount) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-600">{tenantName}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-500">Resumen del mes actual.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Cotizaciones</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{monthCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Valor cotizado</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {formatMXN(monthTotal)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Tasa de cierre</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{convRate}%</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Nuevos prospectos</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {prospectsCount}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Cotizaciones recientes
        </h2>
        {recentQuotes.length === 0 ? (
          <p className="text-sm text-slate-500">
            No hay cotizaciones este mes.
          </p>
        ) : (
          <div className="space-y-3">
            {recentQuotes.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 p-4"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {q.clientName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {q.quoteNumber || "Sin folio"} · {formatMXN(q.total)}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[q.status || "generated"]}`}
                >
                  {q.status || "generada"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <a
          href="/dashboard/quotes"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Ver cotizaciones
        </a>
        <a
          href="/dashboard/clients"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Ver clientes
        </a>
        <a
          href="/dashboard/products"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          Productos
        </a>
      </div>
    </div>
  );
}
