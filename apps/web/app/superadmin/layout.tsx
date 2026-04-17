import { ReactNode } from 'react';

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#05070A] text-slate-200">
      <nav className="border-b border-white/10 bg-[#0B1F3A]/50 backdrop-blur-md px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded bg-[#0A84FF] flex items-center justify-center font-bold text-white tracking-tighter">
            AS
          </div>
          <span className="font-medium tracking-wide">AUCTORUM <span className="text-[#0A84FF]">SUPERADMIN</span></span>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <span className="text-emerald-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Online
          </span>
        </div>
      </nav>
      <main className="p-8 max-w-7xl mx-auto space-y-8">
        {children}
      </main>
    </div>
  );
}
