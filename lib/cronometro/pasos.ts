// Convierte el plan de una sesión en la lista de pasos que guía el cronómetro. Puro.
import type { Ejercicio, SesionPlan } from '../../motor'

export type Paso = (
  | { tipo: 'preparate'; segundos: number; titulo: string; carga?: string }
  | { tipo: 'colgado'; segundos: number; titulo: string; carga?: string; intento?: { n: number; de: number } }
  | { tipo: 'descanso'; segundos: number; titulo: string }
  | { tipo: 'manual'; titulo: string; carga?: string; notas?: string }
  | { tipo: 'bloque'; segundos: number; titulo: string; detalle: string[] }
  | { tipo: 'fallo'; trabajoS: number; descansoS: number; titulo: string; carga?: string; maxRepeticiones?: number; escalando?: boolean }
) & { bloque: string; fichas?: string[] }   // fichas: ids de la biblioteca («Cómo se hace»)

export const SEGUNDOS_PREPARATE = 10

const conTiempo = (e: Ejercicio): boolean => e.trabajoS !== undefined || e.series !== undefined
const detalleDe = (e: Ejercicio): string => [e.nombre, e.cargaTexto, e.notas].filter(Boolean).join(' · ')

// Un `fallo` sin máximo dura lo que aguantes (null); con máximo, como mucho esas repeticiones (sin el último descanso).
export function segundosDe(p: Paso): number | null {
  if (p.tipo === 'manual') return null
  if (p.tipo === 'fallo') return p.maxRepeticiones ? p.maxRepeticiones * (p.trabajoS + p.descansoS) - p.descansoS : null
  return p.segundos
}

// Las fichas de unos ejercicios, sin repetir y en orden; sin ninguna, el paso no lleva el campo.
const conFichas = <P extends Paso>(p: P, ejercicios: readonly Ejercicio[]): P => {
  const fichas = [...new Set(ejercicios.flatMap((e) => (e.ficha ? [e.ficha] : [])))]
  return fichas.length > 0 ? { ...p, fichas } : p
}

export function pasosDeSesion(plan: SesionPlan): Paso[] {
  const out: Paso[] = []
  for (const b of plan.bloques) {
    if (!b.ejercicios.some(conTiempo)) {
      out.push(conFichas({ tipo: 'bloque', bloque: b.nombre, segundos: b.minutos * 60, titulo: b.nombre, detalle: b.ejercicios.map(detalleDe) }, b.ejercicios))
      continue
    }
    for (const e of b.ejercicios) out.push(...pasosDeEjercicio(b.nombre, e).map((p) => conFichas(p, [e])))
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
    // Con repeticiones son vueltas de un circuito (4x4); sin ellas, series de un ejercicio (con su nombre).
    for (let s = 1; s <= series; s++) {
      out.push(manual(repeticiones !== undefined ? `Vuelta ${s} de ${series}` : `${e.nombre} · serie ${s} de ${series}`))
      entreSeries(s)
    }
    return out
  }
  out.push(preparate)
  if (e.hastaFallo && repeticiones !== undefined && descansoS !== undefined) {
    // Cada serie hasta el fallo, como mucho `repeticiones` (avanza sola al llegar o con «No puedo más»).
    for (let s = 1; s <= series; s++) {
      const titulo = e.escalando ? e.nombre : `Serie ${s} de ${series} · hasta ${repeticiones} repeticiones`
      out.push({ tipo: 'fallo', bloque, trabajoS, descansoS, maxRepeticiones: repeticiones, titulo, carga, ...(e.escalando ? { escalando: true } : {}) })
      entreSeries(s)
    }
    return out
  }
  for (let s = 1; s <= series; s++) {
    if (repeticiones !== undefined) {
      for (let r = 1; r <= repeticiones; r++) {
        out.push({ tipo: 'colgado', bloque, segundos: trabajoS, titulo: `Serie ${s} de ${series} · rep ${r} de ${repeticiones}`, carga })
        if (r < repeticiones && descansoS !== undefined) out.push({ tipo: 'descanso', bloque, segundos: descansoS, titulo: 'Descanso' })
      }
    } else {
      out.push({ tipo: 'colgado', bloque, segundos: trabajoS, titulo: `Intento ${s} de ${series}`, carga, intento: { n: s, de: series } })
    }
    entreSeries(s)
  }
  return out
}
