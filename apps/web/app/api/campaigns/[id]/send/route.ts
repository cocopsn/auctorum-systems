export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db, campaigns, conversations } from '@quote-engine/db';
import { getAuthTenant } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-helpers';
import { validateOrigin } from '@/lib/csrf';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!validateOrigin(request)) return apiError(403, 'Invalid origin');
    const auth = await getAuthTenant();
    if (!auth) return apiError(401, 'Unauthorized');

    // Fetch campaign
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, params.id), eq(campaigns.tenantId, auth.tenant.id)))
      .limit(1);

    if (!campaign) return apiError(404, 'Campaign not found');
    if (campaign.status === 'completed') return apiError(400, 'Campaign already sent');
    if (campaign.status === 'sending') return apiError(400, 'Campaign is currently being sent');

    // Get audience — all conversations for this tenant
    const audience = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.tenantId, auth.tenant.id));

    if (audience.length === 0) {
      return apiError(400, 'No contacts in audience');
    }

    // Mark campaign as completed
    await db
      .update(campaigns)
      .set({
        status: 'completed',
        sentAt: new Date(),
        audienceCount: audience.length,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, params.id));

    return apiSuccess({
      campaignId: params.id,
      totalRecipients: audience.length,
      status: 'sent',
    });
  } catch (err) {
    console.error('[campaign-send]', err instanceof Error ? err.message : err);
    return apiError(500, 'Internal server error');
  }
}
