// Lo que muestra «Mi semana»: los huecos declarados con lo que el motor planea en cada uno. Puro: no guarda nada.
import { esCargaAlta, FASES, semanaEnFecha, ZONAS, type Sesion } from '../../motor'
import { lunesDe, sumarDias } from '../fecha'
import { mensajeDe } from '../formulario'
import type { DatosAtleta, FilaHueco, FilaSesion } from './filas'
import { entradaDeHueco, sesionEnHueco } from './huecos'
import { prepararPropuesta, temporadaDe } from './peticion'

export type EstadoHueco =
  | { tipo: 'pasado'; sesion?: FilaSesion }
  | { tipo: 'ocupado'; sesion: FilaSesion; registrada: boolean }
  | { tipo: 'planeado'; sesion: Sesion; cargaAlta: boolean }
  | { tipo: 'libre'; descansoActivo: boolean } // descansoActivo: el plan lo deja libre y es en casa (DESCANSO_ACTIVO)
  | { tipo: 'sin-plan' }

export interface HuecoVista {
  fila: FilaHueco
  estado: EstadoHueco
}

export interface VistaSemana {
  lunes: string
  domingo: string
  fase: { nombre: string; descarga: boolean } | null
  huecos: HuecoVista[]
  aviso?: string
}

export const AVISO_ROJO = 'Tienes alguna zona en rojo: no hay plan de la semana, cada día se decide con el estado de ese día.'

const clave = (fecha: string, minutos: number): string => `${fecha}|${minutos}`

// Un hueco ya acabado (acabar justo ahora cuenta como pasado).
export function huecoPasado(f: FilaHueco, ahora: { fecha: string; minutos: number }): boolean {
  return f.fecha < ahora.fecha || (f.fecha === ahora.fecha && f.inicio_min + f.minutos <= ahora.minutos)
}

// La fase de la semana según el calendario, o null si los datos no dejan calcular la temporada (lo avisa el plan).
function faseCalendario(d: DatosAtleta, lunes: string): VistaSemana['fase'] {
  try {
    const s = semanaEnFecha(temporadaDe(d), lunes)
    return s ? { nombre: FASES[s.faseId].nombre, descarga: s.descarga } : null
  } catch {
    return null
  }
}

export function vistaSemana(d: DatosAtleta, lunes: string, ahora: { fecha: string; minutos: number }): VistaSemana {
  const domingo = sumarDias(lunes, 6)
  const filas = d.huecos
    .filter((h) => h.fecha >= lunes && h.fecha <= domingo)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.inicio_min - b.inicio_min)
  const registradas = new Set(d.registros.map((r) => r.sesion_id))
  const huecos: HuecoVista[] = filas.map((fila) => {
    const sesion = sesionEnHueco(d, fila)
    if (huecoPasado(fila, ahora)) return { fila, estado: sesion ? { tipo: 'pasado', sesion } : { tipo: 'pasado' } }
    if (sesion) return { fila, estado: { tipo: 'ocupado', sesion, registrada: registradas.has(sesion.id) } }
    return { fila, estado: { tipo: 'sin-plan' } }
  })
  let fase = faseCalendario(d, lunes)
  const pendientes = huecos.filter((h) => h.estado.tipo === 'sin-plan')
  const primero = pendientes[0]
  if (!primero) {
    return { lunes, domingo, fase, huecos, ...(filas.length > 0 ? { aviso: 'No te quedan huecos pendientes esta semana.' } : {}) }
  }
  let prep: ReturnType<typeof prepararPropuesta>
  try {
    prep = prepararPropuesta(d, entradaDeHueco(primero.fila))
  } catch (e) {
    return { lunes, domingo, fase, huecos, aviso: `No se ha podido calcular el plan de la semana: ${mensajeDe(e)}` }
  }
  if (prep.tipo !== 'propuesta') return { lunes, domingo, fase: null, huecos, aviso: prep.mensaje }
  const { propuesta } = prep
  fase = { nombre: prep.fase.nombre, descarga: prep.fase.descarga === true }
  const principal = propuesta.principal
  // Solo cuando es el plan quien deja libre el hueco (no un rojo, el estado o el descanso recomendado).
  const delPlan = propuesta.descanso?.regla === 'plan.semana-libre'
  primero.estado = principal
    ? { tipo: 'planeado', sesion: principal.sesion, cargaAlta: esCargaAlta(principal.sesion) }
    : { tipo: 'libre', descansoActivo: delPlan && primero.fila.lugar === 'casa' }
  if (!propuesta.semana) {
    const rojo = propuesta.estado ? ZONAS.some((z) => propuesta.estado!.zonas[z] === 'rojo') : false
    const aviso = rojo
      ? AVISO_ROJO
      : pendientes.length > 1
        ? 'El entrenador no ha planificado el resto de la semana: prepara cada hueco cuando llegue.'
        : undefined
    return { lunes, domingo, fase, huecos, ...(aviso ? { aviso } : {}) }
  }
  const plan = new Map(propuesta.semana.map((x) => [clave(x.hueco.fecha, Math.round(x.hueco.horaInicio * 60)), x.sesion]))
  for (const h of pendientes.slice(1)) {
    const k = clave(h.fila.fecha, h.fila.inicio_min)
    if (!plan.has(k)) continue
    const s = plan.get(k)!
    h.estado = s ? { tipo: 'planeado', sesion: s, cargaAlta: esCargaAlta(s) } : { tipo: 'libre', descansoActivo: h.fila.lugar === 'casa' }
  }
  return { lunes, domingo, fase, huecos }
}

// El próximo hueco pendiente de la semana actual y, si no queda ninguno, el primero de la siguiente (para la pantalla Hoy).
export function proximoHueco(d: DatosAtleta, ahora: { fecha: string; minutos: number }): HuecoVista | undefined {
  const pendiente = (h: HuecoVista): boolean => h.estado.tipo !== 'pasado' && h.estado.tipo !== 'ocupado'
  const lunes = lunesDe(ahora.fecha)
  return (
    vistaSemana(d, lunes, ahora).huecos.find(pendiente) ?? vistaSemana(d, sumarDias(lunes, 7), ahora).huecos.find(pendiente)
  )
}
