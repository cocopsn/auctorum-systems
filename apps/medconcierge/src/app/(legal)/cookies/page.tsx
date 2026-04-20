import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Cookies — Auctorum Systems",
  description: "Política de cookies de la plataforma Concierge AI Médico de Auctorum Systems",
};

export default function CookiesPage() {
  return (
    <div className="space-y-8 text-gray-700 leading-relaxed">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Cookies</h1>
        <p className="text-sm text-gray-500">Versión 1.0 — Abril 2026</p>
        <p className="text-sm text-gray-500">Última actualización: 19 de abril de 2026</p>
      </div>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. ¿Qué son las cookies?</h2>
        <p className="mb-3">
          Las cookies son pequeños archivos de texto que los sitios web almacenan en su dispositivo (computadora,
          teléfono móvil, tableta) cuando usted los visita. Se utilizan ampliamente para hacer que los sitios web
          funcionen correctamente, para recordar sus preferencias y para proporcionar información a los propietarios
          del sitio.
        </p>
        <p>
          En este documento, el término &ldquo;cookies&rdquo; se utiliza de forma amplia para referirse tanto a
          cookies HTTP como a tecnologías de almacenamiento local similares (localStorage, sessionStorage).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">2. ¿Qué cookies utiliza AUCTORUM?</h2>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">2.1 Cookies Estrictamente Necesarias</h3>
        <p className="mb-3">
          Estas cookies son esenciales para el funcionamiento de la plataforma y <strong>no requieren su
          consentimiento</strong>, ya que sin ellas el servicio no podría operar.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Cookie</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Propósito</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Duración</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-3 px-4 font-mono text-xs">sb-*-auth-token</td>
                <td className="py-3 px-4">Autenticación de sesión del usuario (Supabase Auth)</td>
                <td className="py-3 px-4">Hasta cierre de sesión</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="py-3 px-4 font-mono text-xs">sb-*-auth-token-code-verifier</td>
                <td className="py-3 px-4">Verificación de código PKCE para autenticación segura</td>
                <td className="py-3 px-4">Temporal (durante el flujo de autenticación)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">2.2 Cookies de Funcionalidad</h3>
        <p className="mb-3">
          Estas cookies permiten recordar sus preferencias y mejorar su experiencia en la plataforma.
          <strong> Requieren su consentimiento.</strong>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Cookie / Storage</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Propósito</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Duración</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-3 px-4 font-mono text-xs">sidebar-collapsed</td>
                <td className="py-3 px-4">Recordar si la barra lateral del dashboard está colapsada</td>
                <td className="py-3 px-4">Persistente (localStorage)</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="py-3 px-4 font-mono text-xs">preferred-view</td>
                <td className="py-3 px-4">Recordar la vista preferida (lista/calendario) en la agenda</td>
                <td className="py-3 px-4">Persistente (localStorage)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">2.3 Cookies Analíticas</h3>
        <p className="mb-3">
          Actualmente, AUCTORUM <strong>no utiliza cookies analíticas ni de seguimiento</strong>. Si en el futuro
          se implementaran herramientas de análisis (como Google Analytics, Plausible u otras), se actualizará
          esta política y se solicitará su consentimiento previo.
        </p>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">2.4 Cookies de Publicidad o de Terceros</h3>
        <p>
          AUCTORUM <strong>NO utiliza cookies de publicidad, cookies de seguimiento de terceros ni cookies para
          perfilamiento publicitario</strong>. No compartimos datos de navegación con redes publicitarias.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Base Legal</h2>
        <p className="mb-3">
          El uso de cookies por parte de AUCTORUM se fundamenta en:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Cookies estrictamente necesarias:</strong> se utilizan con base en el interés legítimo de
            AUCTORUM para operar la plataforma (artículo 10 de la LFPDPPP). Estas cookies son indispensables
            para la prestación del servicio contratado.
          </li>
          <li>
            <strong>Cookies de funcionalidad:</strong> se utilizan con base en el consentimiento del usuario.
            Usted puede optar por no aceptarlas sin que esto impida el uso básico de la plataforma.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">4. ¿Cómo gestionar las cookies?</h2>
        <p className="mb-3">
          Usted puede configurar su navegador para rechazar cookies o para que le avise cuando se envíe una cookie.
          A continuación, se proporcionan instrucciones para los navegadores más comunes:
        </p>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">Google Chrome</h3>
        <ol className="list-decimal pl-6 space-y-1 text-sm">
          <li>Abra Chrome y haga clic en los tres puntos verticales (esquina superior derecha).</li>
          <li>Seleccione &ldquo;Configuración&rdquo; &rarr; &ldquo;Privacidad y seguridad&rdquo; &rarr; &ldquo;Cookies y otros datos de sitios&rdquo;.</li>
          <li>Elija su preferencia: permitir todas, bloquear terceros, o bloquear todas las cookies.</li>
        </ol>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">Mozilla Firefox</h3>
        <ol className="list-decimal pl-6 space-y-1 text-sm">
          <li>Abra Firefox y haga clic en el menú hamburguesa (tres líneas horizontales).</li>
          <li>Seleccione &ldquo;Configuración&rdquo; &rarr; &ldquo;Privacidad y seguridad&rdquo;.</li>
          <li>En &ldquo;Protección mejorada contra rastreo&rdquo;, elija su nivel preferido (Estándar, Estricto o Personalizado).</li>
        </ol>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">Safari</h3>
        <ol className="list-decimal pl-6 space-y-1 text-sm">
          <li>Abra Safari y vaya a &ldquo;Preferencias&rdquo; (o &ldquo;Ajustes&rdquo; en iOS).</li>
          <li>Seleccione la pestaña &ldquo;Privacidad&rdquo;.</li>
          <li>Marque &ldquo;Bloquear todas las cookies&rdquo; o configure según su preferencia.</li>
        </ol>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">Microsoft Edge</h3>
        <ol className="list-decimal pl-6 space-y-1 text-sm">
          <li>Abra Edge y haga clic en los tres puntos horizontales (esquina superior derecha).</li>
          <li>Seleccione &ldquo;Configuración&rdquo; &rarr; &ldquo;Cookies y permisos del sitio&rdquo; &rarr; &ldquo;Administrar y eliminar cookies y datos del sitio&rdquo;.</li>
          <li>Configure según su preferencia.</li>
        </ol>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
          <p className="text-amber-800 font-medium">Nota importante</p>
          <p className="text-amber-700 text-sm mt-1">
            Si bloquea las cookies estrictamente necesarias, es posible que no pueda iniciar sesión ni utilizar
            la plataforma correctamente. Las cookies de autenticación son indispensables para el funcionamiento
            del servicio.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">5. ¿Cómo revocar el consentimiento?</h2>
        <p className="mb-3">
          Puede revocar su consentimiento para las cookies de funcionalidad en cualquier momento mediante
          cualquiera de los siguientes métodos:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Eliminando las cookies de auctorum.com.mx desde la configuración de su navegador.</li>
          <li>Utilizando la navegación privada/incógnita, que no conserva cookies entre sesiones.</li>
          <li>Enviando un correo a <a href="mailto:privacidad@auctorum.com.mx" className="text-teal-600 hover:underline">privacidad@auctorum.com.mx</a> solicitando la revocación.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Actualizaciones a esta Política</h2>
        <p>
          AUCTORUM se reserva el derecho de actualizar esta Política de Cookies conforme evolucione la plataforma
          o la normatividad aplicable. Si se introducen nuevas categorías de cookies (especialmente analíticas o
          de terceros), se actualizará este documento y, de ser necesario, se solicitará nuevo consentimiento.
          La fecha de última actualización se indica al inicio del documento.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Contacto</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <p className="font-semibold text-gray-900 mb-3">Departamento de Privacidad — AUCTORUM SYSTEMS</p>
          <ul className="space-y-2">
            <li><strong>Correo:</strong> <a href="mailto:privacidad@auctorum.com.mx" className="text-teal-600 hover:underline">privacidad@auctorum.com.mx</a></li>
            <li><strong>Teléfono:</strong> <a href="tel:+528445387404" className="text-teal-600 hover:underline">+52 844 538 7404</a></li>
            <li><strong>Domicilio:</strong> Saltillo, Coahuila de Zaragoza, México</li>
          </ul>
        </div>
      </section>

      <div className="border-t border-gray-200 pt-6 mt-8 text-center text-sm text-gray-400">
        <p>Documento publicado y vigente a partir del 19 de abril de 2026.</p>
      </div>
    </div>
  );
}
