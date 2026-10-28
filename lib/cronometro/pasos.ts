// Convierte el plan de una sesión en la lista de pasos que guía el cronómetro. Puro.
import type { Ejercicio, SesionPlan } from '../../motor'

export type Paso = (
  | { tipo: 'preparate'; segundos: number; titulo: string; carga?: string }
  | { tipo: 'colgado'; segundos: number; titulo: string; carga?: string }
  | { tipo: 'descanso'; segundos: number; titulo: string }
  | { tipo: 'manual'; titulo: string; carga?: string; notas?: string }
  | { tipo: 'bloque'; segundos: number; titulo: string; detalle: string[] }
  | { tipo: 'fallo'; trabajoS: number; descansoS: number; titulo: string; carga?: string }
) & { bloque: string }

export const SEGUNDOS_PREPARATE = 10

const conTiempo = (e: Ejercicio): boolean => e.trabajoS !== undefined || e.series !== undefined
const detalleDe = (e: Ejercicio): string => [e.nombre, e.cargaTexto, e.notas].filter(Boolean).join(' · ')

export function segundosDe(p: Paso): number | null {
  return p.tipo === 'manual' || p.tipo === 'fallo' ? null : p.segundos
}

export function pasosDeSesion(plan: SesionPlan): Paso[] {
  const out: Paso[] = []
  for (const b of plan.bloques) {
    if (!b.ejercicios.some(conTiempo)) {
      out.push({ tipo: 'bloque', bloque: b.nombre, segundos: b.minutos * 60, titulo: b.nombre, detalle: b.ejercicios.map(detalleDe) })
      continue
    }
    for (const e of b.ejercicios) out.push(...pasosDeEjercicio(b.nombre, e))
  }
  return out
}

function pasosDeEjercicio(bloque: string, e: Ejercicio): Paso[] {
  const { series, repeticiones, trabajoS, descansoS, descansoSeriesS } = e
  const carga = e.cargaTexto
  const manual = (titulo: string): Paso => ({ tipo: 'manual', bloque, titulo, carga, ...(e.notas ? { notas: e.notas } : {}) })
  if (series === undefined && trabajoS === undefined) return [manual(e.nombre)]
  const preparate: Paso = { tipo: 'preparate', bloque, segundos: SEGUNDOS_PREPARATE, titulo: e.nombre, carga }
  if (series === undefined) {
    // Sin series: hasta el fallo si hay descanso entre repeticiones (7:3 del test), si no una sola suspensión.
    if (descansoS !== undefined) return [preparate, { tipo: 'fallo', bloque, trabajoS: trabajoS!, descansoS, titulo: e.nombre, carga }]
    return [preparate, { tipo: 'colgado', bloque, segundos: trabajoS!, titulo: e.nombre, carga }]
  }
  const out: Paso[] = []
  const entreSeries = (s: number): void => {
    if (s < series && descansoSeriesS !== undefined) out.push({ tipo: 'descanso', bloque, segundos: descansoSeriesS, titulo: 'Descanso entre series' })
  }
  if (trabajoS === undefined) {
    // Series sin tiempo de trabajo (4×4): cada vuelta dura lo que se tarde; se pasa con «Hecho».
    for (let s = 1; s <= series; s++) {
      out.push(manual(`Vuelta ${s} de ${series}`))
      entreSeries(s)
    }
    return out
  }
  out.push(preparate)
  for (let s = 1; s <= series; s++) {
    if (repeticiones !== undefined) {
      for (let r = 1; r <= repeticiones; r++) {
        out.push({ tipo: 'colgado', bloque, segundos: trabajoS, titulo: `Serie ${s} de ${series} · rep ${r} de ${repeticiones}`, carga })
        if (r < repeticiones && descansoS !== undefined) out.push({ tipo: 'descanso', bloque, segundos: descansoS, titulo: 'Descanso' })
      }
    } else {
      out.push({ tipo: 'colgado', bloque, segundos: trabajoS, titulo: `Intento ${s} de ${series}`, carga })
    }
    entreSeries(s)
  }
  return out
}
