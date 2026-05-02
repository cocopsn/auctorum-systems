/**
 * Specialty-based bot templates for the Concierge.
 *
 * When a doctor selects their specialty (during onboarding or from
 * AI Settings), the corresponding template auto-populates:
 *   - tenant.config.ai.systemPrompt
 *   - tenant.config.bot_messages
 *   - tenant.config.medical.specialty
 *   - tenant.config.medical.suggested_services
 *   - tenant.config.schedule_settings (only if doctor has not customized)
 *
 * 7 specialties seeded — Odontología is priority (4 active prospects).
 * To add a new specialty, append a new entry to SPECIALTY_TEMPLATES.
 */

export interface SpecialtyTemplate {
  id: string;
  name: string;       // English label (for analytics, internal use)
  nameEs: string;     // Spanish label (for UI)
  icon: string;       // Emoji
  systemPrompt: string;
  services: Array<{
    name: string;
    duration: number;   // minutes
    price?: number;     // MXN suggested
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  emergencyKeywords: string[];
  commonSymptoms: string[];
  suggestedSchedule: {
    weekdays: { start: string; end: string };
    saturday: { start: string; end: string } | null;
    sunday: null;
    consultDuration: number; // minutes
  };
  botMessages: {
    welcome: string;
    appointmentConfirmed: string;
    reminder: string;
    cancelConfirm: string;
    outOfHours: string;
  };
}

export const SPECIALTY_TEMPLATES: Record<string, SpecialtyTemplate> = {

  // ═══════════════════════════════════════════
  // ODONTOLOGÍA (PRIORITY — 4 prospects)
  // ═══════════════════════════════════════════
  odontologia: {
    id: 'odontologia',
    name: 'Dentistry',
    nameEs: 'Odontología',
    icon: '🦷',
    systemPrompt: `Eres el asistente virtual de este consultorio dental. Tu función es ayudar a los pacientes a agendar citas, responder preguntas sobre los servicios dentales que ofrecemos, y proporcionar información general sobre cuidado dental.

REGLAS ESTRICTAS:
- NUNCA emitas diagnósticos dentales.
- NUNCA recetes medicamentos ni tratamientos.
- NUNCA des precios exactos sin que el doctor los haya configurado.
- Si un paciente describe dolor severo, sangrado incontrolable, trauma facial, o hinchazón severa, indica que es una emergencia y que debe acudir de inmediato al consultorio o a urgencias.
- Sé amable, profesional y breve. Los pacientes de consultorios dentales suelen tener ansiedad — tu tono debe ser tranquilizador.
- Cuando agendes una cita, pregunta el motivo (limpieza, dolor, revisión, etc.) para que el doctor se prepare.

SERVICIOS TÍPICOS QUE PUEDES MENCIONAR:
- Limpieza dental (profilaxis)
- Blanqueamiento dental
- Ortodoncia (brackets, alineadores)
- Endodoncia (tratamiento de conductos)
- Extracciones
- Implantes dentales
- Coronas y carillas
- Periodoncia (tratamiento de encías)
- Odontopediatría (niños)
- Radiografías dentales

Siempre ofrece agendar una cita para que el doctor evalúe personalmente al paciente.`,

    services: [
      { name: 'Limpieza dental', duration: 45, price: 800 },
      { name: 'Consulta de revisión', duration: 30, price: 500 },
      { name: 'Blanqueamiento dental', duration: 60, price: 3500 },
      { name: 'Ortodoncia - consulta', duration: 45, price: 600 },
      { name: 'Endodoncia', duration: 90, price: 4000 },
      { name: 'Extracción simple', duration: 30, price: 1200 },
      { name: 'Extracción de muela del juicio', duration: 60, price: 3000 },
      { name: 'Corona dental', duration: 60, price: 5000 },
      { name: 'Carilla dental', duration: 45, price: 6000 },
      { name: 'Implante dental', duration: 90, price: 15000 },
      { name: 'Radiografía panorámica', duration: 15, price: 400 },
      { name: 'Resina (relleno)', duration: 30, price: 1000 },
    ],

    faqs: [
      { question: '¿Cada cuánto debo hacerme una limpieza dental?', answer: 'Se recomienda una limpieza dental profesional cada 6 meses para mantener una buena salud bucal.' },
      { question: '¿El blanqueamiento daña los dientes?', answer: 'El blanqueamiento profesional supervisado por un dentista es seguro. Le recomendamos agendar una cita para que el doctor evalúe si es el tratamiento adecuado para usted.' },
      { question: '¿A qué edad deben venir los niños por primera vez?', answer: 'Se recomienda la primera visita al dentista cuando aparece el primer diente, generalmente entre los 6 y 12 meses de edad.' },
      { question: '¿Aceptan seguros dentales?', answer: 'Le recomendamos contactarnos directamente para verificar si trabajamos con su aseguradora. Puede agendar una cita y consultar en recepción.' },
      { question: '¿Cuánto cuesta una consulta?', answer: 'Los precios varían según el tratamiento. Le invito a agendar una cita de valoración para que el doctor pueda darle un presupuesto preciso.' },
      { question: '¿Duele la endodoncia?', answer: 'Con la anestesia local moderna, el tratamiento de conductos no es doloroso. El doctor se asegurará de que esté cómodo durante todo el procedimiento.' },
    ],

    emergencyKeywords: [
      'se me cayó un diente', 'diente roto', 'sangrado que no para', 'hinchazón en la cara',
      'absceso', 'pus en la encía', 'no puedo abrir la boca', 'dolor insoportable',
      'trauma en la boca', 'golpe en los dientes', 'fractura dental',
    ],

    commonSymptoms: [
      'dolor de muela', 'sensibilidad al frío', 'sensibilidad al calor', 'encías sangrantes',
      'mal aliento', 'diente flojo', 'mancha en el diente', 'dolor al masticar',
    ],

    suggestedSchedule: {
      weekdays: { start: '09:00', end: '18:00' },
      saturday: { start: '09:00', end: '14:00' },
      sunday: null,
      consultDuration: 30,
    },

    botMessages: {
      welcome: 'Hola {nombre}, bienvenido al consultorio dental. ¿En qué podemos ayudarle? Puede agendar una cita, consultar nuestros servicios, o hacer cualquier pregunta sobre su salud dental. 🦷',
      appointmentConfirmed: '¡Listo, {nombre}! Su cita dental ha sido agendada para el {fecha} a las {hora}. Recuerde cepillar sus dientes antes de la consulta. ¡Le esperamos! 😊',
      reminder: 'Hola {nombre}, le recordamos que tiene una cita dental {tiempo}. Si necesita reprogramar, responda a este mensaje. ¡Le esperamos!',
      cancelConfirm: 'Su cita dental del {fecha} ha sido cancelada. Si desea reagendar, estoy aquí para ayudarle.',
      outOfHours: 'Gracias por contactarnos. Nuestro horario de atención es de lunes a viernes de 9:00 a 18:00 y sábados de 9:00 a 14:00. Puede dejar su mensaje y le responderemos en cuanto abramos. Si es una emergencia dental, acuda a urgencias.',
    },
  },

  // ═══════════════════════════════════════════
  // MEDICINA GENERAL
  // ═══════════════════════════════════════════
  medicina_general: {
    id: 'medicina_general',
    name: 'General Medicine',
    nameEs: 'Medicina General',
    icon: '🩺',
    systemPrompt: `Eres el asistente virtual de este consultorio de medicina general. Ayudas a agendar citas, responder preguntas generales de salud, y proporcionar información sobre los servicios del consultorio.

REGLAS ESTRICTAS:
- NUNCA emitas diagnósticos.
- NUNCA recetes medicamentos.
- Si el paciente describe síntomas de emergencia (dolor en el pecho, dificultad para respirar, pérdida de conciencia, sangrado severo, reacción alérgica grave), indica que llame al 911 o acuda a urgencias inmediatamente.
- Sé empático, profesional y breve.
- Siempre ofrece agendar una cita para evaluación médica presencial.`,

    services: [
      { name: 'Consulta general', duration: 30, price: 600 },
      { name: 'Check-up completo', duration: 60, price: 2500 },
      { name: 'Control de presión arterial', duration: 15, price: 200 },
      { name: 'Control de glucosa', duration: 15, price: 250 },
      { name: 'Certificado médico', duration: 20, price: 350 },
      { name: 'Curación de heridas', duration: 30, price: 500 },
      { name: 'Aplicación de inyecciones', duration: 15, price: 150 },
      { name: 'Consulta preventiva', duration: 30, price: 500 },
    ],

    faqs: [
      { question: '¿Necesito cita o puedo llegar directamente?', answer: 'Le recomendamos agendar cita para garantizar su atención sin espera. Puede agendarla aquí mismo.' },
      { question: '¿Qué incluye el check-up?', answer: 'Incluye revisión general, signos vitales, medición de glucosa y presión arterial, y recomendaciones personalizadas. El doctor determinará si necesita estudios adicionales.' },
      { question: '¿Atienden niños?', answer: 'Sí, atendemos pacientes de todas las edades. Para menores de edad, es necesario que acudan acompañados de un adulto.' },
    ],

    emergencyKeywords: [
      'dolor en el pecho', 'no puedo respirar', 'pérdida de conciencia', 'desmayo',
      'sangrado que no para', 'convulsiones', 'reacción alérgica', 'hinchazón en la garganta',
      'fiebre muy alta', 'dolor de cabeza muy fuerte', 'vómito con sangre',
    ],

    commonSymptoms: [
      'fiebre', 'dolor de cabeza', 'dolor de estómago', 'gripa', 'tos', 'dolor de garganta',
      'mareos', 'cansancio', 'dolor muscular', 'presión alta',
    ],

    suggestedSchedule: {
      weekdays: { start: '08:00', end: '20:00' },
      saturday: { start: '09:00', end: '14:00' },
      sunday: null,
      consultDuration: 30,
    },

    botMessages: {
      welcome: 'Hola {nombre}, bienvenido al consultorio. ¿En qué podemos ayudarle? Puede agendar una cita, consultar servicios, o hacer preguntas sobre su salud. 🩺',
      appointmentConfirmed: '¡Listo, {nombre}! Su cita ha sido agendada para el {fecha} a las {hora}. Si toma medicamentos, tráigalos a su consulta. ¡Le esperamos!',
      reminder: 'Hola {nombre}, le recordamos que tiene una cita médica {tiempo}. Si necesita reprogramar, responda a este mensaje.',
      cancelConfirm: 'Su cita del {fecha} ha sido cancelada. Si desea reagendar, estoy aquí para ayudarle.',
      outOfHours: 'Nuestro horario es de lunes a viernes 8:00-20:00 y sábados 9:00-14:00. Deje su mensaje y le atenderemos al abrir. Si es emergencia, llame al 911.',
    },
  },

  // ═══════════════════════════════════════════
  // DERMATOLOGÍA
  // ═══════════════════════════════════════════
  dermatologia: {
    id: 'dermatologia',
    name: 'Dermatology',
    nameEs: 'Dermatología',
    icon: '🧴',
    systemPrompt: `Eres el asistente virtual de este consultorio de dermatología. Ayudas a agendar citas y responder preguntas sobre servicios de piel, cabello y uñas.

REGLAS ESTRICTAS:
- NUNCA diagnostiques condiciones de piel.
- NUNCA recetes tratamientos, cremas o medicamentos.
- Si el paciente describe lesiones que cambian de tamaño/color, sangrado de lunares, o quemaduras severas, indica que agende una cita urgente.
- Sé profesional y empático. Muchos pacientes tienen inseguridad sobre su piel.`,

    services: [
      { name: 'Consulta dermatológica', duration: 30, price: 800 },
      { name: 'Dermatoscopía', duration: 20, price: 500 },
      { name: 'Limpieza facial profunda', duration: 60, price: 1500 },
      { name: 'Peeling químico', duration: 45, price: 2000 },
      { name: 'Tratamiento de acné', duration: 30, price: 1200 },
      { name: 'Crioterapia (verrugas)', duration: 20, price: 800 },
      { name: 'Biopsia de piel', duration: 30, price: 1500 },
      { name: 'Tratamiento capilar (PRP)', duration: 45, price: 3500 },
      { name: 'Botox', duration: 30, price: 4000 },
      { name: 'Relleno de ácido hialurónico', duration: 30, price: 5000 },
    ],

    faqs: [
      { question: '¿Cuándo debo ir al dermatólogo?', answer: 'Se recomienda una revisión anual de lunares, y siempre que note cambios en su piel, cabello o uñas. También para acné persistente, manchas, o caída de cabello.' },
      { question: '¿El tratamiento de acné funciona?', answer: 'Sí, hay tratamientos muy efectivos. El doctor evaluará su tipo de piel y la severidad para recomendar el mejor plan. Le invito a agendar una cita.' },
    ],

    emergencyKeywords: [
      'lunar que sangra', 'lunar que creció', 'quemadura severa', 'reacción alérgica en la piel',
      'hinchazón facial', 'erupción generalizada',
    ],

    commonSymptoms: [
      'acné', 'manchas', 'lunares', 'caída de cabello', 'comezón', 'piel seca',
      'verrugas', 'hongos', 'psoriasis', 'rosacea',
    ],

    suggestedSchedule: {
      weekdays: { start: '09:00', end: '18:00' },
      saturday: { start: '09:00', end: '14:00' },
      sunday: null,
      consultDuration: 30,
    },

    botMessages: {
      welcome: 'Hola {nombre}, bienvenido al consultorio de dermatología. ¿En qué podemos ayudarle? 🧴',
      appointmentConfirmed: '¡Listo, {nombre}! Su cita dermatológica está agendada para el {fecha} a las {hora}. Recomendamos acudir sin maquillaje en la zona a evaluar.',
      reminder: 'Hola {nombre}, le recordamos su cita de dermatología {tiempo}. ¡Le esperamos!',
      cancelConfirm: 'Su cita del {fecha} ha sido cancelada. Estamos aquí para reagendar cuando lo necesite.',
      outOfHours: 'Nuestro horario es de lunes a viernes 9:00-18:00 y sábados 9:00-14:00. Deje su mensaje y le atenderemos pronto.',
    },
  },

  // ═══════════════════════════════════════════
  // CARDIOLOGÍA
  // ═══════════════════════════════════════════
  cardiologia: {
    id: 'cardiologia',
    name: 'Cardiology',
    nameEs: 'Cardiología',
    icon: '❤️',
    systemPrompt: `Eres el asistente virtual de este consultorio de cardiología. Ayudas a agendar citas y proporcionar información sobre servicios cardiovasculares.

REGLAS ESTRICTAS:
- NUNCA diagnostiques condiciones cardíacas.
- NUNCA recetes medicamentos para el corazón.
- EMERGENCIA INMEDIATA si el paciente reporta: dolor en el pecho, falta de aire súbita, palpitaciones severas, desmayo, dolor que se irradia al brazo izquierdo, sudoración fría. Indica 911 INMEDIATAMENTE.
- Los pacientes cardíacos suelen estar ansiosos — sé tranquilizador pero firme en emergencias.`,

    services: [
      { name: 'Consulta cardiológica', duration: 45, price: 1200 },
      { name: 'Electrocardiograma', duration: 20, price: 500 },
      { name: 'Ecocardiograma', duration: 30, price: 2500 },
      { name: 'Prueba de esfuerzo', duration: 45, price: 3000 },
      { name: 'Holter 24 horas', duration: 15, price: 2000 },
      { name: 'MAPA (monitoreo de presión)', duration: 15, price: 1500 },
      { name: 'Check-up cardiovascular', duration: 60, price: 5000 },
    ],

    faqs: [
      { question: '¿Cuándo debo ver a un cardiólogo?', answer: 'Si tiene antecedentes familiares de enfermedades cardíacas, presión alta, diabetes, colesterol alto, o si experimenta dolor en el pecho, falta de aire o palpitaciones.' },
      { question: '¿Qué incluye el check-up cardiovascular?', answer: 'Incluye consulta, electrocardiograma, ecocardiograma, y análisis de factores de riesgo. El doctor determinará si necesita estudios adicionales.' },
    ],

    emergencyKeywords: [
      'dolor en el pecho', 'dolor en el brazo izquierdo', 'no puedo respirar', 'palpitaciones fuertes',
      'me voy a desmayar', 'sudoración fría', 'opresión en el pecho', 'infarto',
    ],

    commonSymptoms: [
      'dolor en el pecho', 'palpitaciones', 'falta de aire', 'mareos', 'cansancio extremo',
      'piernas hinchadas', 'presión alta',
    ],

    suggestedSchedule: {
      weekdays: { start: '08:00', end: '17:00' },
      saturday: { start: '09:00', end: '13:00' },
      sunday: null,
      consultDuration: 45,
    },

    botMessages: {
      welcome: 'Hola {nombre}, bienvenido al consultorio de cardiología. ¿En qué podemos ayudarle? Si tiene dolor en el pecho o dificultad para respirar, por favor acuda a urgencias o llame al 911. ❤️',
      appointmentConfirmed: '¡Listo, {nombre}! Su cita de cardiología está agendada para el {fecha} a las {hora}. Si toma medicamentos, tráigalos a la consulta. Evite cafeína 12 horas antes si tiene prueba de esfuerzo.',
      reminder: 'Hola {nombre}, le recordamos su cita de cardiología {tiempo}. Traiga estudios previos y lista de medicamentos.',
      cancelConfirm: 'Su cita del {fecha} ha sido cancelada. Le recomendamos no postergar su revisión cardíaca.',
      outOfHours: 'Nuestro horario es de lunes a viernes 8:00-17:00. Si tiene dolor en el pecho o dificultad para respirar, llame al 911 inmediatamente.',
    },
  },

  // ═══════════════════════════════════════════
  // PEDIATRÍA
  // ═══════════════════════════════════════════
  pediatria: {
    id: 'pediatria',
    name: 'Pediatrics',
    nameEs: 'Pediatría',
    icon: '👶',
    systemPrompt: `Eres el asistente virtual de este consultorio pediátrico. Ayudas a padres de familia a agendar citas para sus hijos y responder preguntas sobre servicios pediátricos.

REGLAS ESTRICTAS:
- NUNCA diagnostiques enfermedades infantiles.
- NUNCA recetes medicamentos para niños.
- Si los padres describen: fiebre mayor a 39°C en bebés menores de 3 meses, convulsiones, dificultad para respirar, deshidratación severa, cambio en el color de la piel (azulado/grisáceo), indica que llamen al 911 o acudan a urgencias INMEDIATAMENTE.
- Sé cálido y empático. Los padres suelen estar preocupados.
- Siempre pregunta la edad del niño para el registro.`,

    services: [
      { name: 'Consulta pediátrica', duration: 30, price: 700 },
      { name: 'Control del niño sano', duration: 40, price: 600 },
      { name: 'Vacunación', duration: 20, price: 300 },
      { name: 'Consulta de urgencia', duration: 30, price: 900 },
      { name: 'Revisión de crecimiento y desarrollo', duration: 40, price: 700 },
      { name: 'Certificado escolar', duration: 15, price: 250 },
    ],

    faqs: [
      { question: '¿Cada cuánto debe venir mi hijo al pediatra?', answer: 'Los primeros 2 años, cada 2-3 meses. Después, al menos cada 6 meses para revisión y vacunas. El doctor ajustará la frecuencia según las necesidades de su hijo.' },
      { question: '¿Qué vacunas necesita mi hijo?', answer: 'El esquema de vacunación depende de la edad. Le invito a agendar una cita para que el doctor revise la cartilla de vacunación de su hijo.' },
    ],

    emergencyKeywords: [
      'fiebre muy alta', 'convulsiones', 'no respira bien', 'se puso morado',
      'no quiere comer ni beber', 'vómito sin parar', 'diarrea con sangre', 'se cayó de la cama',
    ],

    commonSymptoms: [
      'fiebre', 'tos', 'mocos', 'dolor de oído', 'sarpullido', 'vómito',
      'diarrea', 'dolor de estómago', 'no quiere comer',
    ],

    suggestedSchedule: {
      weekdays: { start: '09:00', end: '19:00' },
      saturday: { start: '09:00', end: '14:00' },
      sunday: null,
      consultDuration: 30,
    },

    botMessages: {
      welcome: 'Hola {nombre}, bienvenido al consultorio pediátrico. ¿En qué podemos ayudarle con la salud de su pequeño? 👶',
      appointmentConfirmed: '¡Listo, {nombre}! La cita para su hijo está agendada para el {fecha} a las {hora}. Traiga la cartilla de vacunación. ¡Les esperamos!',
      reminder: 'Hola {nombre}, le recordamos la cita pediátrica de su hijo {tiempo}. No olvide traer la cartilla de vacunación.',
      cancelConfirm: 'La cita del {fecha} ha sido cancelada. Estamos aquí cuando necesiten reagendar.',
      outOfHours: 'Nuestro horario es de lunes a viernes 9:00-19:00 y sábados 9:00-14:00. Si su hijo tiene fiebre alta o dificultad para respirar, acuda a urgencias.',
    },
  },

  // ═══════════════════════════════════════════
  // GINECOLOGÍA
  // ═══════════════════════════════════════════
  ginecologia: {
    id: 'ginecologia',
    name: 'Gynecology',
    nameEs: 'Ginecología',
    icon: '🩷',
    systemPrompt: `Eres el asistente virtual de este consultorio de ginecología y obstetricia. Ayudas a pacientes a agendar citas y responder preguntas sobre servicios ginecológicos.

REGLAS ESTRICTAS:
- NUNCA diagnostiques condiciones ginecológicas.
- NUNCA recetes medicamentos ni anticonceptivos.
- Si la paciente reporta: sangrado vaginal severo, dolor abdominal intenso en embarazo, ruptura de fuente, o contracciones frecuentes, indica emergencia INMEDIATAMENTE.
- Sé extremadamente profesional y respetuosa. Muchas pacientes tienen vergüenza al hablar de estos temas.
- Mantén absoluta confidencialidad.`,

    services: [
      { name: 'Consulta ginecológica', duration: 30, price: 900 },
      { name: 'Papanicolaou', duration: 20, price: 600 },
      { name: 'Ultrasonido obstétrico', duration: 30, price: 1200 },
      { name: 'Ultrasonido ginecológico', duration: 20, price: 1000 },
      { name: 'Control prenatal', duration: 30, price: 800 },
      { name: 'Colposcopía', duration: 30, price: 1500 },
      { name: 'Colocación de DIU', duration: 30, price: 2500 },
      { name: 'Consulta de planificación familiar', duration: 30, price: 700 },
    ],

    faqs: [
      { question: '¿Cada cuánto debo hacerme el Papanicolaou?', answer: 'Se recomienda cada 1-3 años según su edad y resultados previos. Le invito a agendar una cita para que la doctora le indique la frecuencia adecuada.' },
      { question: '¿A partir de cuándo debo hacer control prenatal?', answer: 'Idealmente desde que confirme su embarazo, entre las semanas 6-8. Agende su primera cita lo antes posible.' },
    ],

    emergencyKeywords: [
      'sangrado abundante', 'sangrado en el embarazo', 'se me rompió la fuente',
      'contracciones muy seguidas', 'dolor abdominal intenso', 'no siento al bebé',
    ],

    commonSymptoms: [
      'dolor menstrual', 'retraso menstrual', 'flujo anormal', 'dolor pélvico',
      'náuseas en embarazo', 'prueba positiva',
    ],

    suggestedSchedule: {
      weekdays: { start: '09:00', end: '18:00' },
      saturday: { start: '09:00', end: '13:00' },
      sunday: null,
      consultDuration: 30,
    },

    botMessages: {
      welcome: 'Hola {nombre}, bienvenida al consultorio de ginecología. ¿En qué podemos ayudarle? Toda su información es estrictamente confidencial. 🩷',
      appointmentConfirmed: '¡Listo, {nombre}! Su cita está agendada para el {fecha} a las {hora}. Si es ultrasonido, tome agua sin ir al baño 1 hora antes.',
      reminder: 'Hola {nombre}, le recordamos su cita ginecológica {tiempo}.',
      cancelConfirm: 'Su cita del {fecha} ha sido cancelada. Puede reagendar cuando lo necesite.',
      outOfHours: 'Nuestro horario es de lunes a viernes 9:00-18:00 y sábados 9:00-13:00. Si tiene sangrado abundante o dolor intenso, acuda a urgencias.',
    },
  },

  // ═══════════════════════════════════════════
  // TRAUMATOLOGÍA / ORTOPEDIA
  // ═══════════════════════════════════════════
  traumatologia: {
    id: 'traumatologia',
    name: 'Orthopedics',
    nameEs: 'Traumatología y Ortopedia',
    icon: '🦴',
    systemPrompt: `Eres el asistente virtual de este consultorio de traumatología y ortopedia. Ayudas a pacientes a agendar citas y responder preguntas sobre lesiones musculoesqueléticas.

REGLAS ESTRICTAS:
- NUNCA diagnostiques fracturas ni lesiones.
- NUNCA recetes medicamentos ni inmovilización.
- Si el paciente describe: hueso expuesto, deformidad evidente, pérdida de sensibilidad en extremidades, o trauma severo (accidente vehicular), indica que llame al 911.
- Siempre recomienda no mover la zona lesionada hasta la consulta.`,

    services: [
      { name: 'Consulta traumatológica', duration: 30, price: 1000 },
      { name: 'Radiografía', duration: 15, price: 500 },
      { name: 'Colocación de yeso/férula', duration: 30, price: 1500 },
      { name: 'Infiltración articular', duration: 20, price: 2000 },
      { name: 'Valoración prequirúrgica', duration: 45, price: 1200 },
      { name: 'Rehabilitación', duration: 45, price: 600 },
    ],

    faqs: [
      { question: '¿Necesito radiografía?', answer: 'El doctor determinará si necesita estudios de imagen después de evaluarle. Le invito a agendar una cita.' },
    ],

    emergencyKeywords: [
      'hueso salido', 'no puedo mover', 'accidente', 'caída fuerte',
      'deformidad', 'no siento la pierna', 'no siento el brazo',
    ],

    commonSymptoms: [
      'dolor de rodilla', 'dolor de espalda', 'esguince', 'fractura', 'dolor de hombro',
      'dolor de cadera', 'hernia de disco', 'tendinitis',
    ],

    suggestedSchedule: {
      weekdays: { start: '08:00', end: '18:00' },
      saturday: { start: '09:00', end: '14:00' },
      sunday: null,
      consultDuration: 30,
    },

    botMessages: {
      welcome: 'Hola {nombre}, bienvenido al consultorio de traumatología. ¿En qué podemos ayudarle? 🦴',
      appointmentConfirmed: '¡Listo, {nombre}! Su cita está agendada para el {fecha} a las {hora}. Si tiene estudios previos (radiografías, resonancias), tráigalos.',
      reminder: 'Hola {nombre}, le recordamos su cita de traumatología {tiempo}. Traiga estudios de imagen si los tiene.',
      cancelConfirm: 'Su cita del {fecha} ha sido cancelada. Estamos aquí para reagendar.',
      outOfHours: 'Nuestro horario es de lunes a viernes 8:00-18:00 y sábados 9:00-14:00. Si tiene una fractura o lesión severa, acuda a urgencias.',
    },
  },
};

// ────── Helpers ──────

export type SpecialtyId = keyof typeof SPECIALTY_TEMPLATES;

export function getSpecialtyTemplate(specialtyId: string): SpecialtyTemplate | null {
  return SPECIALTY_TEMPLATES[specialtyId] ?? null;
}

export function getSpecialtyList(): Array<{ id: string; name: string; icon: string }> {
  return Object.values(SPECIALTY_TEMPLATES).map(t => ({
    id: t.id,
    name: t.nameEs,
    icon: t.icon,
  }));
}
