/**
 * ICD-10 (CIE-10) common diagnoses for Mexican medical practice.
 *
 * This is NOT the full catalog (~68k codes). It's the ~150 codes most
 * frequently used across Mexican primary care, dentistry, dermatology,
 * pediatrics, ob-gyn, cardiology, and orthopedics. Sufficient for the
 * majority of consultations; doctors with specialty needs can type the
 * code manually.
 *
 * To extend: append entries grouped by `category`.
 */

export interface Icd10Entry {
  code: string
  description: string
  category: string
}

export const ICD10_COMMON: Icd10Entry[] = [
  // ─── Odontología ───
  { code: 'K02.9', description: 'Caries dental, no especificada', category: 'Odontología' },
  { code: 'K02.1', description: 'Caries de la dentina', category: 'Odontología' },
  { code: 'K04.0', description: 'Pulpitis', category: 'Odontología' },
  { code: 'K04.1', description: 'Necrosis de la pulpa', category: 'Odontología' },
  { code: 'K04.7', description: 'Absceso periapical sin fístula', category: 'Odontología' },
  { code: 'K05.0', description: 'Gingivitis aguda', category: 'Odontología' },
  { code: 'K05.1', description: 'Gingivitis crónica', category: 'Odontología' },
  { code: 'K05.3', description: 'Periodontitis crónica', category: 'Odontología' },
  { code: 'K06.1', description: 'Hiperplasia gingival', category: 'Odontología' },
  { code: 'K07.6', description: 'Trastornos de la articulación temporomandibular', category: 'Odontología' },
  { code: 'K08.1', description: 'Pérdida de dientes por accidente o extracción', category: 'Odontología' },
  { code: 'K08.8', description: 'Otros trastornos especificados de los dientes', category: 'Odontología' },
  { code: 'K12.0', description: 'Estomatitis aftosa recurrente', category: 'Odontología' },
  { code: 'K13.7', description: 'Otras lesiones de la mucosa bucal', category: 'Odontología' },
  { code: 'Z01.2', description: 'Examen odontológico', category: 'Odontología' },
  { code: 'Z29.8', description: 'Otras medidas profilácticas (limpieza dental)', category: 'Odontología' },

  // ─── Medicina General — respiratorio ───
  { code: 'J00', description: 'Rinofaringitis aguda (resfriado común)', category: 'Medicina General' },
  { code: 'J02.9', description: 'Faringitis aguda, no especificada', category: 'Medicina General' },
  { code: 'J03.9', description: 'Amigdalitis aguda, no especificada', category: 'Medicina General' },
  { code: 'J06.9', description: 'Infección aguda de las vías respiratorias superiores', category: 'Medicina General' },
  { code: 'J20.9', description: 'Bronquitis aguda', category: 'Medicina General' },
  { code: 'J18.9', description: 'Neumonía, no especificada', category: 'Medicina General' },
  { code: 'J45.9', description: 'Asma, no especificada', category: 'Medicina General' },
  { code: 'J44.9', description: 'EPOC, no especificada', category: 'Medicina General' },

  // ─── Medicina General — digestivo ───
  { code: 'K29.7', description: 'Gastritis, no especificada', category: 'Medicina General' },
  { code: 'K30', description: 'Dispepsia funcional', category: 'Medicina General' },
  { code: 'K21.0', description: 'Reflujo gastroesofágico con esofagitis', category: 'Medicina General' },
  { code: 'K58.9', description: 'Síndrome de intestino irritable, sin diarrea', category: 'Medicina General' },
  { code: 'K59.0', description: 'Estreñimiento', category: 'Medicina General' },
  { code: 'A09', description: 'Diarrea y gastroenteritis de origen presuntamente infeccioso', category: 'Medicina General' },

  // ─── Medicina General — crónicas ───
  { code: 'I10', description: 'Hipertensión arterial esencial (primaria)', category: 'Medicina General' },
  { code: 'E11.9', description: 'Diabetes mellitus tipo 2 sin complicaciones', category: 'Medicina General' },
  { code: 'E11.65', description: 'Diabetes mellitus tipo 2 con hiperglicemia', category: 'Medicina General' },
  { code: 'E78.5', description: 'Hiperlipidemia, no especificada', category: 'Medicina General' },
  { code: 'E66.9', description: 'Obesidad, no especificada', category: 'Medicina General' },
  { code: 'E03.9', description: 'Hipotiroidismo, no especificado', category: 'Medicina General' },
  { code: 'D50.9', description: 'Anemia por deficiencia de hierro', category: 'Medicina General' },

  // ─── Medicina General — varios ───
  { code: 'R51', description: 'Cefalea', category: 'Medicina General' },
  { code: 'R10.4', description: 'Otros dolores abdominales y los no especificados', category: 'Medicina General' },
  { code: 'R50.9', description: 'Fiebre, no especificada', category: 'Medicina General' },
  { code: 'R05', description: 'Tos', category: 'Medicina General' },
  { code: 'R42', description: 'Mareo y desvanecimiento', category: 'Medicina General' },
  { code: 'R53', description: 'Malestar y fatiga', category: 'Medicina General' },
  { code: 'N39.0', description: 'Infección de las vías urinarias', category: 'Medicina General' },
  { code: 'L30.9', description: 'Dermatitis, no especificada', category: 'Medicina General' },
  { code: 'F32.9', description: 'Episodio depresivo, no especificado', category: 'Medicina General' },
  { code: 'F41.1', description: 'Trastorno de ansiedad generalizada', category: 'Medicina General' },
  { code: 'G47.0', description: 'Trastornos del inicio y mantenimiento del sueño', category: 'Medicina General' },
  { code: 'Z00.0', description: 'Examen general e investigación de personas sin quejas', category: 'Medicina General' },

  // ─── Dermatología ───
  { code: 'L70.0', description: 'Acné vulgar', category: 'Dermatología' },
  { code: 'L70.1', description: 'Acné conglobata', category: 'Dermatología' },
  { code: 'L20.9', description: 'Dermatitis atópica', category: 'Dermatología' },
  { code: 'L21.9', description: 'Dermatitis seborreica', category: 'Dermatología' },
  { code: 'L23.9', description: 'Dermatitis alérgica de contacto', category: 'Dermatología' },
  { code: 'L40.9', description: 'Psoriasis, no especificada', category: 'Dermatología' },
  { code: 'L50.9', description: 'Urticaria, no especificada', category: 'Dermatología' },
  { code: 'L80', description: 'Vitíligo', category: 'Dermatología' },
  { code: 'L81.4', description: 'Otras hiperpigmentaciones de la piel (melasma)', category: 'Dermatología' },
  { code: 'B07', description: 'Verrugas víricas', category: 'Dermatología' },
  { code: 'B35.1', description: 'Tinea unguium (onicomicosis)', category: 'Dermatología' },
  { code: 'L71.9', description: 'Rosácea, no especificada', category: 'Dermatología' },
  { code: 'L65.9', description: 'Caída del cabello', category: 'Dermatología' },
  { code: 'D22.9', description: 'Nevo melanocítico, no especificado', category: 'Dermatología' },

  // ─── Cardiología ───
  { code: 'I20.9', description: 'Angina de pecho, no especificada', category: 'Cardiología' },
  { code: 'I25.10', description: 'Cardiopatía isquémica crónica', category: 'Cardiología' },
  { code: 'I50.9', description: 'Insuficiencia cardiaca, no especificada', category: 'Cardiología' },
  { code: 'I48.9', description: 'Fibrilación auricular y aleteo auricular', category: 'Cardiología' },
  { code: 'I47.1', description: 'Taquicardia supraventricular', category: 'Cardiología' },
  { code: 'I49.9', description: 'Arritmia cardíaca, no especificada', category: 'Cardiología' },
  { code: 'I95.9', description: 'Hipotensión, no especificada', category: 'Cardiología' },
  { code: 'R07.9', description: 'Dolor en el pecho, no especificado', category: 'Cardiología' },
  { code: 'R00.0', description: 'Taquicardia, no especificada', category: 'Cardiología' },

  // ─── Pediatría ───
  { code: 'P07.30', description: 'Recién nacido pretérmino, no especificado', category: 'Pediatría' },
  { code: 'P59.9', description: 'Ictericia neonatal, no especificada', category: 'Pediatría' },
  { code: 'B05.9', description: 'Sarampión sin complicación', category: 'Pediatría' },
  { code: 'B06.9', description: 'Rubéola sin complicación', category: 'Pediatría' },
  { code: 'B01.9', description: 'Varicela sin complicación', category: 'Pediatría' },
  { code: 'B26.9', description: 'Parotiditis sin complicaciones', category: 'Pediatría' },
  { code: 'H66.9', description: 'Otitis media supurativa, no especificada', category: 'Pediatría' },
  { code: 'H65.9', description: 'Otitis media no supurativa', category: 'Pediatría' },
  { code: 'B34.9', description: 'Infección viral, no especificada', category: 'Pediatría' },
  { code: 'P08.0', description: 'Recién nacido excepcionalmente grande', category: 'Pediatría' },
  { code: 'Z00.1', description: 'Examen de rutina del niño', category: 'Pediatría' },

  // ─── Ginecología y Obstetricia ───
  { code: 'O80', description: 'Parto único espontáneo', category: 'Ginecología' },
  { code: 'O82', description: 'Parto único por cesárea', category: 'Ginecología' },
  { code: 'O20.0', description: 'Amenaza de aborto', category: 'Ginecología' },
  { code: 'O03.9', description: 'Aborto espontáneo, no especificado', category: 'Ginecología' },
  { code: 'N94.6', description: 'Dismenorrea, no especificada', category: 'Ginecología' },
  { code: 'N91.2', description: 'Amenorrea, no especificada', category: 'Ginecología' },
  { code: 'N93.9', description: 'Hemorragia vaginal y uterina anormal', category: 'Ginecología' },
  { code: 'N76.0', description: 'Vaginitis aguda', category: 'Ginecología' },
  { code: 'N87.9', description: 'Displasia cervical, no especificada', category: 'Ginecología' },
  { code: 'N95.1', description: 'Estados menopáusicos y climatéricos femeninos', category: 'Ginecología' },
  { code: 'Z30.0', description: 'Consejo y asesoramiento sobre anticoncepción', category: 'Ginecología' },
  { code: 'Z34.9', description: 'Supervisión de embarazo normal', category: 'Ginecología' },
  { code: 'Z32.0', description: 'Examen y prueba de embarazo', category: 'Ginecología' },

  // ─── Traumatología y Ortopedia ───
  { code: 'M54.5', description: 'Lumbago no especificado', category: 'Traumatología' },
  { code: 'M54.2', description: 'Cervicalgia', category: 'Traumatología' },
  { code: 'M51.1', description: 'Trastornos del disco lumbar con radiculopatía', category: 'Traumatología' },
  { code: 'M75.1', description: 'Síndrome del manguito rotador', category: 'Traumatología' },
  { code: 'M77.1', description: 'Epicondilitis lateral', category: 'Traumatología' },
  { code: 'M77.0', description: 'Epicondilitis medial', category: 'Traumatología' },
  { code: 'M17.9', description: 'Gonartrosis, no especificada', category: 'Traumatología' },
  { code: 'M16.9', description: 'Coxartrosis, no especificada', category: 'Traumatología' },
  { code: 'M19.9', description: 'Artrosis, no especificada', category: 'Traumatología' },
  { code: 'S52.5', description: 'Fractura de la extremidad distal del radio', category: 'Traumatología' },
  { code: 'S82.6', description: 'Fractura del maléolo lateral', category: 'Traumatología' },
  { code: 'S93.4', description: 'Esguince y torcedura del tobillo', category: 'Traumatología' },
  { code: 'S83.5', description: 'Esguince y torcedura del LCA o LCP', category: 'Traumatología' },
  { code: 'M65.4', description: 'Tenosinovitis de De Quervain', category: 'Traumatología' },
  { code: 'M70.0', description: 'Sinovitis y tenosinovitis', category: 'Traumatología' },
  { code: 'M79.7', description: 'Fibromialgia', category: 'Traumatología' },

  // ─── Salud preventiva ───
  { code: 'Z00.6', description: 'Examen de comparación y control en programa clínico', category: 'Preventivo' },
  { code: 'Z23', description: 'Necesidad de inmunización contra enfermedades bacterianas', category: 'Preventivo' },
  { code: 'Z71.3', description: 'Asesoramiento dietético y vigilancia', category: 'Preventivo' },
  { code: 'Z71.1', description: 'Persona con miedo a la enfermedad', category: 'Preventivo' },
  { code: 'Z76.5', description: 'Persona con simulación consciente de enfermedad', category: 'Preventivo' },
]

/** Quick lookup by code. */
export function findIcd10ByCode(code: string): Icd10Entry | undefined {
  return ICD10_COMMON.find((e) => e.code === code)
}

/** Search by code prefix or description substring (case-insensitive). */
export function searchIcd10(query: string, limit = 12): Icd10Entry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const codeMatches: Icd10Entry[] = []
  const descMatches: Icd10Entry[] = []
  for (const e of ICD10_COMMON) {
    if (e.code.toLowerCase().startsWith(q)) codeMatches.push(e)
    else if (e.description.toLowerCase().includes(q)) descMatches.push(e)
    if (codeMatches.length + descMatches.length >= limit * 2) break
  }
  return [...codeMatches, ...descMatches].slice(0, limit)
}

/** Distinct categories present in the catalog. */
export const ICD10_CATEGORIES = Array.from(new Set(ICD10_COMMON.map((e) => e.category)))
