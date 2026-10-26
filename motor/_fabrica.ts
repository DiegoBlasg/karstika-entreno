import { FASE_BASE } from './fases'
import type { Peticion } from './propuesta-tipos'
import type { Perfil, Sesion } from './tipos'

export const perfilNovel: Perfil = { pesoKg: 70, anosEscalando: 1.5, lesiones: [] }
export const perfilExperto: Perfil = { pesoKg: 70, anosEscalando: 5, lesiones: [] }

export function ses(id: string, fecha: string, horaInicio: number, extra: Partial<Sesion> = {}): Sesion {
  return { id, tipo: 'bloque-limite', intensidad: 'alta', fecha, horaInicio, duracionMin: 90, ...extra }
}

export function peticion(extra: Partial<Peticion> = {}): Peticion {
  return {
    fecha: '2026-10-27',
    horaInicio: 19,
    contexto: { compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120 },
    perfil: perfilNovel,
    historial: [],
    fase: FASE_BASE,
    ...extra,
  }
}
