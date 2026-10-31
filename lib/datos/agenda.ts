// «Semana»: 7 días con sus sesiones y si se puede generar entreno; franja mañana/tarde y valores iniciales. Puro.
import { FASES, semanaEnFecha, type Compania, type Lugar } from '../../motor'
import { sumarDias } from '../fecha'
import type { DatosAtleta } from './filas'
import { tarjetasDe, type Tarjeta } from './hoy'
import { temporadaDe } from './peticion'

// Sin hora exacta: mañana o tarde. Por dentro, 9:00 y 18:00 (las sesiones antiguas con hora caen en una de las dos).
export type Franja = 'manana' | 'tarde'
export const HORA_FRANJA: Record<Franja, number> = { manana: 9, tarde: 18 }
export const franja = (horaInicio: number): Franja => (horaInicio < 14 ? 'manana' : 'tarde')

export interface InicialGenerar {
  compania: Compania
  lugar: Lugar
  minutos: number
  franja: Franja
}
const POR_DEFECTO: InicialGenerar = { compania: 'solo', lugar: 'rocodromo', minutos: 90, franja: 'tarde' }
const diaSemana = (fecha: string): number => new Date(`${fecha}T12:00:00Z`).getUTCDay()

// Lo de la última sesión generada (con contexto guardado) del mismo día de la semana; si no hay, lo de por defecto.
export function inicialGenerar(d: DatosAtleta, fecha: string): InicialGenerar {
  const ultima = d.sesiones
    .filter((s) => s.propuesta?.contexto && diaSemana(s.fecha) === diaSemana(fecha))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .at(-1)
  const c = ultima?.propuesta?.contexto
  return ultima && c
    ? { compania: c.compania, lugar: c.lugar, minutos: c.minutosDisponibles, franja: franja(ultima.sesion.horaInicio) }
    : { ...POR_DEFECTO }
}

export interface DiaAgenda {
  fecha: string
  tarjetas: Tarjeta[]   // por hora: primero la de la mañana
  generable: boolean    // desde hoy y dentro de la temporada
  inicial: InicialGenerar
}

export interface VistaAgenda {
  lunes: string
  domingo: string
  fase: { nombre: string; descarga: boolean } | null
  dias: DiaAgenda[]
}

export function vistaAgenda(d: DatosAtleta, lunes: string, hoy: string): VistaAgenda {
  let fase: VistaAgenda['fase'] = null
  try {
    const s = semanaEnFecha(temporadaDe(d), lunes)
    fase = s ? { nombre: FASES[s.faseId].nombre, descarga: s.descarga } : null
  } catch {
    fase = null
  }
  const todas = tarjetasDe(d, hoy)
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)).map((fecha) => ({
    fecha,
    tarjetas: todas.filter((t) => t.fila.fecha === fecha).sort((a, b) => a.fila.sesion.horaInicio - b.fila.sesion.horaInicio),
    generable: fecha >= hoy && fecha >= d.perfil.inicio_temporada && fecha <= d.perfil.objetivo_temporada,
    inicial: inicialGenerar(d, fecha),
  }))
  return { lunes, domingo: sumarDias(lunes, 6), fase, dias }
}
