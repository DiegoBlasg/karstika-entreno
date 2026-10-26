import { FASE_BASE } from './fases'
import type { Peticion } from './propuesta-tipos'
import type { Perfil, Sesion } from './tipos'

export const perfilNovel: Perfil = { pesoKg: 70, anosEscalando: 1.5, lesiones: [] }
export const perfilExperto: Perfil = { pesoKg: 70, anosEscalando: 5, lesiones: [] }

export function ses(id: string, fecha: string, horaInicio: number, extra: Partial<Sesion> = {}): Sesion {
  return { id, tipo: 'bloque-limite', intensidad: 'alta', fecha, horaInicio, duracionMin: 90, ...extra }
}

// Base realista para desbloquear el test de dedos (P-32): 6 sesiones suaves de técnica en las 4 semanas previas
// al 27 de octubre, todas a más de 7 días (no cuentan para los cupos de esa semana).
export const BASE_OCTUBRE: Sesion[] = ['2026-10-01', '2026-10-04', '2026-10-07', '2026-10-10', '2026-10-14', '2026-10-18'].map(
  (fecha, i) => ses(`base${i}`, fecha, 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 }),
)

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
