export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, onboardingProgress, type OnboardingSteps } from '@quote-engine/db';
import { getAuthTenant } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { validateOrigin } from '@/lib/csrf';

const stepsSchema = z.object({
  business_configured: z.boolean().optional(),
  whatsapp_connected: z.boolean().optional(),
  first_product_or_service: z.boolean().optional(),
  schedule_configured: z.boolean().optional(),
  test_quote_or_appointment: z.boolean().optional(),
});

const putSchema = z.object({
  steps: stepsSchema,
});

const ALL_STEPS: (keyof OnboardingSteps)[] = [
  'business_configured',
  'whatsapp_connected',
  'first_product_or_service',
  'schedule_configured',
  'test_quote_or_appointment',
];

async function getOrCreate(tenantId: string) {
  const [existing] = await db
    .select()
    .from(onboardingProgress)
    .where(eq(onboardingProgress.tenantId, tenantId))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(onboardingProgress)
    .values({ tenantId, stepsJson: {} })
    .returning();
  return created;
}

export async function GET() {
  const auth = await getAuthTenant();
  if (!auth) return apiError(401, 'Unauthorized');

  const row = await getOrCreate(auth.tenant.id);
  return apiSuccess(row);
}

export async function PUT(request: NextRequest) {
  if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
  const auth = await getAuthTenant();
  if (!auth) return apiError(401, 'Unauthorized');

  const body = await request.json().catch(() => ({}));
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return apiError(400, 'Invalid body', parsed.error.errors);

  const current = await getOrCreate(auth.tenant.id);
  const nextSteps: OnboardingSteps = { ...(current.stepsJson ?? {}), ...parsed.data.steps };
  const allDone = ALL_STEPS.every((k) => nextSteps[k] === true);

  const [updated] = await db
    .update(onboardingProgress)
    .set({
      stepsJson: nextSteps,
      completedAt: allDone ? (current.completedAt ?? new Date()) : null,
      updatedAt: new Date(),
    })
    .where(eq(onboardingProgress.tenantId, auth.tenant.id))
    .returning();

  return apiSuccess(updated);
}

export async function POST(request: NextRequest) {
  // POST /api/onboarding marks the wizard complete (force).
  if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
  const auth = await getAuthTenant();
  if (!auth) return apiError(401, 'Unauthorized');

  await getOrCreate(auth.tenant.id);
  const [updated] = await db
    .update(onboardingProgress)
    .set({ completedAt: new Date(), updatedAt: new Date() })
    .where(eq(onboardingProgress.tenantId, auth.tenant.id))
    .returning();

  return apiSuccess(updated);
}
