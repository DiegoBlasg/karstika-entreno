// Filas tal como las devuelven las consultas de lib/servidor/consultas.ts (fechas como 'AAAA-MM-DD').
import type { Compania, Contexto, Freno, Lugar, MotivoCaida, Molestia, Sesion, SesionPlan, Zona } from '../../motor'

export interface FilaPerfil {
  peso_kg: number
  anos_escalando: number
  lesiones: string[]
  grado_actual: string
  grado_objetivo: string
  inicio_temporada: string
  objetivo_temporada: string
  multipresa_en_casa: boolean
  dias_semana?: DiasSemana | null   // cuántos días suele entrenar (P-74); nulo = sin contestar
  aviso_aceptado_en: string
}

export const DIAS_SEMANA = ['1', '2', '3-4', '5-6', 'todos'] as const
export type DiasSemana = (typeof DIAS_SEMANA)[number]
export type PerfilNuevo = Omit<FilaPerfil, 'aviso_aceptado_en'>

export interface FilaEvaluacion {
  id: string
  fecha: string
  peso_corporal_kg: number
  lastre_kg: number
  resistencia_s: number | null
  tecnica: number | null
  colgado_30_s?: number | null   // colgado continuo en 30 mm a peso corporal (P-24); la base siempre lo devuelve
  colgado_con_descarga?: boolean  // el colgado se hizo con descarga (no llegaba a 10 s): no se compara con uno sin ella
  power_slap_cm?: number | null
  creada_en?: string   // cuándo se apuntó (la base siempre lo devuelve)
}

// El «test en casa»: dominadas máximas y apertura de cadera (menos cm, más apertura).
export interface FilaPruebaCasa {
  id: string
  fecha: string
  dominadas: number | null
  cadera_cm: number | null
}

export interface FilaSesion {
  id: string
  fecha: string
  sesion: Sesion
  // `contexto`: con quién, dónde y minutos con que se generó (para «Otra opción» y los valores de la hoja).
  propuesta: (SesionPlan & { contexto?: Contexto }) | null
  origen: 'propuesta' | 'libre'
}

export interface FilaRegistro {
  sesion_id: string
  rpe: number
  duracion_min: number
  molestias: Molestia[]
  registrado_en: string
  // «¿Qué te frenó hoy?» (solo sesiones al límite) y si se encadenó algo. La base siempre los devuelve; opcionales
  // para los registros construidos a mano.
  freno?: Freno | null
  encadene?: boolean
}

export interface FilaChequeo {
  fecha: string
  sueno: number
  fatiga: number
  ganas: number
  molestias: Molestia[]
}

export interface FilaAlta {
  id: string
  zona: Zona
  fecha: string
}

export interface FilaConsejo {
  consejo_id: string
  fecha: string
}

export interface FilaIntento {
  id: string
  sesion_id: string
  fecha: string
  encadenado: boolean
  motivo_caida: MotivoCaida | null
}

export interface FilaHueco {
  id: string
  fecha: string
  inicio_min: number             // minutos desde las 00:00
  compania: Compania
  lugar: Lugar
  minutos: number
}

export interface DatosAtleta {
  perfil: FilaPerfil
  evaluaciones: FilaEvaluacion[]
  sesiones: FilaSesion[]
  registros: FilaRegistro[]
  chequeos: FilaChequeo[]
  altas: FilaAlta[]
  consejos: FilaConsejo[]
  intentos: FilaIntento[]
  huecos: FilaHueco[]
  pruebasCasa?: FilaPruebaCasa[]   // la base siempre las devuelve; opcional para los datos construidos a mano
}
