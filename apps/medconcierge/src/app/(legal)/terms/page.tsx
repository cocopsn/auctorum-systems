import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones de Servicio — Auctorum Systems",
  description: "Términos y condiciones de servicio para la plataforma Concierge AI Médico de Auctorum Systems",
};

export default function TermsPage() {
  return (
    <div className="space-y-8 text-gray-700 leading-relaxed">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Términos y Condiciones de Servicio</h1>
        <p className="text-sm text-gray-500">Versión 1.0 — Abril 2026</p>
        <p className="text-sm text-gray-500">Última actualización: 19 de abril de 2026</p>
      </div>

      {/* Cláusula 1 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Definiciones</h2>
        <p className="mb-3">Para efectos de los presentes Términos y Condiciones, se entenderá por:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>&ldquo;AUCTORUM&rdquo;:</strong> Auctorum Systems S.A.P.I. de C.V., con domicilio en Saltillo, Coahuila, México, prestadora de los servicios.</li>
          <li><strong>&ldquo;Plataforma&rdquo;:</strong> El sistema de software &ldquo;Concierge AI Médico&rdquo; ofrecido como servicio (SaaS), accesible mediante subdominios de auctorum.com.mx.</li>
          <li><strong>&ldquo;Cliente&rdquo; o &ldquo;Usuario&rdquo;:</strong> El profesional de salud, consultorio, clínica u organización que contrata los servicios de AUCTORUM.</li>
          <li><strong>&ldquo;Paciente&rdquo;:</strong> Persona física que interactúa con la Plataforma a través de WhatsApp, el portal del paciente u otros canales habilitados.</li>
          <li><strong>&ldquo;Chatbot&rdquo; o &ldquo;Asistente de IA&rdquo;:</strong> El agente conversacional automatizado que opera a través de WhatsApp Business API, impulsado por inteligencia artificial.</li>
          <li><strong>&ldquo;Plan&rdquo;:</strong> La modalidad de suscripción contratada por el Cliente (Starter, Professional, Auctorum o Enterprise).</li>
          <li><strong>&ldquo;Datos del Cliente&rdquo;:</strong> Toda la información almacenada en la Plataforma por el Cliente o sus Pacientes.</li>
        </ul>
      </section>

      {/* Cláusula 2 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Objeto del Contrato</h2>
        <p className="mb-3">
          Los presentes Términos regulan la relación entre AUCTORUM y el Cliente para la prestación del servicio de
          gestión de consultorios médicos mediante la Plataforma, que incluye:
        </p>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Chatbot de WhatsApp con inteligencia artificial para atención a pacientes.</li>
          <li>Sistema de agendamiento y gestión de citas.</li>
          <li>Dashboard de administración del consultorio.</li>
          <li>Portal web del paciente.</li>
          <li>Sistema de recordatorios automáticos.</li>
          <li>Funcionalidades adicionales según el Plan contratado.</li>
        </ol>
      </section>

      {/* Cláusula 3 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Aceptación de los Términos</h2>
        <p className="mb-3">
          Al registrarse, acceder o utilizar la Plataforma, el Cliente acepta estos Términos y Condiciones en su totalidad.
          Si el Cliente no está de acuerdo con alguna disposición, deberá abstenerse de utilizar la Plataforma.
        </p>
        <p>
          AUCTORUM se reserva el derecho de modificar estos Términos. Las modificaciones serán notificadas por correo
          electrónico con al menos 30 días de anticipación y entrarán en vigor en la fecha indicada. El uso continuado
          de la Plataforma después de dicha fecha constituye aceptación de los Términos modificados.
        </p>
      </section>

      {/* Cláusula 4 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Registro y Cuenta</h2>
        <p className="mb-3">Para utilizar la Plataforma, el Cliente deberá:</p>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Completar el proceso de onboarding proporcionando información veraz y actualizada.</li>
          <li>Proporcionar un correo electrónico válido para autenticación.</li>
          <li>Vincular su número de WhatsApp Business API autorizado.</li>
          <li>Configurar su perfil de consultorio (nombre, especialidad, horarios, dirección).</li>
        </ol>
        <p className="mt-3">
          El Cliente es responsable de mantener la confidencialidad de su cuenta y de todas las actividades realizadas
          desde ella. Debe notificar a AUCTORUM inmediatamente cualquier uso no autorizado.
        </p>
      </section>

      {/* Cláusula 5 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Planes y Precios</h2>

        <h3 className="text-lg font-medium text-gray-800 mt-4 mb-3">5.1 Planes Disponibles</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Plan</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Funcionalidades Principales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="py-3 px-4 font-medium">Starter</td><td className="py-3 px-4">Chatbot IA, agendamiento, recordatorios, landing page</td></tr>
              <tr className="bg-gray-50"><td className="py-3 px-4 font-medium">Professional</td><td className="py-3 px-4">Todo Starter + campañas, funnel de pacientes, seguimientos, reportes</td></tr>
              <tr><td className="py-3 px-4 font-medium">Auctorum</td><td className="py-3 px-4">Todo Professional + expediente clínico electrónico, presupuestos, facturación</td></tr>
              <tr className="bg-gray-50"><td className="py-3 px-4 font-medium">Enterprise</td><td className="py-3 px-4">Todo Auctorum + multi-sede, integraciones personalizadas, SLA dedicado</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">5.2 Facturación</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>La facturación es mensual, con cargo al inicio de cada período.</li>
          <li>Los precios están expresados en Pesos Mexicanos (MXN) más IVA.</li>
          <li>Los pagos se procesan a través de Stripe.</li>
          <li>AUCTORUM se reserva el derecho de ajustar precios con al menos 60 días de aviso previo.</li>
        </ul>
      </section>

      {/* Cláusula 6 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Uso Aceptable</h2>
        <p className="mb-3">El Cliente se compromete a:</p>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Utilizar la Plataforma exclusivamente para la gestión legítima de su consultorio o clínica.</li>
          <li>No enviar mensajes de spam o comunicaciones no solicitadas a pacientes.</li>
          <li>Cumplir con la normatividad aplicable en materia de salud (NOM-004-SSA3-2012, Ley General de Salud).</li>
          <li>Obtener el consentimiento informado de sus pacientes cuando sea requerido por la ley.</li>
          <li>No utilizar la Plataforma para actividades ilícitas o contrarias a la moral y buenas costumbres.</li>
          <li>No intentar acceder a datos de otros consultorios o vulnerar la seguridad de la Plataforma.</li>
          <li>No realizar ingeniería inversa, descompilar o desensamblar la Plataforma.</li>
          <li>Configurar las instrucciones del chatbot de IA de manera responsable y ética.</li>
        </ol>
      </section>

      {/* Cláusula 7 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Inteligencia Artificial — Limitaciones y Responsabilidad</h2>
        <p className="mb-3">El Cliente reconoce y acepta que:</p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>El chatbot de IA es una <strong>herramienta de asistencia</strong>, no un sustituto del criterio médico profesional.</li>
          <li>El chatbot <strong>no realiza diagnósticos</strong>, no prescribe tratamientos y no sustituye la consulta médica.</li>
          <li>Las respuestas del chatbot se basan en las instrucciones configuradas por el Cliente y en el modelo de lenguaje de Anthropic (Claude).</li>
          <li>AUCTORUM no garantiza que las respuestas del chatbot sean 100% precisas, completas o libres de errores.</li>
          <li>El Cliente es <strong>responsable de supervisar y ajustar</strong> las instrucciones del chatbot.</li>
          <li>El Cliente es responsable de informar a sus pacientes que están interactuando con un sistema automatizado.</li>
        </ol>
        <p className="mt-3">
          Para más información, consulte nuestra <a href="/ai-policy" className="text-teal-600 hover:underline">Política de Inteligencia Artificial</a>.
        </p>
      </section>

      {/* Cláusula 8 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Propiedad Intelectual</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>De AUCTORUM:</strong> La Plataforma, su código fuente, diseño, marcas, logotipos y documentación son propiedad exclusiva de AUCTORUM. El Cliente recibe una licencia no exclusiva, no transferible y revocable para el uso de la Plataforma durante la vigencia del contrato.</li>
          <li><strong>Del Cliente:</strong> Los Datos del Cliente son y seguirán siendo propiedad del Cliente. AUCTORUM no adquiere ningún derecho de propiedad sobre los datos del Cliente.</li>
          <li><strong>Contenido generado por IA:</strong> Los textos generados por el chatbot para atención al paciente no generan derechos de propiedad intelectual independientes.</li>
        </ol>
      </section>

      {/* Cláusula 9 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Protección de Datos Personales</h2>
        <p className="mb-3">
          AUCTORUM actúa como encargado del tratamiento de los datos personales de los pacientes del Cliente.
          El Cliente actúa como responsable del tratamiento conforme a la LFPDPPP.
        </p>
        <p className="mb-3">Ambas partes se comprometen a:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Tratar los datos personales conforme a la LFPDPPP y su Reglamento.</li>
          <li>Implementar medidas de seguridad adecuadas.</li>
          <li>Notificar vulneraciones de seguridad en un plazo máximo de 72 horas.</li>
          <li>Cooperar en la atención de solicitudes de derechos ARCO de los titulares.</li>
        </ul>
        <p className="mt-3">
          Para más información, consulte nuestro <a href="/privacy" className="text-teal-600 hover:underline">Aviso de Privacidad</a>.
        </p>
      </section>

      {/* Cláusula 10 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Confidencialidad</h2>
        <p>
          Ambas partes se obligan a mantener la confidencialidad de toda la información no pública intercambiada
          en el marco de la relación contractual. Esta obligación subsiste por un período de 3 años después de
          la terminación del contrato. Se exceptúa la información que sea de dominio público, que se conozca
          por medios legítimos independientes, o que deba revelarse por mandato legal o judicial.
        </p>
      </section>

      {/* Cláusula 11 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Disponibilidad del Servicio</h2>
        <p className="mb-3">
          AUCTORUM se esfuerza por mantener la Plataforma disponible las 24 horas del día, los 7 días de la semana.
          Sin embargo, el Cliente acepta que:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Podrán existir interrupciones programadas para mantenimiento, que serán notificadas con al menos 24 horas de anticipación.</li>
          <li>Eventos de fuerza mayor, fallas de proveedores externos (Meta/WhatsApp, Supabase, Anthropic) o ataques informáticos pueden causar interrupciones no previstas.</li>
          <li>AUCTORUM no garantiza un tiempo de actividad del 100%.</li>
        </ul>
        <p className="mt-3">
          Los compromisos específicos de disponibilidad se detallan en el Anexo A (Acuerdo de Nivel de Servicio).
        </p>
      </section>

      {/* Cláusula 12 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Soporte Técnico</h2>
        <p className="mb-3">AUCTORUM proporcionará soporte técnico según el Plan contratado:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Plan</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Canal</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Horario</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Tiempo de Respuesta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="py-3 px-4">Starter</td><td className="py-3 px-4">Email</td><td className="py-3 px-4">L-V 9:00-18:00</td><td className="py-3 px-4">48 horas</td></tr>
              <tr className="bg-gray-50"><td className="py-3 px-4">Professional</td><td className="py-3 px-4">Email + WhatsApp</td><td className="py-3 px-4">L-V 9:00-18:00</td><td className="py-3 px-4">24 horas</td></tr>
              <tr><td className="py-3 px-4">Auctorum</td><td className="py-3 px-4">Email + WhatsApp + Llamada</td><td className="py-3 px-4">L-S 8:00-20:00</td><td className="py-3 px-4">12 horas</td></tr>
              <tr className="bg-gray-50"><td className="py-3 px-4">Enterprise</td><td className="py-3 px-4">Todos + Gerente dedicado</td><td className="py-3 px-4">24/7</td><td className="py-3 px-4">4 horas</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Cláusula 13 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">13. Limitación de Responsabilidad</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>AUCTORUM no será responsable por daños indirectos, incidentales, especiales, consecuenciales o punitivos, incluyendo pérdida de ingresos, datos o clientela.</li>
          <li>La responsabilidad total de AUCTORUM estará limitada al monto pagado por el Cliente en los últimos 12 meses de servicio.</li>
          <li>AUCTORUM no será responsable por acciones u omisiones del Cliente en el ejercicio de su práctica médica.</li>
          <li>AUCTORUM no será responsable por fallas en servicios de terceros (WhatsApp, Anthropic, Stripe, Supabase).</li>
          <li>El Cliente es el único responsable de las decisiones clínicas tomadas con o sin asistencia del chatbot de IA.</li>
        </ol>
      </section>

      {/* Cláusula 14 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">14. Indemnización</h2>
        <p>
          El Cliente acepta indemnizar y mantener indemne a AUCTORUM, sus directores, empleados y agentes, de cualquier
          reclamación, demanda, daño, costo o gasto (incluyendo honorarios legales razonables) que surja del uso que
          el Cliente haga de la Plataforma, del incumplimiento de estos Términos, o de la violación de derechos de
          terceros por parte del Cliente.
        </p>
      </section>

      {/* Cláusula 15 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">15. Suspensión del Servicio</h2>
        <p className="mb-3">AUCTORUM podrá suspender el acceso a la Plataforma en los siguientes casos:</p>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Falta de pago por más de 15 días después del vencimiento.</li>
          <li>Incumplimiento de la política de uso aceptable (Cláusula 6).</li>
          <li>Actividad que ponga en riesgo la seguridad o integridad de la Plataforma.</li>
          <li>Solicitud de autoridad competente.</li>
        </ol>
        <p className="mt-3">
          La suspensión por falta de pago será precedida de al menos 2 notificaciones por correo electrónico.
          Durante la suspensión, los datos del Cliente se conservarán por un período mínimo de 30 días.
        </p>
      </section>

      {/* Cláusula 16 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">16. Terminación</h2>
        <h3 className="text-lg font-medium text-gray-800 mt-4 mb-3">16.1 Terminación por el Cliente</h3>
        <p className="mb-3">
          El Cliente puede cancelar su suscripción en cualquier momento desde el dashboard de configuración o
          notificando a contacto@auctorum.com.mx. La cancelación será efectiva al final del período de facturación vigente.
        </p>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">16.2 Terminación por AUCTORUM</h3>
        <p className="mb-3">AUCTORUM podrá terminar el contrato con aviso de 30 días por cualquier motivo, o de manera inmediata en caso de incumplimiento grave de estos Términos.</p>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">16.3 Efectos de la Terminación</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>El Cliente podrá exportar sus datos durante los 30 días siguientes a la terminación.</li>
          <li>Transcurrido dicho plazo, los datos serán eliminados, salvo aquellos que deban conservarse por obligación legal.</li>
          <li>No se realizarán reembolsos por períodos parciales no utilizados, salvo en caso de terminación por AUCTORUM sin causa justificada.</li>
        </ul>
      </section>

      {/* Cláusula 17 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">17. Normatividad de Salud</h2>
        <p className="mb-3">El Cliente reconoce su obligación de cumplir con:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Ley General de Salud y reglamentos aplicables.</li>
          <li>NOM-004-SSA3-2012 (expediente clínico).</li>
          <li>NOM-024-SSA3-2012 (sistemas de información de registro electrónico para la salud).</li>
          <li>Código de Ética del colegio profesional correspondiente.</li>
          <li>Normatividad estatal y municipal aplicable a su práctica.</li>
        </ul>
        <p className="mt-3">
          AUCTORUM proporciona la herramienta tecnológica; el cumplimiento normativo en la práctica médica
          es responsabilidad exclusiva del profesional de salud.
        </p>
      </section>

      {/* Cláusula 18 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">18. WhatsApp Business API</h2>
        <p className="mb-3">El uso de WhatsApp Business API a través de la Plataforma está sujeto a:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Las Políticas de Comercio y Mensajería de Meta/WhatsApp.</li>
          <li>Las restricciones de contenido de WhatsApp Business.</li>
          <li>Los límites de mensajería establecidos por Meta según el nivel de la cuenta.</li>
        </ul>
        <p className="mt-3">
          AUCTORUM no es responsable por restricciones, suspensiones o baneos aplicados por Meta/WhatsApp
          a la cuenta del Cliente por violaciones a sus políticas.
        </p>
      </section>

      {/* Cláusula 19 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">19. Fuerza Mayor</h2>
        <p>
          Ninguna de las partes será responsable por el incumplimiento de sus obligaciones cuando dicho incumplimiento
          se deba a eventos de fuerza mayor o caso fortuito, incluyendo pero no limitado a: desastres naturales,
          pandemias, actos de gobierno, fallas de infraestructura de internet, ataques cibernéticos a terceros
          proveedores, o interrupción de servicios de Meta, Anthropic, Supabase u otros proveedores esenciales.
        </p>
      </section>

      {/* Cláusula 20 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">20. Ley Aplicable y Jurisdicción</h2>
        <p className="mb-3">
          Los presentes Términos y Condiciones se regirán e interpretarán conforme a las leyes de los
          Estados Unidos Mexicanos.
        </p>
        <p>
          Para la resolución de cualquier controversia derivada de los presentes Términos, las partes se someten
          a la jurisdicción de los tribunales competentes de la ciudad de Saltillo, Coahuila de Zaragoza, México,
          renunciando a cualquier otro fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros.
        </p>
      </section>

      {/* Cláusula 21 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">21. Divisibilidad</h2>
        <p>
          Si alguna disposición de estos Términos fuera declarada nula o inaplicable por un tribunal competente,
          las demás disposiciones continuarán en pleno vigor y efecto. La disposición nula será reemplazada por
          una disposición válida que refleje lo más cercanamente posible la intención original de las partes.
        </p>
      </section>

      {/* Cláusula 22 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">22. Cesión</h2>
        <p>
          El Cliente no podrá ceder ni transferir sus derechos u obligaciones bajo estos Términos sin el
          consentimiento previo y por escrito de AUCTORUM. AUCTORUM podrá ceder estos Términos a cualquier
          empresa del mismo grupo corporativo o en caso de fusión, adquisición o venta de activos.
        </p>
      </section>

      {/* Cláusula 23 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">23. Acuerdo Completo</h2>
        <p>
          Estos Términos y Condiciones, junto con el Aviso de Privacidad, la Política de IA, la Política de Cookies
          y los Anexos aquí referidos, constituyen el acuerdo completo entre las partes y sustituyen cualquier
          acuerdo, comunicación o propuesta anterior, oral o escrita, entre las partes.
        </p>
      </section>

      {/* Cláusula 24 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">24. Contacto</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <p className="font-semibold text-gray-900 mb-3">AUCTORUM SYSTEMS S.A.P.I. DE C.V.</p>
          <ul className="space-y-2">
            <li><strong>Correo general:</strong> <a href="mailto:contacto@auctorum.com.mx" className="text-teal-600 hover:underline">contacto@auctorum.com.mx</a></li>
            <li><strong>Correo legal:</strong> <a href="mailto:legal@auctorum.com.mx" className="text-teal-600 hover:underline">legal@auctorum.com.mx</a></li>
            <li><strong>Teléfono:</strong> <a href="tel:+528445387404" className="text-teal-600 hover:underline">+52 844 538 7404</a></li>
            <li><strong>Domicilio:</strong> Saltillo, Coahuila de Zaragoza, México</li>
          </ul>
        </div>
      </section>

      {/* Anexo A — SLA */}
      <section className="border-t border-gray-200 pt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Anexo A — Acuerdo de Nivel de Servicio (SLA)</h2>

        <h3 className="text-lg font-medium text-gray-800 mt-4 mb-3">A.1 Compromiso de Disponibilidad</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Plan</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Disponibilidad Mensual</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Tiempo Máximo de Inactividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr><td className="py-3 px-4">Starter / Professional</td><td className="py-3 px-4">99.0%</td><td className="py-3 px-4">~7.3 horas/mes</td></tr>
              <tr className="bg-gray-50"><td className="py-3 px-4">Auctorum</td><td className="py-3 px-4">99.5%</td><td className="py-3 px-4">~3.6 horas/mes</td></tr>
              <tr><td className="py-3 px-4">Enterprise</td><td className="py-3 px-4">99.9%</td><td className="py-3 px-4">~43 minutos/mes</td></tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">A.2 Exclusiones</h3>
        <p className="mb-3">No se contabilizan como tiempo de inactividad:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Mantenimiento programado con aviso de 24 horas.</li>
          <li>Interrupciones por fuerza mayor.</li>
          <li>Fallas de servicios de terceros (Meta, Anthropic, Supabase).</li>
          <li>Problemas de conectividad del Cliente.</li>
        </ul>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">A.3 Compensación</h3>
        <p>
          Si AUCTORUM no cumple con el compromiso de disponibilidad en un mes calendario, el Cliente tendrá
          derecho a un crédito de servicio proporcional al tiempo de inactividad excedente, aplicable a la
          siguiente factura. El crédito máximo será del 30% de la cuota mensual.
        </p>
      </section>

      {/* Anexo B — DPA */}
      <section className="border-t border-gray-200 pt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Anexo B — Acuerdo de Procesamiento de Datos (DPA)</h2>

        <h3 className="text-lg font-medium text-gray-800 mt-4 mb-3">B.1 Roles</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Responsable del tratamiento:</strong> el Cliente (profesional de salud/consultorio).</li>
          <li><strong>Encargado del tratamiento:</strong> AUCTORUM SYSTEMS.</li>
        </ul>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">B.2 Obligaciones de AUCTORUM como Encargado</h3>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Tratar los datos únicamente conforme a las instrucciones del Responsable y las finalidades establecidas.</li>
          <li>Implementar medidas de seguridad técnicas y organizativas adecuadas.</li>
          <li>No subcontratar sin autorización previa (los subprocesadores actuales se listan en el Aviso de Privacidad, Anexo B).</li>
          <li>Asistir al Responsable en la atención de solicitudes de derechos ARCO.</li>
          <li>Notificar vulneraciones de seguridad en un máximo de 72 horas.</li>
          <li>Devolver o eliminar los datos al término de la relación contractual, según instrucción del Responsable.</li>
        </ol>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">B.3 Obligaciones del Cliente como Responsable</h3>
        <ol className="list-decimal pl-6 space-y-1">
          <li>Informar a los titulares (pacientes) sobre el tratamiento de sus datos mediante su propio Aviso de Privacidad.</li>
          <li>Obtener el consentimiento necesario para el tratamiento de datos, especialmente datos sensibles de salud.</li>
          <li>Garantizar la licitud del tratamiento conforme a la LFPDPPP.</li>
          <li>Atender las solicitudes de derechos ARCO de los titulares en tiempo y forma.</li>
        </ol>
      </section>

      <div className="border-t border-gray-200 pt-6 mt-8 text-center text-sm text-gray-400">
        <p>Documento publicado y vigente a partir del 19 de abril de 2026.</p>
      </div>
    </div>
  );
}
