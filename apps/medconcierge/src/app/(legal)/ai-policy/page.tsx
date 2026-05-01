import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Inteligencia Artificial — Auctorum Systems",
  description: "Política de uso de inteligencia artificial en la plataforma Concierge AI Médico de Auctorum Systems",
};

export default function AIPolicyPage() {
  return (
    <div className="space-y-8 text-gray-700 leading-relaxed">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Inteligencia Artificial</h1>
        <p className="text-sm text-gray-500">Versión 1.0 — Abril 2026</p>
        <p className="text-sm text-gray-500">Última actualización: 19 de abril de 2026</p>
      </div>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introducción</h2>
        <p className="mb-3">
          <strong>AUCTORUM SYSTEMS S.A.P.I. DE C.V.</strong> (en adelante &ldquo;AUCTORUM&rdquo;) integra tecnología de inteligencia
          artificial (&ldquo;IA&rdquo;) en su plataforma &ldquo;Concierge AI Médico&rdquo; para asistir a los consultorios
          médicos en la atención a pacientes.
        </p>
        <p>
          Esta Política describe cómo funciona el sistema de IA, qué datos procesa, cuáles son sus limitaciones
          y los derechos de los usuarios. Este documento complementa el{" "}
          <a href="/privacy" className="text-teal-600 hover:underline">Aviso de Privacidad</a> y los{" "}
          <a href="/terms" className="text-teal-600 hover:underline">Términos y Condiciones</a> de AUCTORUM.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Tecnología Utilizada</h2>
        <h3 className="text-lg font-medium text-gray-800 mt-4 mb-3">2.1 Modelo de Lenguaje</h3>
        <p className="mb-3">
          El chatbot de AUCTORUM utiliza la API de <strong>Anthropic</strong> (modelo Claude) para procesar y generar
          respuestas en lenguaje natural. Anthropic es una empresa de investigación en seguridad de IA con sede en
          San Francisco, Estados Unidos.
        </p>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">2.2 Funcionamiento del Chatbot</h3>
        <p className="mb-3">El asistente de IA opera de la siguiente manera:</p>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>Recepción del mensaje:</strong> el paciente envía un mensaje por WhatsApp al número del consultorio.</li>
          <li><strong>Procesamiento:</strong> el mensaje se envía a la API de Anthropic junto con las instrucciones configuradas por el profesional de salud (system prompt) y el historial reciente de la conversación.</li>
          <li><strong>Generación de respuesta:</strong> el modelo de IA genera una respuesta basada en las instrucciones, la información del consultorio (horarios, servicios, precios) y el contexto de la conversación.</li>
          <li><strong>Ejecución de acciones:</strong> si la conversación lo amerita, el chatbot puede ejecutar acciones como agendar una cita, cancelar una cita, o enviar información del consultorio.</li>
          <li><strong>Envío:</strong> la respuesta se envía al paciente por WhatsApp.</li>
        </ol>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">2.3 Alcance de las Capacidades</h3>
        <p className="mb-3">El chatbot de IA <strong>puede</strong>:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Responder preguntas sobre el consultorio (horarios, ubicación, servicios, costos).</li>
          <li>Agendar, reprogramar y cancelar citas.</li>
          <li>Enviar recordatorios de citas.</li>
          <li>Proporcionar información general de salud de dominio público.</li>
          <li>Escalar conversaciones complejas al profesional de salud.</li>
        </ul>
        <p className="mt-4 mb-3">El chatbot de IA <strong>NO puede</strong>:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Realizar diagnósticos médicos.</li>
          <li>Prescribir medicamentos o tratamientos.</li>
          <li>Interpretar resultados de laboratorio o estudios de imagen.</li>
          <li>Sustituir una consulta médica presencial.</li>
          <li>Tomar decisiones clínicas.</li>
          <li>Acceder a información que no haya sido proporcionada por el consultorio o el paciente.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Datos Procesados por la IA</h2>
        <h3 className="text-lg font-medium text-gray-800 mt-4 mb-3">3.1 Datos de Entrada</h3>
        <p className="mb-3">Para generar cada respuesta, el modelo de IA recibe:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>El mensaje actual del paciente.</li>
          <li>El historial reciente de la conversación (últimos mensajes relevantes).</li>
          <li>Las instrucciones del consultorio (system prompt configurado por el profesional de salud).</li>
          <li>Información del consultorio: horarios, servicios, precios, dirección.</li>
          <li>El estado de las citas del paciente (si las tiene).</li>
        </ul>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">3.2 Datos que NO se Envían a la IA</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Expedientes clínicos completos.</li>
          <li>Resultados de laboratorio o estudios de imagen.</li>
          <li>Datos de facturación o financieros.</li>
          <li>Datos de otros pacientes o consultorios.</li>
          <li>Credenciales de acceso.</li>
        </ul>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">3.3 Retención de Datos por el Proveedor de IA</h3>
        <p>
          Anthropic, como proveedor de la API, tiene su propia política de retención de datos. Según sus términos
          de servicio para uso de API, Anthropic <strong>no utiliza los datos enviados a través de su API para entrenar
          sus modelos</strong>. Los datos de entrada y salida pueden ser retenidos temporalmente por Anthropic para
          monitoreo de abuso, conforme a su política de uso.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Control y Supervisión Humana</h2>
        <h3 className="text-lg font-medium text-gray-800 mt-4 mb-3">4.1 Rol del Profesional de Salud</h3>
        <p className="mb-3">El profesional de salud que contrata AUCTORUM mantiene control sobre:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Instrucciones del chatbot:</strong> configura qué puede y qué no puede decir el asistente de IA.</li>
          <li><strong>Revisión de conversaciones:</strong> puede revisar todas las conversaciones del chatbot con sus pacientes.</li>
          <li><strong>Intervención manual:</strong> puede tomar el control de una conversación en cualquier momento.</li>
          <li><strong>Desactivación:</strong> puede desactivar el chatbot de IA en cualquier momento.</li>
        </ul>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">4.2 Escalamiento</h3>
        <p>
          El chatbot está programado para escalar al profesional de salud cuando detecta situaciones que
          requieren intervención humana, como emergencias médicas declaradas por el paciente, solicitudes
          que exceden sus capacidades configuradas, o cuando el paciente solicita hablar con una persona.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Transparencia</h2>
        <h3 className="text-lg font-medium text-gray-800 mt-4 mb-3">5.1 Identificación como IA</h3>
        <p className="mb-3">
          AUCTORUM recomienda que el profesional de salud configure su chatbot para identificarse como un
          asistente automatizado. La plataforma proporciona plantillas de mensajes iniciales que incluyen
          esta identificación.
        </p>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">5.2 Limitaciones Conocidas</h3>
        <p className="mb-3">Como todo sistema de IA basado en modelos de lenguaje, el chatbot puede:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Generar respuestas incorrectas</strong> (&ldquo;alucinaciones&rdquo;): el modelo puede generar información que suena correcta pero no lo es.</li>
          <li><strong>Malinterpretar mensajes</strong> del paciente, especialmente con coloquialismos, abreviaciones o mensajes ambiguos.</li>
          <li><strong>No detectar emergencias:</strong> el chatbot no está diseñado ni certificado como sistema de emergencias médicas.</li>
          <li><strong>Sesgo:</strong> los modelos de lenguaje pueden reflejar sesgos presentes en sus datos de entrenamiento.</li>
        </ul>

        <h3 className="text-lg font-medium text-gray-800 mt-6 mb-3">5.3 Mitigaciones</h3>
        <p className="mb-3">AUCTORUM implementa las siguientes medidas para mitigar riesgos:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Instrucciones específicas (system prompt) que limitan el comportamiento del chatbot al dominio médico-administrativo.</li>
          <li>Prohibición explícita de realizar diagnósticos o prescripciones en las instrucciones del sistema.</li>
          <li>Capacidad de escalamiento automático cuando el chatbot detecta situaciones fuera de su alcance.</li>
          <li>Registro completo de todas las conversaciones para auditoría.</li>
          <li>Actualizaciones periódicas de las instrucciones basadas en retroalimentación.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Derechos de los Usuarios</h2>
        <p className="mb-3">Los pacientes que interactúan con el chatbot de IA tienen derecho a:</p>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>Ser informados</strong> de que están interactuando con un sistema automatizado.</li>
          <li><strong>Solicitar atención humana</strong> en cualquier momento de la conversación.</li>
          <li><strong>Acceder</strong> al historial de sus conversaciones con el chatbot.</li>
          <li><strong>Solicitar la eliminación</strong> de sus datos conforme a la <a href="/data-deletion" className="text-teal-600 hover:underline">Política de Eliminación de Datos</a>.</li>
          <li><strong>Ejercer sus derechos ARCO</strong> conforme al <a href="/privacy" className="text-teal-600 hover:underline">Aviso de Privacidad</a>.</li>
          <li><strong>Oponerse</strong> al tratamiento automatizado de sus datos.</li>
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Responsabilidad</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-amber-800 font-medium">Aviso importante</p>
          <p className="text-amber-700 text-sm mt-1">
            El chatbot de IA de AUCTORUM es una herramienta de asistencia administrativa. No constituye un
            dispositivo médico, no está certificado como tal, y no debe utilizarse para tomar decisiones clínicas.
          </p>
        </div>
        <ul className="list-disc pl-6 space-y-2">
          <li>AUCTORUM es responsable del correcto funcionamiento técnico de la plataforma y de la integración con la API de Anthropic.</li>
          <li>El profesional de salud es responsable de las instrucciones configuradas en el chatbot y de supervisar su funcionamiento.</li>
          <li>El profesional de salud es el único responsable de las decisiones clínicas, independientemente de la información proporcionada por el chatbot.</li>
          <li>AUCTORUM no garantiza la precisión de las respuestas generadas por el modelo de IA.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Seguridad</h2>
        <p className="mb-3">Las comunicaciones con el sistema de IA están protegidas por:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Cifrado TLS en tránsito entre el servidor de AUCTORUM y la API de Anthropic.</li>
          <li>Cifrado de extremo a extremo proporcionado por WhatsApp entre el paciente y los servidores de Meta.</li>
          <li>Aislamiento multi-tenant: las instrucciones y datos de un consultorio nunca se mezclan con los de otro.</li>
          <li>Control de acceso basado en roles para la configuración del chatbot.</li>
          <li>Registro de auditoría de todas las interacciones.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Mejora Continua</h2>
        <p className="mb-3">
          AUCTORUM se compromete a mejorar continuamente su sistema de IA mediante:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Monitoreo de la calidad de las respuestas del chatbot.</li>
          <li>Actualización de las instrucciones del sistema basada en casos de uso reales.</li>
          <li>Evaluación periódica de nuevos modelos de IA que ofrezcan mejor rendimiento o seguridad.</li>
          <li>Incorporación de retroalimentación de los profesionales de salud.</li>
          <li>Cumplimiento de nuevas regulaciones aplicables a la IA en México.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">10. Marco Regulatorio</h2>
        <p className="mb-3">
          Esta política se enmarca en la legislación mexicana vigente y en las mejores prácticas internacionales
          de IA responsable:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).</li>
          <li>Principios de IA de la OCDE (México es miembro).</li>
          <li>Estrategia Nacional de Inteligencia Artificial de México.</li>
          <li>Términos de uso de la API de Anthropic (proveedor del modelo de IA).</li>
          <li>Políticas de WhatsApp Business API de Meta.</li>
        </ul>
        <p className="mt-3">
          AUCTORUM monitorea activamente los desarrollos legislativos en materia de IA en México y se
          compromete a adaptar sus prácticas conforme evolucione el marco regulatorio.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Actualizaciones a esta Política</h2>
        <p>
          AUCTORUM se reserva el derecho de actualizar esta Política de Inteligencia Artificial conforme evolucione
          la tecnología, la regulación o las prácticas de la industria. Las actualizaciones serán publicadas en
          esta misma URL (
          <a href="https://auctorum.com.mx/ai-policy" className="text-teal-600 hover:underline">https://auctorum.com.mx/ai-policy</a>).
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">12. Contacto</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <p className="font-semibold text-gray-900 mb-3">Preguntas sobre el uso de IA</p>
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
