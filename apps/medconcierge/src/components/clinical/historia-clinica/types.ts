/**
 * Shapes of the 10 sections of the NOM-004 Historia Clínica.
 * All optional / partial — the form fills missing fields with empty
 * defaults and the API does partial merge per tab.
 */

export interface FamilyHistoryItem { presente: boolean; parentesco: string }
export interface HeredoFamiliares {
  diabetes?: FamilyHistoryItem
  hipertension?: FamilyHistoryItem
  cancer?: FamilyHistoryItem & { tipo?: string }
  cardiopatias?: FamilyHistoryItem
  enfermedades_mentales?: FamilyHistoryItem
  enfermedades_renales?: FamilyHistoryItem
  asma_alergias?: FamilyHistoryItem
  obesidad?: FamilyHistoryItem
  otros?: string
}

export interface NoPatologicos {
  tabaquismo?: { activo: boolean; cantidad?: string; anos?: string }
  alcoholismo?: { activo: boolean; frecuencia?: string; tipo?: string }
  drogas?: { uso: boolean; tipo?: string; frecuencia?: string }
  actividad_fisica?: { realiza: boolean; tipo?: string; frecuencia?: string }
  alimentacion?: string
  vivienda?: string
  inmunizaciones?: string
  higiene_personal?: string
  zoonosis?: string
}

export interface CirugiaItem { procedimiento: string; fecha: string; hospital: string }
export interface HospitalizacionItem { motivo: string; fecha: string; duracion: string }
export interface MedicamentoItem {
  nombre: string
  dosis: string
  via: string
  frecuencia: string
  duracion?: string
  indicaciones?: string
}

export interface Patologicos {
  enfermedades_previas?: string
  cirugias?: CirugiaItem[]
  hospitalizaciones?: HospitalizacionItem[]
  transfusiones?: { recibido: boolean; tipo?: string; fecha?: string; reacciones?: string }
  alergias_medicamentos?: string  // CRÍTICO — siempre prominente
  medicamentos_actuales?: MedicamentoItem[]
  traumatismos?: string
  enfermedades_infecciosas?: string
}

export interface GinecoObstetricos {
  menarca?: string
  ritmo_menstrual?: string
  duracion_ciclo?: string
  fum?: string
  gestas?: number
  partos?: number
  cesareas?: number
  abortos?: number
  metodo_anticonceptivo?: string
  papanicolaou_ultimo?: string
  papanicolaou_resultado?: string
  menopausia_aplica?: boolean
  menopausia_edad?: string
  otros?: string
}

export interface PadecimientoActual {
  motivo_consulta?: string
  inicio?: string
  evolucion?: string
  sintomas_principales?: string
  sintomas_asociados?: string
  tratamientos_previos?: string
  factores_agravantes?: string
  factores_atenuantes?: string
}

export interface VitalSignsValue {
  systolic?: number
  diastolic?: number
  heartRate?: number
  respiratoryRate?: number
  temperature?: number
  oxygenSat?: number
  weight?: number
  height?: number
  bmi?: number
  notes?: string
}

export interface ExploracionFisica {
  signos_vitales?: VitalSignsValue
  aspecto_general?: string
  cabeza_cuello?: string
  torax_pulmones?: string
  cardiovascular?: string
  abdomen?: string
  extremidades?: string
  neurologico?: string
  piel_tegumentos?: string
  genitourinario?: string
  musculoesqueletico?: string
  otros?: string
}

export interface DiagnosticoSecundario { texto: string; icd10?: string; icd10_description?: string }

export interface Diagnostico {
  principal?: string
  icd10_code?: string
  icd10_description?: string
  secundarios?: DiagnosticoSecundario[]
  diferenciales?: string
}

export interface PlanTratamiento {
  medicamentos?: MedicamentoItem[]
  indicaciones_no_farmacologicas?: string
  estudios_solicitados?: string
  interconsultas?: string
  proxima_cita?: string
  notas_adicionales?: string
}

export interface Pronostico {
  tipo?: 'bueno' | 'reservado' | 'malo' | ''
  para_la_vida?: string
  para_la_funcion?: string
  observaciones?: string
}

export interface ClinicalHistory {
  heredofamiliares?: HeredoFamiliares
  no_patologicos?: NoPatologicos
  patologicos?: Patologicos
  gineco_obstetricos?: GinecoObstetricos
  padecimiento_actual?: PadecimientoActual
  exploracion_fisica?: ExploracionFisica
  diagnostico?: Diagnostico
  tratamiento?: PlanTratamiento
  pronostico?: Pronostico
  updated_at?: string
}

export interface IdentificationSection {
  name?: string
  email?: string | null
  phone?: string
  birth_date?: string | null
  gender?: string | null
  curp?: string | null
  blood_type?: string | null
  occupation?: string | null
  marital_status?: string | null
  address?: string | null
  allergies?: string | null
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  emergency_contact_relationship?: string | null
  insurance_provider?: string | null
  insurance_policy_number?: string | null
  consent_signed?: boolean
  consent_signed_at?: string | null
}

export type TabId =
  | 'identificacion'
  | 'heredofamiliares'
  | 'no_patologicos'
  | 'patologicos'
  | 'gineco_obstetricos'
  | 'padecimiento_actual'
  | 'exploracion_fisica'
  | 'diagnostico'
  | 'tratamiento'
  | 'pronostico'
