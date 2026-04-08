import { AiManager } from '@quote-engine/ui'

export const dynamic = 'force-dynamic'

export default function AiSettingsPage() {
  return (
    <AiManager
      title="AI Concierge Medico"
      defaultPrompt="Eres un concierge medico para el consultorio. Ayuda a resolver preguntas frecuentes, explicar horarios y preparar solicitudes de cita. No diagnostiques ni sustituyas criterio medico; si hay sintomas urgentes, indica contactar emergencias o transferir a humano."
    />
  )
}
