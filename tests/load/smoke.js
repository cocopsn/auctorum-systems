/**
 * k6 smoke test — basic load shape against medconcierge + web public
 * surfaces. P2-10 of the 2026-05-12 audit.
 *
 * Run locally:
 *   k6 run --env BASE_MED=https://med.auctorum.com.mx \
 *          --env BASE_WEB=https://auctorum.com.mx \
 *          tests/load/smoke.js
 *
 * Or against the VPS loopback (skips Cloudflare entirely — measures
 * the app, not the CDN):
 *   ssh -p 2222 root@<vps> "cd /opt/auctorum-systems/repo && \
 *     k6 run --env BASE_MED=http://127.0.0.1:3001 \
 *            --env BASE_WEB=http://127.0.0.1:3000 \
 *            tests/load/smoke.js"
 *
 * Stages:
 *   30s ramp 0→20 → 1min sustained at 50 → 10s ramp back to 0.
 *
 * Thresholds:
 *   - p95 latency < 500ms
 *   - error rate < 1%
 * k6 exits non-zero when a threshold breaks, so this fits cleanly in
 * CI / pre-deploy gates.
 */
import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_MED = __ENV.BASE_MED || 'http://127.0.0.1:3001'
const BASE_WEB = __ENV.BASE_WEB || 'http://127.0.0.1:3000'

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
  // Disable connection reuse so we measure cold-handshake + warm
  // separately. Set to true if you want amortized perf only.
  noConnectionReuse: false,
}

export default function () {
  // ── medconcierge public surfaces ──
  check(http.get(`${BASE_MED}/login`), {
    'medconcierge /login → 200': (r) => r.status === 200,
  })
  check(http.get(`${BASE_MED}/terms`), {
    'medconcierge /terms → 200': (r) => r.status === 200,
  })
  check(http.get(`${BASE_MED}/privacy`), {
    'medconcierge /privacy → 200': (r) => r.status === 200,
  })

  // Unauthenticated dashboard API → must be 401, NOT 500.
  // 500 would mean the auth gate threw before deciding.
  check(http.get(`${BASE_MED}/api/dashboard/stats`), {
    'stats unauth → 401': (r) => r.status === 401,
  })
  check(http.get(`${BASE_MED}/api/dashboard/reports/revenue`), {
    'reports/revenue unauth → 401': (r) => r.status === 401,
  })

  // Public health endpoint
  check(http.get(`${BASE_MED}/api/health`), {
    'health → 200': (r) => r.status === 200,
  })

  // Public verify endpoint with a bogus hash (should 400 invalid format,
  // NOT 500). Validates the fast-fail path.
  check(http.get(`${BASE_MED}/api/verify?hash=not-a-hash`), {
    'verify invalid → 400': (r) => r.status === 400,
  })

  // ── web public surfaces ──
  check(http.get(`${BASE_WEB}/`), {
    'web / → 200': (r) => r.status === 200,
  })
  check(http.get(`${BASE_WEB}/platform`), {
    'web /platform → 200': (r) => r.status === 200,
  })

  // 1 second of think-time between iterations per VU so we don't
  // hammer the server at full rate during the ramp.
  sleep(1)
}
