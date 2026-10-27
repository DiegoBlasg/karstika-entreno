// Cómo quedan los datos tras cada acción, antes de escribirla: se validan con validarDatos y solo entonces se
// guardan. Puro.
import type { Agarre, Intensidad, Sesion, SesionPlan, TipoSesion } from '../../motor'
import type { DatosAtleta, FilaAlta, FilaChequeo, FilaEvaluacion, FilaIntento, FilaRegistro, FilaSesion } from './filas'

// El motor devuelve ids reservados («propuesta-…»); al aceptar, la sesión recibe su id propio.
export function filaSesionAceptada(plan: SesionPlan, id: string): FilaSesion {
  const sesion: Sesion = { ...plan.sesion, id }
  return { id, fecha: sesion.fecha, sesion, propuesta: { ...plan, sesion }, origen: 'propuesta' }
}

export interface DatosLibre {
  id: string
  tipo: TipoSesion
  intensidad: Intensidad
  fecha: string
  horaInicio: number
  duracionMin: number
  detalle?: { regletaMm?: number; agarre?: Agarre }
}

// El detalle solo se guarda si trae algo (un objeto vacío no aporta nada al motor).
export function filaSesionLibre(l: DatosLibre): FilaSesion {
  const sesion: Sesion = { id: l.id, tipo: l.tipo, intensidad: l.intensidad, fecha: l.fecha, horaInicio: l.horaInicio, duracionMin: l.duracionMin }
  if (l.detalle && Object.keys(l.detalle).length > 0) sesion.detalle = { ...l.detalle }
  return { id: l.id, fecha: l.fecha, sesion, propuesta: null, origen: 'libre' }
}

export function conChequeo(d: DatosAtleta, c: FilaChequeo): DatosAtleta {
  return { ...d, chequeos: [...d.chequeos.filter((x) => x.fecha !== c.fecha), c].sort((a, b) => a.fecha.localeCompare(b.fecha)) }
}

export function conSesion(d: DatosAtleta, f: FilaSesion): DatosAtleta {
  if (d.sesiones.some((s) => s.id === f.id)) throw new Error(`La sesión ${f.id} ya existe`)
  return { ...d, sesiones: [...d.sesiones, f] }
}

export function sinSesion(d: DatosAtleta, id: string): DatosAtleta {
  return {
    ...d,
    sesiones: d.sesiones.filter((s) => s.id !== id),
    registros: d.registros.filter((r) => r.sesion_id !== id),
    intentos: d.intentos.filter((i) => i.sesion_id !== id),
  }
}

export function conRegistro(d: DatosAtleta, r: FilaRegistro, intentos: FilaIntento[]): DatosAtleta {
  if (!d.sesiones.some((s) => s.id === r.sesion_id)) throw new Error('Esa sesión ya no existe.')
  if (d.registros.some((x) => x.sesion_id === r.sesion_id)) throw new Error('Esa sesión ya está registrada.')
  return { ...d, registros: [...d.registros, r], intentos: [...d.intentos, ...intentos] }
}

// Corrige un registro ya guardado: sustituye el registro (conservando cuándo se apuntó) y todos los intentos de esa
// sesión.
export function conRegistroCorregido(d: DatosAtleta, r: FilaRegistro, intentos: FilaIntento[]): DatosAtleta {
  const previo = d.registros.find((x) => x.sesion_id === r.sesion_id)
  if (!previo) throw new Error('Esa sesión no está registrada.')
  if (intentos.some((i) => i.sesion_id !== r.sesion_id)) throw new Error('Los intentos tienen que ser de la misma sesión.')
  return {
    ...d,
    registros: d.registros.map((x) => (x.sesion_id === r.sesion_id ? { ...r, registrado_en: previo.registrado_en } : x)),
    intentos: [...d.intentos.filter((i) => i.sesion_id !== r.sesion_id), ...intentos],
  }
}

export function conEvaluacion(d: DatosAtleta, e: FilaEvaluacion): DatosAtleta {
  return { ...d, evaluaciones: [...d.evaluaciones, e].sort((a, b) => a.fecha.localeCompare(b.fecha)) }
}

export function conAlta(d: DatosAtleta, a: FilaAlta): DatosAtleta {
  return { ...d, altas: [...d.altas, a] }
}
