'use client'

import { useEffect } from 'react'
import Script from 'next/script'

/**
 * Public API documentation page. Loads Swagger UI from JSDelivr (no extra
 * npm dependency) and points it at /api/v1/spec.
 *
 * This page is rendered inside the existing root layout, but the topbar is
 * hidden and the body is given full bleed. The init runs after both Swagger
 * UI scripts are loaded.
 */
export default function ApiDocsPage() {
  useEffect(() => {
    function tryInit() {
      const w = window as unknown as {
        SwaggerUIBundle?: any
        SwaggerUIStandalonePreset?: any
        ui?: any
      }
      if (!w.SwaggerUIBundle || !w.SwaggerUIStandalonePreset) {
        setTimeout(tryInit, 100)
        return
      }
      if (w.ui) return // already initialised
      w.ui = w.SwaggerUIBundle({
        url: '/api/v1/spec',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          w.SwaggerUIBundle.presets.apis,
          w.SwaggerUIStandalonePreset,
        ],
        plugins: [w.SwaggerUIBundle.plugins.DownloadUrl],
        layout: 'BaseLayout',
        tryItOutEnabled: true,
      })
    }
    tryInit()
  }, [])

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.20.0/swagger-ui.css"
      />
      <style>{`
        .topbar { display: none !important; }
        #swagger-ui { padding: 1rem 0; max-width: 1280px; margin: 0 auto; }
        body { background: #fafafa; }
      `}</style>
      <Script
        src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.20.0/swagger-ui-bundle.js"
        strategy="afterInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.20.0/swagger-ui-standalone-preset.js"
        strategy="afterInteractive"
      />
      <div id="swagger-ui" />
    </>
  )
}
