import type { Explicacion } from './explicacion'

export const TIPOS_SESION = [
  'multipresa-resistencia', 'multipresa-maxima', 'multipresa-resistencia-fuerza', 'evaluacion-dedos', 'board', 'bloque-limite',
  'bloque-suave', 'via-cuerda-limite', 'via-autoasegurada', 'pegues-proyecto',
  'campus', 'resistencia-4x4', 'arc', 'tecnica', 'dominadas', 'hombro', 'descanso',
] as const
export type TipoSesion = (typeof TIPOS_SESION)[number]

// Únicos tipos que pueden ir como complemento dentro de otra sesión: no cargan los dedos, para que nadie pueda
// esconder carga intensa de dedos dentro de una sesión compuesta. Técnica, ARC y hombro son suaves; las dominadas
// (P-39) tienen sus propias reglas de seguridad (seguridad.dominadas-*). El orden es el de colocación: el hombro,
// siempre al final.
export const TIPOS_COMPLEMENTO = ['tecnica', 'arc', 'dominadas', 'hombro'] as const
export type TipoComplemento = (typeof TIPOS_COMPLEMENTO)[number]

export type Intensidad = 'alta' | 'suave'
export type Agarre = 'abierto' | 'semiarqueado' | 'arqueado'
export type Compania = 'solo' | 'con-gente'
export type Lugar = 'rocodromo' | 'roca' | 'casa'

export interface Perfil {
  pesoKg: number
  anosEscalando: number
  lesiones: string[]
}

export interface Contexto {
  compania: Compania
  lugar: Lugar
  minutosDisponibles: number
  multipresaEnCasa?: boolean   // false: en casa no hay multipresa (solo barra); ausente = sí hay
}

export interface Sesion {
  id: string
  tipo: TipoSesion
  intensidad: Intensidad
  fecha: string            // 'AAAA-MM-DD', día natural local del usuario
  horaInicio: number       // 0 <= h < 24, hora local (puede tener decimales)
  duracionMin: number
  detalle?: { regletaMm?: number; agarre?: Agarre; conCarga?: boolean }
  incluye?: TipoComplemento[]   // complementos suaves añadidos a la sesión (cuentan para los cupos de la fase)
  descarga?: boolean            // hecha en semana de descarga: no cuenta para subir la multipresa
}

export interface Violacion {
  regla: string
  sesionIds: string[]
  mensaje: string
  explicacion: Explicacion
}
