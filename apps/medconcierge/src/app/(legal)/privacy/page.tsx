import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aviso de Privacidad Integral — Auctorum Systems",
  description: "Aviso de privacidad integral conforme a la LFPDPPP para los servicios de Auctorum Systems",
};

export default function PrivacyPage() {
  return (
    <div className="space-y-8 text-gray-700 leading-relaxed">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Aviso de Privacidad Integral</h1>
        <p className="text-sm text-gray-500">Versión 1.0 — Abril 2026</p>
        <p className="text-sm text-gray-500">Última actualización: 19 de abril de 2026</p>
      </div>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Identidad y Domicilio del Responsable</h2>
        <p className="mb-3">
          <strong>AUCTORUM SYSTEMS S.A.P.I. DE C.V.</strong> (en adelante &ldquo;AUCTORUM&rdquo;, &ldquo;nosotros&rdquo; o &ldquo;el Responsable&rdquo;),
          con domicilio en Saltillo, Coahuila de Zaragoza, México, es responsable de recabar, utilizar, almacenar y proteger
          sus datos personales, de conformidad con lo dispuesto por la Ley Federal de Protección de Datos Personales en
          Posesión de los Particulares (&ldquo;LFPDPPP&rdquo;), su Reglamento y los Lineamientos del Aviso de Privacidad.
        </p>
        <p>
          Para efectos del presente Aviso de Privacidad, AUCTORUM opera la plataforma tecnológica de gestión de
          consultorios médicos conocida como <strong>&ldquo;Concierge AI Médico&rdquo;</strong>, accesible a través de
          subdominios de <strong>auctorum.com.mx</strong> y la integración con WhatsApp Business API.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Datos Personales que Recabamos</h2>
        <p className="mb-3">AUCTORUM podrá recabar las siguientes categorías de datos personales:</p>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">2.1 Datos de Identificación</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Nombre completo</li>
          <li>Número de teléfono (incluyendo WhatsApp)</li>
          <li>Correo electrónico</li>
          <li>Fecha de nacimiento (cuando sea proporcionada)</li>
        </ul>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">2.2 Datos de Contacto y Comunicación</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Contenido de mensajes enviados a través de WhatsApp al chatbot del consultorio</li>
          <li>Historial de conversaciones con el asistente de inteligencia artificial</li>
          <li>Preferencias de comunicación</li>
        </ul>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">2.3 Datos de Citas Médicas</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Fecha y hora de citas programadas</li>
          <li>Motivo de consulta declarado</li>
          <li>Historial de citas (asistencias, cancelaciones, reprogramaciones)</li>
          <li>Notas asociadas a la cita</li>
        </ul>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">2.4 Datos Sensibles</h3>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-3">
          <p className="text-amber-800 font-medium mb-2">Datos sensibles — se requiere consentimiento expreso</p>
          <p className="text-amber-700 text-sm">
            De acuerdo con el artículo 3, fracción VI de la LFPDPPP, los siguientes datos se consideran sensibles:
          </p>
        </div>
        <ul className="list-disc pl-6 space-y-1">
          <li>Estado de salud actual y pasado</li>
          <li>Información clínica proporcionada al médico a través de la plataforma</li>
          <li>Expediente clínico electrónico (en planes Auctorum y Enterprise)</li>
          <li>Diagnósticos, tratamientos y evolución médica</li>
          <li>Resultados de estudios de laboratorio o imagen cargados a la plataforma</li>
        </ul>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">2.5 Datos de Uso de la Plataforma</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Dirección IP</li>
          <li>Tipo de navegador y dispositivo</li>
          <li>Páginas visitadas dentro de la plataforma</li>
          <li>Cookies de sesión y funcionalidad (ver Política de Cookies)</li>
        </ul>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">2.6 Datos Financieros</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Información de pagos procesados a través de Stripe (AUCTORUM no almacena datos de tarjeta; estos son gestionados directamente por Stripe conforme a su política PCI-DSS)</li>
          <li>Historial de facturación del consultorio</li>
          <li>RFC del profesional de salud (para facturación)</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Finalidades del Tratamiento</h2>

        <h3 className="text-lg font-medium text-gray-800 mt-4 mb-3">3.1 Finalidades Primarias (necesarias)</h3>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Gestión de citas médicas: agendamiento, confirmación, reprogramación y cancelación de citas a través del chatbot de WhatsApp y la plataforma web.</li>
          <li>Comunicación entre el consultorio y el paciente mediante WhatsApp Business API, incluyendo recordatorios de citas, confirmaciones y seguimientos.</li>
          <li>Operación del asistente de inteligencia artificial para atención automatizada de pacientes conforme a las instrucciones configuradas por el profesional de salud.</li>
          <li>Administración del expediente clínico electrónico conforme a la NOM-004-SSA3-2012.</li>
          <li>Procesamiento de pagos y facturación de los servicios contratados.</li>
          <li>Gestión de la relación contractual entre AUCTORUM y el profesional de salud que contrata los servicios.</li>
          <li>Envío de recordatorios automáticos de citas y seguimientos post-consulta.</li>
          <li>Cumplimiento de obligaciones legales aplicables.</li>
        </ol>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">3.2 Finalidades Secundarias (no necesarias)</h3>
        <ol className="list-decimal pl-6 space-y-2" start={9}>
          <li>Generación de estadísticas agregadas y anonimizadas sobre el uso de la plataforma para mejorar nuestros servicios.</li>
          <li>Envío de comunicaciones informativas sobre nuevas funcionalidades de la plataforma al profesional de salud.</li>
          <li>Realización de encuestas de satisfacción.</li>
        </ol>
        <p className="mt-3 text-sm text-gray-600">
          Si usted no desea que sus datos personales sean tratados para las finalidades secundarias, puede comunicarlo
          al correo <a href="mailto:privacidad@auctorum.com.mx" className="text-teal-600 hover:underline">privacidad@auctorum.com.mx</a>.
          La negativa no será motivo para negarle los servicios.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Mecanismos de Obtención de Datos</h2>
        <p className="mb-3">Obtenemos sus datos personales a través de los siguientes medios:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Directamente de usted:</strong> cuando se comunica con el consultorio vía WhatsApp, cuando agenda una cita, cuando proporciona información al asistente de IA, o cuando accede al portal del paciente.</li>
          <li><strong>Del profesional de salud:</strong> cuando el médico registra información clínica en la plataforma como parte de la atención médica.</li>
          <li><strong>Automáticamente:</strong> mediante cookies y tecnologías de rastreo al utilizar la plataforma web (ver Política de Cookies).</li>
          <li><strong>De WhatsApp/Meta:</strong> su número de teléfono y nombre de perfil cuando inicia una conversación con el chatbot del consultorio.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Consentimiento</h2>
        <p className="mb-3">
          Al proporcionar sus datos personales a través de cualquiera de los medios descritos en la sección anterior,
          usted otorga su consentimiento para el tratamiento de sus datos conforme a las finalidades primarias.
        </p>
        <p className="mb-3">
          Para el tratamiento de <strong>datos sensibles</strong> (información de salud), su consentimiento expreso
          se considera otorgado al:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Iniciar una conversación con el chatbot médico proporcionando información de salud voluntariamente.</li>
          <li>Utilizar el portal del paciente para acceder a su expediente clínico.</li>
          <li>Proporcionar información clínica al profesional de salud que utiliza la plataforma.</li>
        </ul>
        <p className="mt-3">
          Usted puede revocar su consentimiento en cualquier momento conforme al procedimiento descrito en la Sección 8.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Transferencias de Datos Personales</h2>
        <p className="mb-3">AUCTORUM podrá transferir sus datos personales a los siguientes terceros:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Destinatario</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Finalidad</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Consentimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="py-3 px-4">Profesional de salud (consultorio)</td><td className="py-3 px-4">Prestación de servicios médicos contratados</td><td className="py-3 px-4">No requerido (Art. 37, Fr. II)</td></tr>
              <tr className="bg-gray-50"><td className="py-3 px-4">Supabase Inc. (infraestructura)</td><td className="py-3 px-4">Alojamiento de base de datos</td><td className="py-3 px-4">No requerido (Art. 37, Fr. VII)</td></tr>
              <tr><td className="py-3 px-4">Meta Platforms / WhatsApp LLC</td><td className="py-3 px-4">Envío y recepción de mensajes de WhatsApp</td><td className="py-3 px-4">No requerido (Art. 37, Fr. VII)</td></tr>
              <tr className="bg-gray-50"><td className="py-3 px-4">Anthropic PBC (Claude API)</td><td className="py-3 px-4">Procesamiento de lenguaje natural para el asistente de IA</td><td className="py-3 px-4">No requerido (Art. 37, Fr. VII)</td></tr>
              <tr><td className="py-3 px-4">Stripe Inc.</td><td className="py-3 px-4">Procesamiento de pagos</td><td className="py-3 px-4">No requerido (Art. 37, Fr. VII)</td></tr>
              <tr className="bg-gray-50"><td className="py-3 px-4">Resend Inc.</td><td className="py-3 px-4">Envío de correos electrónicos transaccionales</td><td className="py-3 px-4">No requerido (Art. 37, Fr. VII)</td></tr>
              <tr><td className="py-3 px-4">Autoridades competentes</td><td className="py-3 px-4">Cumplimiento de obligaciones legales</td><td className="py-3 px-4">No requerido (Art. 37, Fr. I)</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          Las transferencias internacionales se realizan conforme al artículo 36 de la LFPDPPP. Los proveedores
          mencionados cuentan con políticas de privacidad y medidas de seguridad adecuadas para la protección de datos personales.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Medidas de Seguridad</h2>
        <p className="mb-3">
          AUCTORUM implementa medidas de seguridad administrativas, técnicas y físicas para proteger sus datos personales
          contra daño, pérdida, alteración, destrucción o acceso no autorizado:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Cifrado en tránsito:</strong> todas las comunicaciones utilizan TLS 1.2 o superior (HTTPS).</li>
          <li><strong>Cifrado en reposo:</strong> la base de datos utiliza cifrado AES-256 proporcionado por Supabase.</li>
          <li><strong>Control de acceso:</strong> autenticación por enlace mágico (magic link), autenticación de dos factores (2FA) disponible para profesionales de salud.</li>
          <li><strong>Segmentación multi-tenant:</strong> los datos de cada consultorio están lógicamente aislados; un consultorio no puede acceder a datos de otro.</li>
          <li><strong>Auditoría:</strong> se mantienen registros de acceso a datos sensibles.</li>
          <li><strong>Respaldos:</strong> respaldos automáticos de la base de datos con retención configurada.</li>
          <li><strong>Principio de mínimo privilegio:</strong> cada componente del sistema accede únicamente a los datos necesarios para su función.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Derechos ARCO</h2>
        <p className="mb-3">
          Usted tiene derecho a Acceder, Rectificar, Cancelar u Oponerse al tratamiento de sus datos personales
          (derechos ARCO), así como a revocar el consentimiento otorgado para su tratamiento.
        </p>
        <p className="mb-3">Para ejercer sus derechos ARCO, deberá enviar una solicitud a:</p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <p><strong>Correo electrónico:</strong> <a href="mailto:privacidad@auctorum.com.mx" className="text-teal-600 hover:underline">privacidad@auctorum.com.mx</a></p>
          <p><strong>WhatsApp:</strong> <a href="https://wa.me/528445387404" className="text-teal-600 hover:underline">+52 844 538 7404</a></p>
        </div>
        <p className="mb-3">La solicitud deberá contener:</p>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Nombre completo del titular de los datos.</li>
          <li>Descripción clara del derecho que desea ejercer y los datos involucrados.</li>
          <li>Número de teléfono asociado a su cuenta o interacciones con el consultorio.</li>
          <li>Cualquier documento que facilite la localización de sus datos.</li>
          <li>Correo electrónico o medio para recibir la respuesta.</li>
        </ol>
        <p className="mt-3">
          <strong>Plazo de respuesta:</strong> 20 días hábiles contados a partir de la recepción de la solicitud
          completa, conforme al artículo 32 de la LFPDPPP. De ser procedente, se hará efectiva dentro de los 15
          días hábiles siguientes a la comunicación de la respuesta.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Limitación de Uso y Divulgación</h2>
        <p>
          Para limitar el uso o divulgación de sus datos, puede enviar su solicitud a{" "}
          <a href="mailto:privacidad@auctorum.com.mx" className="text-teal-600 hover:underline">privacidad@auctorum.com.mx</a>,
          indicando su nombre, número de teléfono asociado y los datos cuyo uso desea limitar.
          Podrá inscribirse en nuestro listado de exclusión para dejar de recibir comunicaciones no esenciales.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Uso de Cookies y Tecnologías de Rastreo</h2>
        <p>
          AUCTORUM utiliza cookies estrictamente necesarias para el funcionamiento de la plataforma y cookies de
          funcionalidad para mejorar su experiencia. Para información detallada, consulte nuestra{" "}
          <a href="/cookies" className="text-teal-600 hover:underline">Política de Cookies</a>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Uso de Inteligencia Artificial</h2>
        <p className="mb-3">
          AUCTORUM utiliza modelos de inteligencia artificial (Anthropic Claude) para operar el asistente de chatbot.
          Para información detallada sobre el tratamiento de datos por el sistema de IA, consulte nuestra{" "}
          <a href="/ai-policy" className="text-teal-600 hover:underline">Política de Inteligencia Artificial</a>.
        </p>
        <p>
          Los datos procesados por el sistema de IA están sujetos a las mismas medidas de seguridad y protección
          descritas en este Aviso de Privacidad. El profesional de salud mantiene la responsabilidad sobre las
          instrucciones configuradas en el asistente de IA.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Encargados del Tratamiento</h2>
        <p className="mb-3">
          AUCTORUM actúa como <strong>encargado del tratamiento</strong> de los datos personales de los pacientes,
          siendo el profesional de salud (consultorio) el <strong>responsable del tratamiento</strong> conforme a la LFPDPPP.
        </p>
        <p>
          El profesional de salud que contrata los servicios de AUCTORUM es responsable de informar a sus pacientes
          sobre el uso de la plataforma y obtener los consentimientos necesarios conforme a su propio Aviso de Privacidad.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Conservación de Datos</h2>
        <p className="mb-3">Los datos personales se conservarán durante los siguientes períodos:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Datos de citas y comunicaciones:</strong> mientras la relación contractual con el consultorio esté vigente, más el período de prescripción legal aplicable.</li>
          <li><strong>Expediente clínico electrónico:</strong> mínimo 5 años desde la última atención médica, conforme a la NOM-004-SSA3-2012.</li>
          <li><strong>Datos de facturación:</strong> 5 años conforme a obligaciones fiscales (Código Fiscal de la Federación).</li>
          <li><strong>Datos de sesión y cookies:</strong> según lo especificado en la Política de Cookies.</li>
        </ul>
        <p className="mt-3">
          Una vez transcurridos los períodos de conservación, los datos serán suprimidos o anonimizados de forma irreversible.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">14. Eliminación de Datos</h2>
        <p>
          Usted puede solicitar la eliminación de sus datos personales conforme al procedimiento descrito en nuestra{" "}
          <a href="/data-deletion" className="text-teal-600 hover:underline">Política de Eliminación de Datos</a>.
          Tenga en cuenta que ciertos datos no pueden ser eliminados cuando exista una obligación legal de conservarlos.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">15. Datos de Menores de Edad</h2>
        <p>
          AUCTORUM no recopila intencionalmente datos personales de menores de 18 años sin el consentimiento de
          su padre, madre o tutor legal. Si un menor de edad requiere atención médica, el consentimiento deberá
          ser otorgado por quien ejerza la patria potestad o tutela, conforme a la legislación aplicable.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">16. Modificaciones al Aviso de Privacidad</h2>
        <p>
          AUCTORUM se reserva el derecho de modificar el presente Aviso de Privacidad en cualquier momento.
          Las modificaciones serán publicadas en esta misma URL (
          <a href="https://auctorum.com.mx/privacy" className="text-teal-600 hover:underline">https://auctorum.com.mx/privacy</a>).
          Se recomienda revisar periódicamente este documento. La fecha de última actualización se indica al inicio del presente aviso.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">17. Autoridad Competente</h2>
        <p>
          Si considera que su derecho a la protección de datos personales ha sido vulnerado, puede acudir al
          Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI):{" "}
          <a href="https://home.inai.org.mx" className="text-teal-600 hover:underline" target="_blank" rel="noopener noreferrer">www.inai.org.mx</a>.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">18. Contacto</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <p className="font-semibold text-gray-900 mb-3">Departamento de Privacidad — AUCTORUM SYSTEMS</p>
          <ul className="space-y-2">
            <li><strong>Correo:</strong> <a href="mailto:privacidad@auctorum.com.mx" className="text-teal-600 hover:underline">privacidad@auctorum.com.mx</a></li>
            <li><strong>Teléfono:</strong> <a href="tel:+528445387404" className="text-teal-600 hover:underline">+52 844 538 7404</a></li>
            <li><strong>Domicilio:</strong> Saltillo, Coahuila de Zaragoza, México</li>
          </ul>
        </div>
      </section>

      <section className="border-t border-gray-200 pt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Anexo A — Datos Tratados por Categoría de Servicio</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Plan</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Datos Tratados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="py-3 px-4 font-medium">Starter</td><td className="py-3 px-4">Nombre, teléfono, citas, mensajes WhatsApp</td></tr>
              <tr className="bg-gray-50"><td className="py-3 px-4 font-medium">Professional</td><td className="py-3 px-4">Todos los de Starter + campañas, funnel de pacientes, seguimientos</td></tr>
              <tr><td className="py-3 px-4 font-medium">Auctorum</td><td className="py-3 px-4">Todos los de Professional + expediente clínico electrónico, archivos médicos</td></tr>
              <tr className="bg-gray-50"><td className="py-3 px-4 font-medium">Enterprise</td><td className="py-3 px-4">Todos los de Auctorum + integraciones personalizadas, multi-sede</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-gray-200 pt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Anexo B — Subprocesadores de Datos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Proveedor</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Servicio</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Ubicación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="py-3 px-4">Supabase Inc.</td><td className="py-3 px-4">Base de datos PostgreSQL</td><td className="py-3 px-4">Estados Unidos</td></tr>
              <tr className="bg-gray-50"><td className="py-3 px-4">Meta Platforms / WhatsApp LLC</td><td className="py-3 px-4">Mensajería WhatsApp Business API</td><td className="py-3 px-4">Estados Unidos</td></tr>
              <tr><td className="py-3 px-4">Anthropic PBC</td><td className="py-3 px-4">API de inteligencia artificial (Claude)</td><td className="py-3 px-4">Estados Unidos</td></tr>
              <tr className="bg-gray-50"><td className="py-3 px-4">Stripe Inc.</td><td className="py-3 px-4">Procesamiento de pagos</td><td className="py-3 px-4">Estados Unidos</td></tr>
              <tr><td className="py-3 px-4">Resend Inc.</td><td className="py-3 px-4">Correo electrónico transaccional</td><td className="py-3 px-4">Estados Unidos</td></tr>
              <tr className="bg-gray-50"><td className="py-3 px-4">DigitalOcean LLC</td><td className="py-3 px-4">Servidor VPS</td><td className="py-3 px-4">Estados Unidos</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-gray-200 pt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Anexo C — Marco Legal Aplicable</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</li>
          <li>Reglamento de la LFPDPPP</li>
          <li>Lineamientos del Aviso de Privacidad (DOF 17/01/2013)</li>
          <li>Ley General de Salud</li>
          <li>NOM-004-SSA3-2012 — Del expediente clínico</li>
          <li>NOM-024-SSA3-2012 — Sistemas de información de registro electrónico para la salud</li>
          <li>Código Fiscal de la Federación (conservación de datos fiscales)</li>
        </ul>
      </section>

      <div className="border-t border-gray-200 pt-6 mt-8 text-center text-sm text-gray-400">
        <p>Documento publicado y vigente a partir del 19 de abril de 2026.</p>
      </div>
    </div>
  );
}
