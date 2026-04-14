export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'auctorum.com.mx'
export const PORTAL_SUBDOMAIN = process.env.NEXT_PUBLIC_PORTAL_SUBDOMAIN || 'portal'
export const PORTAL_HOST = `${PORTAL_SUBDOMAIN}.${APP_DOMAIN}`

export function buildPortalUrl(path = '/dashboard') {
  return `https://${PORTAL_HOST}${path.startsWith('/') ? path : `/${path}`}`
}

export function isPortalHost(hostname: string) {
  const hostWithoutPort = hostname.split(':')[0]
  return hostWithoutPort === PORTAL_HOST
}

export function isMedicalPublicHost(hostname: string) {
  const hostWithoutPort = hostname.split(':')[0]
  const subdomain = hostWithoutPort.replace(`.${APP_DOMAIN}`, '')
  return /^(dr|dra|doc)-/.test(subdomain)
}

