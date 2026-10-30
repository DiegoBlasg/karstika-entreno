// Lo que se enseña justo después de registrar una sesión (la «chapa»): el largo, el esfuerzo, los logros y lo siguiente. Puro.
import { estadoAtleta, fuerzaRelativa, objetivoRpe, VALORES } from '../../motor'
import { lunesDe } from '../fecha'
import type { DatosAtleta, FilaRegistro, FilaSesion } from './filas'
import { progresoLargo, type ProgresoLargo } from './largo'
import { evaluacionMotor, historialMotor, seguimientoMotor } from './mapeo'
import { cambiosPorResultados } from './plan'
import { logros, UMBRAL_IGUAL, type Logro } from './progreso'
import { vistaVia, type ResultadoTest } from './via'

export type Valoracion = 'previsto' | 'mas-duro' | 'mas-suave' | 'sin-objetivo'
// Lo que el motor (estadoAtleta) ha decidido de esta sesión: si cuenta para subir la carga (P-11) y, si no, por qué.
export type Veredicto = 'cuenta' | 'por-encima' | 'incompleta' | 'molestia'

export interface ResumenRegistro {
  sesion: FilaSesion
  registro: FilaRegistro
  largo: ProgresoLargo | null
  // valoracion: el RPE frente al objetivo (descripción); veredicto y sinSubida: lo que entiende el motor hoy.
  esfuerzo: { rpe: number; objetivo: number | null; valoracion: Valoracion; veredicto: Veredicto; sinSubida: boolean }
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

// El veredicto sale de estadoAtleta (sesionesNoValidas). El motor no dice el motivo; se deduce con sus mismas reglas
// (P-63: por encima si RPE > máximo o RPE × minutos reales > máximo × minutos previstos; P-11: incompleta por debajo de
// fraccionCompletada) y, si no es ninguna de las dos, la que queda es la molestia en dedos o muñeca (P-46).
function veredictoDe(noValida: boolean, sesion: FilaSesion, registro: FilaRegistro, objetivo: number | null): Veredicto {
  if (!noValida) return 'cuenta'
  const previstos = sesion.sesion.duracionMin
  if (objetivo !== null && (registro.rpe > objetivo || registro.rpe * registro.duracion_min > objetivo * previstos)) return 'por-encima'
  if (registro.duracion_min < VALORES['P-63'].fraccionCompletada * previstos) return 'incompleta'
  return 'molestia'
}

// `hoy`: la fecha real (Madrid) en que se enseña la chapa.
export function resumenRegistro(d: DatosAtleta, sesionId: string, hoy: string): ResumenRegistro | null {
  const sesion = d.sesiones.find((s) => s.id === sesionId)
  const registro = d.registros.find((r) => r.sesion_id === sesionId)
  if (!sesion || !registro) return null
  const registradas = new Set(d.registros.map((r) => r.sesion_id))
  // Lo siguiente nunca es una sesión ya pasada (al registrar tarde, las de días anteriores sin registrar no cuentan).
  const siguiente =
    d.sesiones
      .filter((s) => !registradas.has(s.id) && s.sesion.tipo !== 'descanso' && s.fecha >= hoy && despues(s, sesion))
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.sesion.horaInicio - b.sesion.horaInicio)[0] ?? null
  // Logros nuevos, siempre calculados con hoy (una semana solo está cumplida cuando ha terminado, así que nunca se anuncia
  // uno que luego pueda desaparecer): los que este registro hace conseguir y los conseguidos después del registro anterior
  // (una semana cerrada a tiempo se celebra en la primera chapa tras cerrarla, una sola vez).
  const otros = d.registros.filter((r) => r.sesion_id !== sesionId)
  const antes = new Set(logros({ ...d, registros: otros }, hoy).filter((l) => l.conseguido).map((l) => l.id))
  const ultimoAnterior = otros.map((r) => r.registrado_en.slice(0, 10)).sort().at(-1)
  const logrosNuevos = logros(d, hoy).filter(
    (l) => l.conseguido && (!antes.has(l.id) || (ultimoAnterior !== undefined && l.fecha! > ultimoAnterior)),
  )
  const objetivo = objetivoRpe(sesion.sesion) ?? null
  const estado = estadoAtleta(historialMotor(d.sesiones), seguimientoMotor(d), hoy > sesion.fecha ? hoy : sesion.fecha)
  const veredicto = veredictoDe(estado.sesionesNoValidas.includes(sesionId), sesion, registro, objetivo)
  return {
    sesion,
    registro,
    largo: progresoLargo(d, sesion.fecha),
    esfuerzo: { rpe: registro.rpe, objetivo, valoracion: valorar(registro.rpe, objetivo), veredicto, sinSubida: estado.sinSubida },
    siguiente,
    logrosNuevos,
    conTest: sesion.sesion.tipo === 'evaluacion-dedos' ? (d.evaluaciones.find((e) => e.fecha === sesion.fecha)?.id ?? null) : null,
  }
}

// Primero el RPE frente al objetivo; luego lo que ha decidido el motor. «La carga sigue su curso» solo si la sesión
// cuenta para progresar y el motor no frena la subida.
export function textoEsfuerzo(e: ResumenRegistro['esfuerzo']): string {
  const rpe = `Esfuerzo ${e.rpe}/10`
  if (e.valoracion === 'sin-objetivo') return `${rpe}.`
  const descripcion = {
    previsto: `${rpe}: lo previsto (máximo ${e.objetivo}).`,
    'mas-duro': `${rpe}: más duro de lo previsto (máximo ${e.objetivo}).`,
    'mas-suave': `${rpe}: más suave de lo previsto.`,
  }[e.valoracion]
  const motor = {
    'por-encima':
      (e.valoracion === 'mas-duro' ? '' : 'Pero con los minutos que duró, la carga pasó de la prevista. ') +
      `Esta sesión no cuenta para subir la carga${e.sinSubida ? ' y el entrenador no la subirá en la próxima.' : '.'}`,
    incompleta: 'Quedó por debajo de los minutos previstos: no cuenta para subir la carga.',
    molestia: 'Con molestias en dedos o muñeca no cuenta para subir la carga.',
    cuenta: e.sinSubida
      ? 'Cuenta, pero de momento la carga no sube (por una molestia o por otra sesión por encima de lo previsto).'
      : 'La carga sigue su curso.',
  }[e.veredicto]
  return `${descripcion} ${motor}`
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

export { UMBRAL_IGUAL } from './progreso'

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
