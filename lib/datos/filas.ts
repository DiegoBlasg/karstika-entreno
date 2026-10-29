// Filas tal como las devuelven las consultas de lib/servidor/consultas.ts (fechas como 'AAAA-MM-DD').
import type { Compania, Lugar, MotivoCaida, Molestia, Sesion, SesionPlan, Zona } from '../../motor'

export interface FilaPerfil {
  peso_kg: number
  anos_escalando: number
  lesiones: string[]
  grado_actual: string
  grado_objetivo: string
  inicio_temporada: string
  objetivo_temporada: string
  multipresa_en_casa: boolean
  aviso_aceptado_en: string
}
export type PerfilNuevo = Omit<FilaPerfil, 'aviso_aceptado_en'>

export interface FilaEvaluacion {
  id: string
  fecha: string
  peso_corporal_kg: number
  lastre_kg: number
  resistencia_s: number | null
  tecnica: number | null
}

export interface FilaSesion {
  id: string
  fecha: string
  sesion: Sesion
  propuesta: SesionPlan | null
  origen: 'propuesta' | 'libre'
}

export interface FilaRegistro {
  sesion_id: string
  rpe: number
  duracion_min: number
  molestias: Molestia[]
  registrado_en: string
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
}
