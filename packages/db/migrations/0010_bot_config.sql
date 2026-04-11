-- Migration 0010: Add bot_messages and bot_config JSONB columns to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bot_messages JSONB DEFAULT '{
  "welcome": "Hola {nombre}, bienvenido a {negocio}. ¿En qué podemos ayudarte?",
  "out_of_catalog": "Lo sentimos, ese producto no está en nuestro catálogo.",
  "out_of_stock": "Ese producto no está disponible en este momento.",
  "order_confirmed": "Tu pedido ha sido confirmado. Te avisaremos cuando esté listo.",
  "appointment_confirmed": "Tu cita ha sido confirmada para el {fecha} a las {hora}.",
  "appointment_reminder": "Recordatorio: mañana {fecha} tienes cita a las {hora}.",
  "recall": "Hola {nombre}, ha pasado tiempo desde tu última visita. Te invitamos a agendar tu próxima cita."
}'::jsonb;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bot_config JSONB DEFAULT '{
  "tone": "amigable",
  "bot_name": "Asistente",
  "bot_personality": "Soy un asistente virtual profesional y amable.",
  "brand_color": "#6366f1",
  "schedule": {
    "monday": {"enabled": true, "start": "09:00", "end": "18:00"},
    "tuesday": {"enabled": true, "start": "09:00", "end": "18:00"},
    "wednesday": {"enabled": true, "start": "09:00", "end": "18:00"},
    "thursday": {"enabled": true, "start": "09:00", "end": "18:00"},
    "friday": {"enabled": true, "start": "09:00", "end": "18:00"},
    "saturday": {"enabled": false, "start": "09:00", "end": "14:00"},
    "sunday": {"enabled": false, "start": "", "end": ""}
  },
  "out_of_hours_message": "Estamos fuera de horario. Te responderemos en cuanto abramos.",
  "faqs": []
}'::jsonb;
