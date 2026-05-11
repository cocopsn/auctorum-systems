import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sub-procesadores de Datos — Auctorum Systems',
  description:
    'Lista de sub-procesadores de datos personales de Auctorum Systems conforme a la LFPDPPP y al Aviso de Privacidad.',
}

type SubProcessor = {
  name: string
  purpose: string
  dataTypes: string
  location: string
  dpa: string
  /** True when this sub-processor handles patient PHI (health information). */
  phi: boolean
}

const SUBPROCESSORS: SubProcessor[] = [
  {
    name: 'Supabase Inc.',
    purpose: 'Base de datos PostgreSQL, autenticación y almacenamiento de archivos',
    dataTypes: 'Todos los datos del expediente clínico, credenciales, sesiones, archivos.',
    location: 'EE.UU. (us-east-1)',
    dpa: 'https://supabase.com/legal/dpa',
    phi: true,
  },
  {
    name: 'OpenAI LLC',
    purpose: 'Procesamiento de lenguaje natural para el asistente conversacional',
    dataTypes: 'Mensajes de pacientes (transitorio). Configuración store:false — sin retención.',
    location: 'EE.UU.',
    dpa: 'https://openai.com/policies/business-terms',
    phi: true,
  },
  {
    name: 'Stripe Inc.',
    purpose: 'Procesamiento de pagos en línea (Stripe Connect)',
    dataTypes: 'Nombre del titular, últimos 4 dígitos de tarjeta, importe, RFC del comercio.',
    location: 'EE.UU.',
    dpa: 'https://stripe.com/legal/dpa',
    phi: false,
  },
  {
    name: 'MercadoPago / MercadoLibre',
    purpose: 'Procesamiento de pagos en línea (alternativa para clientes en MX)',
    dataTypes: 'Mismo set que Stripe.',
    location: 'Argentina / México',
    dpa: 'https://www.mercadopago.com.mx/ayuda/proteccion-de-datos_2256',
    phi: false,
  },
  {
    name: 'Cloudflare Inc.',
    purpose: 'DNS, CDN, protección DDoS, terminación TLS',
    dataTypes: 'IPs de visitantes, headers de requests, contenido cacheable.',
    location: 'EE.UU. (red global)',
    dpa: 'https://www.cloudflare.com/cloudflare-customer-dpa/',
    phi: false,
  },
  {
    name: 'Resend Inc.',
    purpose: 'Envío de correos transaccionales (confirmaciones, recordatorios)',
    dataTypes: 'Email del destinatario, asunto, cuerpo del mensaje.',
    location: 'EE.UU.',
    dpa: 'https://resend.com/legal/dpa',
    phi: true,
  },
  {
    name: 'Meta Platforms Inc.',
    purpose: 'WhatsApp Business Cloud API (mensajería con pacientes)',
    dataTypes: 'Número de teléfono, contenido del mensaje, timestamps.',
    location: 'EE.UU. / Irlanda',
    dpa: 'https://www.facebook.com/legal/terms/dataprocessing',
    phi: true,
  },
  {
    name: 'Google LLC',
    purpose: 'Sincronización con Google Calendar (opcional, por consentimiento OAuth)',
    dataTypes: 'Eventos de calendario (fecha/hora/título), dirección de correo del titular.',
    location: 'EE.UU.',
    dpa: 'https://cloud.google.com/terms/data-processing-addendum',
    phi: false,
  },
  {
    name: 'DigitalOcean LLC',
    purpose: 'Infraestructura de cómputo (VPS) y almacenamiento de respaldos',
    dataTypes: 'Logs de aplicación, snapshots cifrados de disco.',
    location: 'EE.UU. (NYC)',
    dpa: 'https://www.digitalocean.com/legal/data-processing-agreement',
    phi: true,
  },
  {
    name: 'Sentry (Functional Software Inc.)',
    purpose: 'Telemetría de errores en producción (opcional, redactado de PII)',
    dataTypes: 'Stack traces, breadcrumbs. PII redactada en el SDK antes de enviar.',
    location: 'EE.UU.',
    dpa: 'https://sentry.io/legal/dpa/',
    phi: false,
  },
]

export default function DataProcessorsPage() {
  return (
    <div className="space-y-8 text-gray-700 leading-relaxed">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sub-procesadores de Datos</h1>
        <p className="text-sm text-gray-500">Última actualización: mayo de 2026 (versión vigente)</p>
      </div>

      <section>
        <p>
          Esta página enumera a los proveedores externos que tratan datos personales en
          nombre de AUCTORUM SYSTEMS S.A.P.I. DE C.V., conforme al artículo 36 de la
          <strong> Ley Federal de Protección de Datos Personales en Posesión de los
          Particulares (LFPDPPP)</strong>. Cada uno opera bajo un contrato de tratamiento
          de datos (DPA) que limita el uso de la información al propósito declarado.
        </p>
        <p className="mt-3">
          Algunos de estos sub-procesadores se ubican fuera de México (principalmente
          Estados Unidos). Las transferencias internacionales se realizan con
          salvaguardas contractuales conforme al artículo 37 LFPDPPP. Al usar nuestros
          servicios, usted otorga consentimiento informado para estas transferencias.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tabla de sub-procesadores</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2 font-semibold text-gray-700">Proveedor</th>
                <th className="px-4 py-2 font-semibold text-gray-700">Propósito</th>
                <th className="px-4 py-2 font-semibold text-gray-700">Datos tratados</th>
                <th className="px-4 py-2 font-semibold text-gray-700">Ubicación</th>
                <th className="px-4 py-2 font-semibold text-gray-700">PHI</th>
                <th className="px-4 py-2 font-semibold text-gray-700">DPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {SUBPROCESSORS.map((s) => (
                <tr key={s.name} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-2">{s.purpose}</td>
                  <td className="px-4 py-2 text-xs text-gray-600">{s.dataTypes}</td>
                  <td className="px-4 py-2">{s.location}</td>
                  <td className="px-4 py-2">
                    {s.phi ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                        Sí
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <a
                      href={s.dpa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 underline"
                    >
                      ver
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Notificación de cambios</h2>
        <p>
          AUCTORUM SYSTEMS notificará a los titulares por correo electrónico cuando se
          incorpore un nuevo sub-procesador que trate PHI. La versión vigente de esta
          lista siempre está disponible en esta página y se referencia desde el{' '}
          <a href="/privacy" className="text-teal-600 underline">
            Aviso de Privacidad
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Ejercicio de derechos ARCO</h2>
        <p>
          Para acceder, rectificar, cancelar u oponerse al tratamiento de sus datos
          personales, escriba a{' '}
          <a className="text-teal-600 underline" href="mailto:privacidad@auctorum.com.mx">
            privacidad@auctorum.com.mx
          </a>{' '}
          o use el formulario en{' '}
          <a href="/data-deletion" className="text-teal-600 underline">
            /data-deletion
          </a>
          . El plazo máximo de respuesta es de 20 días hábiles conforme al artículo 32
          LFPDPPP.
        </p>
      </section>
    </div>
  )
}
