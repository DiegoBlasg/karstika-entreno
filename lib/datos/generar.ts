// Generar un entreno: qué opción se guarda, la «otra opción» y el choque de franja. Puro.
import { NOMBRE_TIPO, type Explicacion, type SesionPlan, type TipoSesion } from '../../motor'
import { franja, HORA_FRANJA, type Franja } from './agenda'
import type { DatosAtleta } from './filas'
import type { Preparacion } from './peticion'

export type ResultadoGenerar =
  | { tipo: 'sesion'; plan: SesionPlan }
  | { tipo: 'descanso'; motivo: Explicacion; alternativas: SesionPlan[]; rojo: boolean }
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
  const rojo = prep.propuesta.estado ? Object.values(prep.propuesta.estado.zonas).includes('rojo') : false
  if (descanso) return { tipo: 'descanso', motivo: descanso, alternativas, rojo }
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

// Una sesión por franja y día, y que no se pise con otra (las antiguas tienen hora exacta y duración): el mensaje para
// mostrar, o null (`sinId`: la que se va a sustituir).
export function conflictoFranja(d: DatosAtleta, fecha: string, f: Franja, minutos: number, sinId?: string): string | null {
  const delDia = d.sesiones.filter((s) => s.fecha === fecha && s.id !== sinId && s.sesion.tipo !== 'descanso')
  if (delDia.some((s) => franja(s.sesion.horaInicio) === f)) return `Ya tienes una sesión ese día ${NOMBRE_FRANJA[f]}.`
  const ini = HORA_FRANJA[f] * 60
  const fin = ini + minutos
  const pisa = delDia.find((s) => Math.round(s.sesion.horaInicio * 60) < fin && ini < Math.round(s.sesion.horaInicio * 60) + s.sesion.duracionMin)
  return pisa ? `Choca con tu sesión de ese día ${NOMBRE_FRANJA[franja(pisa.sesion.horaInicio)]}: prueba con menos minutos.` : null
}
