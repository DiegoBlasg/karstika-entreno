// Lo que se enseña justo después de registrar una sesión (la «chapa»): el largo, el esfuerzo, los logros y lo siguiente. Puro.
import { fuerzaRelativa, objetivoRpe } from '../../motor'
import { lunesDe, sumarDias } from '../fecha'
import type { DatosAtleta, FilaRegistro, FilaSesion } from './filas'
import { progresoLargo, type ProgresoLargo } from './largo'
import { evaluacionMotor } from './mapeo'
import { cambiosPorResultados } from './plan'
import { logros, type Logro } from './progreso'
import { vistaVia, type ResultadoTest } from './via'

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

export type Mejora = 'sube' | 'baja' | 'igual' | 'primera'

export interface ResumenReunion {
  test: ResultadoTest & { id: string }
  anterior: ResultadoTest | null // el test anterior por fecha
  diferencia: number | null // puntos de % del peso (test − anterior)
  mejora: Mejora // igual si |diferencia| < 1
  reunion: { numero: number; lunes: string; fase: string } | null // la reunión de la vía cuyo resultado es este test (fase: la del largo que termina)
  siguienteLargo: { numero: number; fase: string; objetivo: string; semanas: number } | null // primer largo que empieza después de la semana del test
  repeaters: { lastreInicial: number; lastreMaximo: number } | null // solo si este es el último test y sigue vigente
  logrosNuevos: Logro[] // conseguidos con fecha === test.fecha
}

// Por debajo de este cambio (en puntos de % del peso) el test se considera igual que el anterior.
export const UMBRAL_IGUAL = 1

export function resumenReunion(d: DatosAtleta, evaluacionId: string, hoy: string): ResumenReunion | null {
  const ordenadas = [...d.evaluaciones].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id))
  const i = ordenadas.findIndex((e) => e.id === evaluacionId)
  if (i < 0) return null
  const resultado = (e: (typeof ordenadas)[number]): ResultadoTest => ({ fecha: e.fecha, lastreKg: e.lastre_kg, fuerzaRelativa: fuerzaRelativa(evaluacionMotor(e)) })
  const test = { ...resultado(ordenadas[i]!), id: evaluacionId }
  const anterior = i > 0 ? resultado(ordenadas[i - 1]!) : null
  const diferencia = anterior ? test.fuerzaRelativa - anterior.fuerzaRelativa : null
  const mejora: Mejora = diferencia === null ? 'primera' : Math.abs(diferencia) < UMBRAL_IGUAL ? 'igual' : diferencia > 0 ? 'sube' : 'baja'

  const via = vistaVia(d, hoy)
  const reuniones = via.largos.flatMap((l) => l.reuniones.map((r) => ({ r, l })))
  const k = reuniones.findIndex(({ r }) => r.resultado?.fecha === test.fecha)
  const reunion = k >= 0 ? { numero: k + 1, lunes: reuniones[k]!.r.lunes, fase: reuniones[k]!.l.fase } : null
  // La semana de referencia es la de la reunión (el test puede estar hecho unos días antes o después) o, si no, la del propio test.
  const lunesRef = reunion?.lunes ?? lunesDe(test.fecha)
  const sig = via.largos.find((l) => l.chapas[0] && l.chapas[0].lunes > lunesRef)
  const siguienteLargo = sig ? { numero: sig.numero, fase: sig.fase, objetivo: sig.objetivo, semanas: sig.chapas.length } : null

  const cambios = cambiosPorResultados(d, hoy)
  const repeaters = cambios.ultimoTest?.fecha === test.fecha ? cambios.repeaters : null
  // Los logros se miden con los tests hasta este (así el récord es de este test aunque luego haya otros).
  const hasta = { ...d, evaluaciones: ordenadas.slice(0, i + 1) }
  const logrosNuevos = logros(hasta, hoy).filter((l) => l.conseguido && l.fecha === test.fecha)
  return { test, anterior, diferencia, mejora, reunion, siguienteLargo, repeaters, logrosNuevos }
}
