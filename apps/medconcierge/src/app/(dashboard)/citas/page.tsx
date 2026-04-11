export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getAuthTenant } from '@/lib/auth'
import { CitasClient } from './citas-client'

export default async function CitasPage() {
  const auth = await getAuthTenant()
  if (!auth) redirect('/login')

  return <CitasClient tenantId={auth.tenant.id} />
}
