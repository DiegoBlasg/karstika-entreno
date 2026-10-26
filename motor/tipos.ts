import type { Explicacion } from './explicacion'

export const TIPOS_SESION = [
  'multipresa-resistencia', 'multipresa-maxima', 'evaluacion-dedos', 'board', 'bloque-limite',
  'bloque-suave', 'via-cuerda-limite', 'via-autoasegurada', 'pegues-proyecto',
  'campus', 'resistencia-4x4', 'arc', 'tecnica', 'dominadas', 'hombro', 'descanso',
] as const
export type TipoSesion = (typeof TIPOS_SESION)[number]

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
}

export interface Sesion {
  id: string
  tipo: TipoSesion
  intensidad: Intensidad
  fecha: string            // 'AAAA-MM-DD', día natural local del usuario
  horaInicio: number       // 0 <= h < 24, hora local (puede tener decimales)
  duracionMin: number
  detalle?: { regletaMm?: number; agarre?: Agarre; conCarga?: boolean }
}

export interface Violacion {
  regla: string
  sesionIds: string[]
  mensaje: string
  explicacion: Explicacion
}
