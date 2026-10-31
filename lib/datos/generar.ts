// Generar un entreno: qué opción se guarda, la «otra opción» y el choque de franja. Puro.
import { NOMBRE_TIPO, type Explicacion, type SesionPlan, type TipoSesion } from '../../motor'
import { franja, type Franja } from './agenda'
import type { DatosAtleta } from './filas'
import type { Preparacion } from './peticion'

export type ResultadoGenerar =
  | { tipo: 'sesion'; plan: SesionPlan }
  | { tipo: 'descanso'; motivo: Explicacion; alternativas: SesionPlan[] }
  | { tipo: 'error'; mensaje: string }

type ConPropuesta = Extract<Preparacion, { tipo: 'propuesta' }>
const opciones = (prep: ConPropuesta): SesionPlan[] =>
  [prep.propuesta.principal, ...prep.propuesta.alternativas].filter((o): o is SesionPlan => o !== null)

// Sin `tipo`, la principal (o el descanso con sus alternativas); con `tipo`, la opción de ese tipo.
export function elegirGenerado(prep: Preparacion, tipo?: TipoSesion): ResultadoGenerar {
  if (prep.tipo !== 'propuesta') return { tipo: 'error', mensaje: prep.mensaje }
  if (tipo) {
    const plan = opciones(prep).find((o) => o.sesion.tipo === tipo)
    return plan ? { tipo: 'sesion', plan } : { tipo: 'error', mensaje: `${NOMBRE_TIPO[tipo]} ya no es posible ese día: vuelve a generar.` }
  }
  const { principal, alternativas, descanso } = prep.propuesta
  if (principal) return { tipo: 'sesion', plan: principal }
  if (descanso) return { tipo: 'descanso', motivo: descanso, alternativas }
  return { tipo: 'error', mensaje: 'El entrenador no encuentra ninguna sesión posible con este contexto.' }
}

// La siguiente opción de la lista tras el tipo actual (principal → alternativa 1 → alternativa 2 → principal…).
export function otraOpcion(prep: Preparacion, actual: TipoSesion): SesionPlan | null {
  if (prep.tipo !== 'propuesta') return null
  const lista = opciones(prep)
  const i = lista.findIndex((o) => o.sesion.tipo === actual)
  for (let k = 1; k <= lista.length; k++) {
    const o = lista[(i + k + lista.length) % lista.length]!
    if (o.sesion.tipo !== actual) return o
  }
  return null
}

const NOMBRE_FRANJA: Record<Franja, string> = { manana: 'por la mañana', tarde: 'por la tarde' }

// Una sesión por franja y día: con otra ya en esa franja, el mensaje para mostrar (`sinId`: la que se va a sustituir).
export function conflictoFranja(d: DatosAtleta, fecha: string, f: Franja, sinId?: string): string | null {
  const choca = d.sesiones.some((s) => s.fecha === fecha && s.id !== sinId && s.sesion.tipo !== 'descanso' && franja(s.sesion.horaInicio) === f)
  return choca ? `Ya tienes una sesión ese día ${NOMBRE_FRANJA[f]}.` : null
}
