import { db, tenants, integrations, aiUsageEvents } from '@quote-engine/db';
import { desc, sql, eq } from 'drizzle-orm';
import { requireSuperadminPage } from '@/lib/superadmin';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  // Server-side allowlist gate. Non-allowlisted users get redirected to
  // /dashboard (don't reveal this page exists). Source of truth:
  // process.env.SUPERADMIN_EMAILS comma-separated, fallback hardcoded.
  await requireSuperadminPage();

  // Fetch all tenants
  const allTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt));

  // Fetch global AI usage
  const [{ totalTokens }] = await db
    .select({ totalTokens: sql<number>`sum(coalesce(input_tokens,0) + coalesce(output_tokens,0))::int` })
    .from(aiUsageEvents);

  const openaiLogs = await db
    .select()
    .from(aiUsageEvents)
    .orderBy(desc(aiUsageEvents.createdAt))
    .limit(10);

  // Fetch Meta integrations 
  const allIntegrations = await db.select().from(integrations).where(eq(integrations.type, 'meta'));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">System Overview</h1>
        <p className="text-slate-400 mt-2">Manage all medical tenants, API keys, and global system health.</p>
      </header>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 p-6 rounded-xl relative overflow-hidden group hover:border-[#0A84FF]/50 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A84FF]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="text-sm font-medium text-slate-400">Total Tenants</h3>
          <p className="text-4xl font-bold mt-2">{allTenants.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-xl relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="text-sm font-medium text-slate-400">Master WhatsApp Nodes</h3>
          <p className="text-4xl font-bold mt-2">{allIntegrations.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-xl relative overflow-hidden group hover:border-amber-500/50 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <h3 className="text-sm font-medium text-slate-400">Global AI Tokens Consumed</h3>
          <p className="text-4xl font-bold mt-2">{totalTokens || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Tenants Master Table */}
        <div className="xl:col-span-2 bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-lg font-medium">Tenant Directory</h2>
            <button className="px-4 py-2 bg-[#0A84FF]/10 text-[#0A84FF] text-sm font-medium rounded-lg hover:bg-[#0A84FF]/20 transition-colors">
              + Provision New
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-white/5">
                <tr>
                  <th className="px-6 py-4 font-medium">Tenant</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Subdomain</th>
                  <th className="px-6 py-4 font-medium">Meta / Phone Id</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {allTenants.map((tenant) => {
                  const meta = allIntegrations.find(i => i.tenantId === tenant.id);
                  const config = meta?.config as any;
                  return (
                    <tr key={tenant.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{tenant.name}</div>
                        <div className="text-xs text-slate-500 truncate w-32">{tenant.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        {tenant.isActive ? (
                          <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium bg-red-500/10 text-red-400">
                            Suspended
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {tenant.publicSubdomainPrefix}.auctorum.com.mx
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs p-1 bg-black/40 rounded text-amber-400 outline outline-1 outline-amber-500/20">
                          {config?.phone_number_id || "Not Configured"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-sm text-[#0A84FF] hover:text-white transition-colors">Manage Secrets</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global AI Stream */}
        <div className="bg-white/5 border border-white/10 rounded-xl flex flex-col h-[600px] shadow-2xl">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#0A84FF] animate-pulse" />
              Live AI Logs
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
            {openaiLogs.map(log => (
              <div key={log.id} className="p-3 rounded bg-black/50 border border-white/5 space-y-2">
                <div className="flex justify-between text-slate-500">
                  <span>{log.channel} / {log.model}</span>
                  <span>{log.latencyMs}ms</span>
                </div>
                <div className="text-emerald-400/80 truncate">
                  <span className="text-slate-500">PROMPT: </span>{log.prompt}
                </div>
                <div className="text-slate-300 truncate">
                  <span className="text-slate-500">REPLY: </span>{log.responseSummary}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
