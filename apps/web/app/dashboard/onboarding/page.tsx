export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, onboardingProgress, type OnboardingSteps } from '@quote-engine/db';
import { getAuthTenant } from '@/lib/auth';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';

export default async function OnboardingPage() {
  const auth = await getAuthTenant();
  if (!auth) redirect('/login');

  const [row] = await db
    .select()
    .from(onboardingProgress)
    .where(eq(onboardingProgress.tenantId, auth.tenant.id))
    .limit(1);

  const initialSteps: OnboardingSteps = row?.stepsJson ?? {};
  const completedAt = row?.completedAt ? row.completedAt.toISOString() : null;

  return (
    <OnboardingChecklist
      initialSteps={initialSteps}
      completedAt={completedAt}
      tenantName={auth.tenant.name}
    />
  );
}
