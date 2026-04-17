import { AiManager } from '@quote-engine/ui';

export const dynamic = 'force-dynamic';

export default function AiSettingsPage() {
  return (
    <AiManager
      title="AI Concierge"
      defaultPrompt="Eres el concierge comercial de este negocio B2B. Ayuda a explicar productos, resolver preguntas de cotizaciones, sugerir siguientes pasos y transferir a un humano cuando la respuesta dependa de inventario, precio final o aprobacion interna."
    />
  );
}
