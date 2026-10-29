// Huecos de la semana: reglas al declararlos, cuándo los ocupa una sesión y cuáles se pasan al motor. Puro.
import { diaNumero, finHoras, inicioHoras, MAX_HUECOS_POR_DIA, VALORES, type Hueco } from '../../motor'
import { hhmmDeMinutos, lunesDe, sumarDias } from '../fecha'
import { MINUTOS_DISPONIBLES } from '../formulario'
import type { DatosAtleta, FilaHueco, FilaSesion } from './filas'
import { historialMotor } from './mapeo'
import type { EntradaPeticion } from './peticion'

// El motor admite 8 huecos por delante del que se prepara (P-67): con el preparado, 9 por semana.
export const MAX_HUECOS_SEMANA = VALORES['P-67'].maxHuecos + 1
export const MAX_HUECOS_DIA = MAX_HUECOS_POR_DIA

const absoluto = (fecha: string, minutos: number): number => diaNumero(fecha) * 1440 + minutos
const inicioAbs = (f: FilaHueco): number => absoluto(f.fecha, f.inicio_min)
const ordenHuecos = (a: FilaHueco, b: FilaHueco): number => a.fecha.localeCompare(b.fecha) || a.inicio_min - b.inicio_min

export function huecoMotor(f: FilaHueco): Hueco {
  return { fecha: f.fecha, horaInicio: f.inicio_min / 60, contexto: { compania: f.compania, lugar: f.lugar, minutosDisponibles: f.minutos } }
}

export function entradaDeHueco(f: FilaHueco): EntradaPeticion {
  return huecoMotor(f)
}

// Enlace a Entrenar con el hueco ya rellenado.
export function enlacePreparar(f: FilaHueco): string {
  const q = new URLSearchParams({ fecha: f.fecha, hora: hhmmDeMinutos(f.inicio_min), compania: f.compania, lugar: f.lugar, minutos: String(f.minutos) })
  return `/entrenar?${q.toString()}`
}

// La sesión guardada (aceptada o libre) que se solapa con el hueco, si la hay. Acabar justo cuando empieza no cuenta.
export function sesionEnHueco(d: DatosAtleta, f: FilaHueco): FilaSesion | undefined {
  const ini = inicioAbs(f)
  const fin = ini + f.minutos
  const s = historialMotor(d.sesiones).find((x) => Math.round(inicioHoras(x) * 60) < fin && ini < Math.round(finHoras(x) * 60))
  return s ? d.sesiones.find((x) => x.id === s.id) : undefined
}

// Los huecos que se pasan al motor con una petición: los de su semana que empiezan después de que acabe la sesión
// pedida y que no ocupa ninguna sesión. Sin huecos declarados en esa semana, undefined (el motor decide día a día).
// Una sesión improvisada fuera de los huecos puede dejar más de los que admite el motor: se quedan los primeros.
export function huecosPosteriores(d: DatosAtleta, e: EntradaPeticion): Hueco[] | undefined {
  const lunes = lunesDe(e.fecha)
  const domingo = sumarDias(lunes, 6)
  const deLaSemana = d.huecos.filter((h) => h.fecha >= lunes && h.fecha <= domingo)
  if (deLaSemana.length === 0) return undefined
  const finPedida = absoluto(e.fecha, Math.round(e.horaInicio * 60)) + e.contexto.minutosDisponibles
  const libres = deLaSemana.filter((h) => inicioAbs(h) >= finPedida && !sesionEnHueco(d, h)).sort(ordenHuecos)
  const elegidos: FilaHueco[] = []
  for (const h of libres) {
    if (elegidos.length >= MAX_HUECOS_SEMANA - 1) break
    const mismoDia = elegidos.filter((x) => x.fecha === h.fecha).length + (h.fecha === e.fecha ? 1 : 0)
    if (mismoDia < MAX_HUECOS_DIA) elegidos.push(h)
  }
  return elegidos.map(huecoMotor)
}

// Reglas al declarar un hueco. Lanza con un mensaje listo para mostrar.
export function validarHuecoNuevo(d: DatosAtleta, f: FilaHueco, ahora: { fecha: string; minutos: number }): void {
  if (f.fecha < ahora.fecha) throw new Error('No puedes añadir huecos en días pasados.')
  if (f.fecha === ahora.fecha && f.inicio_min + f.minutos <= ahora.minutos) throw new Error('Ese hueco ya ha pasado.')
  if (f.fecha > sumarDias(lunesDe(ahora.fecha), 13)) throw new Error('Solo puedes declarar huecos de esta semana y de la siguiente.')
  if (!Number.isInteger(f.inicio_min) || f.inicio_min < 0 || f.inicio_min > 1439) throw new Error('La hora no es válida.')
  if (!Number.isInteger(f.minutos) || f.minutos < MINUTOS_DISPONIBLES.min || f.minutos > MINUTOS_DISPONIBLES.max) {
    throw new Error(`Minutos disponibles: entre ${MINUTOS_DISPONIBLES.min} y ${MINUTOS_DISPONIBLES.max}.`)
  }
  if (f.inicio_min + f.minutos > 1440) throw new Error('El hueco no puede pasar de la medianoche.')
  const lunes = lunesDe(f.fecha)
  const domingo = sumarDias(lunes, 6)
  if (d.huecos.filter((h) => h.fecha >= lunes && h.fecha <= domingo).length >= MAX_HUECOS_SEMANA) {
    throw new Error(`Como mucho ${MAX_HUECOS_SEMANA} huecos por semana.`)
  }
  const delDia = d.huecos.filter((h) => h.fecha === f.fecha)
  if (delDia.length >= MAX_HUECOS_DIA) throw new Error(`Como mucho ${MAX_HUECOS_DIA} huecos por día.`)
  if (delDia.some((h) => h.inicio_min < f.inicio_min + f.minutos && f.inicio_min < h.inicio_min + h.minutos)) {
    throw new Error('Se solapa con otro hueco de ese día.')
  }
}
