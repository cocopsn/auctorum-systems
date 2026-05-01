import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Eliminación de Datos — Auctorum Systems",
  description: "Procedimiento para solicitar la eliminación de sus datos personales en Auctorum Systems",
};

export default function DataDeletionPage() {
  return (
    <div className="space-y-8 text-gray-700 leading-relaxed">
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Eliminación de Datos</h1>
        <p className="text-sm text-gray-500">Versión 1.0 — Abril 2026</p>
        <p className="text-sm text-gray-500">Última actualización: 19 de abril de 2026</p>
      </div>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Compromiso de Eliminación</h2>
        <p className="mb-3">
          <strong>AUCTORUM SYSTEMS S.A.P.I. DE C.V.</strong> (en adelante &ldquo;AUCTORUM&rdquo;) se compromete a
          respetar su derecho a la eliminación de datos personales conforme a la Ley Federal de Protección de Datos
          Personales en Posesión de los Particulares (LFPDPPP).
        </p>
        <p>
          Cualquier persona que haya interactuado con nuestra plataforma &ldquo;Concierge AI Médico&rdquo; puede
          solicitar la eliminación de sus datos personales siguiendo el procedimiento descrito en esta página.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">2. ¿Qué datos almacenamos?</h2>
        <p className="mb-3">Dependiendo de su interacción con nuestra plataforma, AUCTORUM puede almacenar:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Mensajes de WhatsApp:</strong> contenido de las conversaciones con el chatbot del consultorio,
            incluyendo textos, imágenes y archivos enviados.
          </li>
          <li>
            <strong>Datos de citas:</strong> nombre, número de teléfono, fecha y hora de citas programadas,
            motivo de consulta y estado de la cita (confirmada, cancelada, completada).
          </li>
          <li>
            <strong>Datos clínicos (si aplica):</strong> en los planes Auctorum y Enterprise, el profesional
            de salud puede registrar expedientes clínicos electrónicos que incluyen diagnósticos, tratamientos,
            evolución y archivos médicos.
          </li>
          <li>
            <strong>Datos de contacto:</strong> nombre, teléfono, correo electrónico y cualquier información
            de contacto proporcionada al consultorio.
          </li>
          <li>
            <strong>Datos de navegación:</strong> cookies de sesión y preferencias almacenadas localmente
            (ver <a href="/cookies" className="text-teal-600 hover:underline">Política de Cookies</a>).
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">3. ¿Cómo solicitar la eliminación?</h2>
        <p className="mb-4">Puede solicitar la eliminación de sus datos a través de cualquiera de los siguientes canales:</p>

        <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-teal-900 mb-4">Opción 1: Correo Electrónico</h3>
          <p className="mb-3 text-teal-800">
            Envíe un correo electrónico a{" "}
            <a href="mailto:privacidad@auctorum.com.mx" className="font-semibold underline">privacidad@auctorum.com.mx</a>
            {" "}con la siguiente información:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-teal-800">
            <li><strong>Asunto:</strong> &ldquo;Solicitud de eliminación de datos&rdquo;</li>
            <li><strong>Nombre completo</strong></li>
            <li><strong>Número de teléfono</strong> asociado a su interacción (el número desde el que contactó al consultorio por WhatsApp)</li>
            <li><strong>Consultorio o doctor</strong> con el que interactuó (si lo recuerda)</li>
            <li><strong>Descripción</strong> de los datos que desea eliminar (o &ldquo;todos mis datos&rdquo;)</li>
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4">Opción 2: WhatsApp</h3>
          <p className="text-green-800">
            Envíe un mensaje de WhatsApp al{" "}
            <a href="https://wa.me/528445387404" className="font-semibold underline">+52 844 538 7404</a>
            {" "}indicando que desea eliminar sus datos. Nuestro equipo le guiará a través del proceso.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Plazo de Respuesta</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
              <span className="text-teal-700 font-bold text-sm">1</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Confirmación de recepción: 48 horas</p>
              <p className="text-sm text-gray-600">Recibirá un acuse de recibo confirmando que su solicitud ha sido registrada.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
              <span className="text-teal-700 font-bold text-sm">2</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Bloqueo inmediato de datos</p>
              <p className="text-sm text-gray-600">
                Sus datos serán bloqueados inmediatamente tras la verificación de su identidad,
                impidiendo cualquier tratamiento posterior mientras se procesa la eliminación.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
              <span className="text-teal-700 font-bold text-sm">3</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Eliminación efectiva: 20 días hábiles</p>
              <p className="text-sm text-gray-600">
                Conforme al artículo 32 de la LFPDPPP, la eliminación se completará en un plazo máximo de 20 días
                hábiles contados a partir de la recepción de la solicitud completa.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Datos que NO se Pueden Eliminar</h2>
        <p className="mb-3">
          Conforme a la legislación mexicana, existen datos que AUCTORUM está <strong>obligada a conservar</strong>
          incluso ante una solicitud de eliminación:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Tipo de Dato</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Base Legal de Retención</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 border-b">Período</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-3 px-4">Expediente clínico electrónico</td>
                <td className="py-3 px-4">NOM-004-SSA3-2012</td>
                <td className="py-3 px-4">Mínimo 5 años desde la última atención</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="py-3 px-4">Registros de facturación fiscal</td>
                <td className="py-3 px-4">Código Fiscal de la Federación</td>
                <td className="py-3 px-4">5 años</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Datos anonimizados</td>
                <td className="py-3 px-4">Estadísticas agregadas que no identifican personas</td>
                <td className="py-3 px-4">Indefinido (no son datos personales)</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="py-3 px-4">Registros de auditoría de seguridad</td>
                <td className="py-3 px-4">Obligación contractual y regulatoria</td>
                <td className="py-3 px-4">1 año</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          En caso de que alguno de sus datos no pueda ser eliminado por obligación legal, se le informará
          específicamente cuáles datos se retienen y la base legal que fundamenta dicha retención.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Confirmación de Eliminación</h2>
        <p className="mb-3">
          Una vez completada la eliminación de sus datos, AUCTORUM le notificará por correo electrónico con:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Confirmación de que la eliminación ha sido completada.</li>
          <li>Listado de los datos eliminados.</li>
          <li>Identificación de cualquier dato retenido por obligación legal (si aplica), junto con la base legal correspondiente.</li>
          <li>Código de confirmación de la solicitud para sus registros.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Efectos de la Eliminación</h2>
        <p className="mb-3">Tenga en cuenta que la eliminación de datos puede tener los siguientes efectos:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>El historial de conversaciones con el chatbot del consultorio será eliminado permanentemente.</li>
          <li>Las citas futuras asociadas a su número serán canceladas.</li>
          <li>El acceso al portal del paciente (si aplica) será revocado.</li>
          <li>Los archivos médicos subidos a la plataforma serán eliminados (salvo retención legal del expediente clínico).</li>
        </ul>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
          <p className="text-amber-800 font-medium">Esta acción es irreversible</p>
          <p className="text-amber-700 text-sm mt-1">
            Una vez eliminados, los datos no podrán ser recuperados. Le recomendamos descargar cualquier
            información que desee conservar antes de solicitar la eliminación.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Contacto</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <p className="font-semibold text-gray-900 mb-3">Departamento de Privacidad — AUCTORUM SYSTEMS</p>
          <ul className="space-y-2">
            <li>
              <strong>Correo:</strong>{" "}
              <a href="mailto:privacidad@auctorum.com.mx" className="text-teal-600 hover:underline">privacidad@auctorum.com.mx</a>
            </li>
            <li>
              <strong>WhatsApp:</strong>{" "}
              <a href="https://wa.me/528445387404" className="text-teal-600 hover:underline">+52 844 538 7404</a>
            </li>
            <li>
              <strong>Domicilio:</strong> Saltillo, Coahuila de Zaragoza, México
            </li>
          </ul>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Autoridad Competente</h2>
        <p>
          Si considera que su derecho a la eliminación de datos no ha sido atendido adecuadamente, puede
          presentar una queja ante el Instituto Nacional de Transparencia, Acceso a la Información y
          Protección de Datos Personales (INAI):{" "}
          <a href="https://home.inai.org.mx" className="text-teal-600 hover:underline" target="_blank" rel="noopener noreferrer">www.inai.org.mx</a>.
        </p>
      </section>

      <div className="border-t border-gray-200 pt-6 mt-8 text-center text-sm text-gray-400">
        <p>Documento publicado y vigente a partir del 19 de abril de 2026.</p>
      </div>
    </div>
  );
}
