'use client';

import { useState, useEffect } from "react";
import {
  BarChart3,
  Bot,
  CreditCard,
  FileText,
  GitBranch,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Package,
  Plug,
  Receipt,
  Settings,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { AppShell, type DashboardNavItem } from "@quote-engine/ui";
import { ToastContainer } from "../../components/ui/Toast";
import { OnboardingGate } from "../../components/onboarding/onboarding-gate";

const navItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/quotes", label: "Citas / Cotizaciones", icon: FileText },
  { href: "/dashboard/conversations", label: "Conversaciones", icon: MessageSquare },
  { href: "/dashboard/clients", label: "Pacientes / Clientes", icon: Users },
  { href: "/dashboard/funnel", label: "Embudo", icon: GitBranch },
  { href: "/dashboard/reports", label: "Reportes", icon: FileText },
  { href: "/dashboard/budgets", label: "Presupuestos", icon: Receipt },
  { href: "/dashboard/payments", label: "Pagos", icon: CreditCard },
  { href: "/dashboard/invoices", label: "Facturas", icon: FileText },
  { href: "/dashboard/campaigns", label: "Campañas", icon: Megaphone },
  { href: "/dashboard/integrations", label: "Integraciones", icon: Plug },
  { href: "/dashboard/ai-settings", label: "AI Concierge", icon: Bot },
  { href: "/dashboard/settings", label: "Configuración", icon: Settings },
];

const PLAN_LABELS: Record<string, string> = {
  free: "Plan Free",
  pro: "Plan Pro",
  enterprise: "Plan Enterprise",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [planLabel, setPlanLabel] = useState("Cargando...");

  useEffect(() => {
    fetch("/api/dashboard/settings/subscription")
      .then((r) => r.json())
      .then((data) => {
        const plan = data.subscription?.plan || "free";
        setPlanLabel(PLAN_LABELS[plan] || "Plan " + plan);
      })
      .catch(() => setPlanLabel("Plan Free"));
  }, []);

  return (
    <>
      <AppShell
        navItems={navItems}
        brand="Auctorum Systems"
        logoUrl="/logo.png"
        appName="Concierge Médico"
        userName="Admin"
        planLabel={planLabel}
        greeting="Bienvenido de vuelta"
        subtitle="Gestión de citas, pacientes y concierge AI."
        ctaHref="/dashboard/ai-settings"
      >
        <OnboardingGate>
          <div key={pathname}>{children}</div>
        </OnboardingGate>
      </AppShell>
      <ToastContainer />
    </>
  );
}
