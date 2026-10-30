// Lo que se enseña justo después de registrar una sesión (la «chapa»): el largo, el esfuerzo, los logros y lo siguiente. Puro.
import { objetivoRpe } from '../../motor'
import { lunesDe, sumarDias } from '../fecha'
import type { DatosAtleta, FilaRegistro, FilaSesion } from './filas'
import { progresoLargo, type ProgresoLargo } from './largo'
import { logros, type Logro } from './progreso'

export type Valoracion = 'previsto' | 'mas-duro' | 'mas-suave' | 'sin-objetivo'

export interface ResumenRegistro {
  sesion: FilaSesion
  registro: FilaRegistro
  largo: ProgresoLargo | null
  esfuerzo: { rpe: number; objetivo: number | null; valoracion: Valoracion }
  siguiente: FilaSesion | null
  logrosNuevos: Logro[]
  conTest: string | null
}

function valorar(rpe: number, objetivo: number | null): Valoracion {
  if (objetivo === null) return 'sin-objetivo'
  if (rpe > objetivo) return 'mas-duro'
  if (rpe < objetivo - 2) return 'mas-suave'
  return 'previsto'
}

const despues = (a: FilaSesion, b: FilaSesion): boolean =>
  a.fecha > b.fecha || (a.fecha === b.fecha && a.sesion.horaInicio > b.sesion.horaInicio)

export function resumenRegistro(d: DatosAtleta, sesionId: string): ResumenRegistro | null {
  const sesion = d.sesiones.find((s) => s.id === sesionId)
  const registro = d.registros.find((r) => r.sesion_id === sesionId)
  if (!sesion || !registro) return null
  const registradas = new Set(d.registros.map((r) => r.sesion_id))
  const siguiente =
    d.sesiones
      .filter((s) => !registradas.has(s.id) && s.sesion.tipo !== 'descanso' && despues(s, sesion))
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.sesion.horaInicio - b.sesion.horaInicio)[0] ?? null
  // Los logros se miden al cierre de la semana de la sesión (una semana solo está «cumplida» cuando ya ha pasado).
  const lunes = lunesDe(sesion.fecha)
  const domingo = sumarDias(lunes, 6)
  const logrosNuevos = logros(d, sumarDias(lunes, 7)).filter((l) => l.conseguido && l.fecha !== null && l.fecha >= lunes && l.fecha <= domingo)
  const objetivo = objetivoRpe(sesion.sesion) ?? null
  return {
    sesion,
    registro,
    largo: progresoLargo(d, sesion.fecha),
    esfuerzo: { rpe: registro.rpe, objetivo, valoracion: valorar(registro.rpe, objetivo) },
    siguiente,
    logrosNuevos,
    conTest: sesion.sesion.tipo === 'evaluacion-dedos' ? (d.evaluaciones.find((e) => e.fecha === sesion.fecha)?.id ?? null) : null,
  }
}

export function textoEsfuerzo(e: ResumenRegistro['esfuerzo']): string {
  switch (e.valoracion) {
    case 'previsto': return `Esfuerzo ${e.rpe}/10: lo previsto. La carga sigue su curso.`
    case 'mas-duro': return `Esfuerzo ${e.rpe}/10: más duro de lo previsto (máximo ${e.objetivo}). El entrenador no subirá la carga en la próxima.`
    case 'mas-suave': return `Esfuerzo ${e.rpe}/10: más suave de lo previsto.`
    case 'sin-objetivo': return `Esfuerzo ${e.rpe}/10.`
  }
}
