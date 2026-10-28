// Test de dedos guiado: intentos de fuerza máxima, carga del 7:3 y lo guardado al recargar. Puro.
import { lastreRepeaters, VALORES } from '../../motor'
import type { Paso } from './pasos'

export interface Intento {
  lastreKg: number            // negativo = descarga
  completado: boolean         // aguantó los 10 s
}

export interface DatosTest {
  pesoKg: number
  intentos: (Intento | null)[] // intentos[n - 1]; null = sin apuntar
}

const PESO = { min: 30, max: 200 } as const       // los mismos rangos que guardarEvaluacion
const LASTRE = { min: -100, max: 150 } as const

export function mejorLastre(intentos: readonly (Intento | null)[]): number | null {
  const completados = intentos.filter((i): i is Intento => i !== null && i.completado).map((i) => i.lastreKg)
  return completados.length > 0 ? Math.max(...completados) : null
}

// La carga del 7:3 al 60 % del mejor intento de hoy, con la misma fórmula del motor que los repeaters (P-24).
export function lastre73(fecha: string, pesoKg: number, mejor: number): number | null {
  try {
    const kg = lastreRepeaters({ fecha, pesoCorporalKg: pesoKg, lastreKg: mejor }, VALORES['P-24'].fraccion)
    return Number.isFinite(kg) ? kg : null
  } catch {
    return null
  }
}

const fmt = (kg: number): string => String(kg).replace('.', ',')

export function textoLastre(kg: number): string {
  if (kg > 0) return `+${fmt(kg)} kg de lastre`
  if (kg < 0) return `descarga de ${fmt(-kg)} kg`
  return 'sin lastre ni descarga'
}

// El intento cuyo formulario se muestra en el paso `indice`: el último intento ya hecho, hasta que empiece otro
// colgado o el fallo.
export function intentoAbierto(pasos: readonly Paso[], indice: number): { n: number; de: number } | null {
  const actual = pasos[indice]
  if (actual?.tipo === 'colgado' || actual?.tipo === 'fallo') return null
  for (let k = Math.min(indice, pasos.length) - 1; k >= 0; k--) {
    const p = pasos[k]!
    if (p.tipo === 'colgado') return p.intento ?? null
    if (p.tipo === 'fallo') return null
  }
  return null
}

export function leerDatosTest(x: unknown, nIntentos: number): DatosTest | null {
  if (typeof x !== 'object' || x === null) return null
  const o = x as Record<string, unknown>
  const enRango = (v: unknown, r: { min: number; max: number }): v is number =>
    typeof v === 'number' && Number.isFinite(v) && v >= r.min && v <= r.max
  if (!enRango(o.pesoKg, PESO) || !Array.isArray(o.intentos) || o.intentos.length > nIntentos) return null
  const intentos: (Intento | null)[] = []
  for (const i of o.intentos as unknown[]) {
    if (i === null) {
      intentos.push(null)
      continue
    }
    if (typeof i !== 'object') return null
    const { lastreKg, completado } = i as Record<string, unknown>
    if (!enRango(lastreKg, LASTRE) || typeof completado !== 'boolean') return null
    intentos.push({ lastreKg, completado })
  }
  return { pesoKg: o.pesoKg, intentos }
}
