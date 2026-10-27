// Lectura y validación de campos de formulario. Los errores llevan un mensaje en español listo para mostrar.
import { ZONAS, type Contexto, type Molestia, type MotivoCaida } from '../motor'
import { MOTIVOS_CAIDA, NOMBRE_ZONA } from './nombres'

export class ErrorFormulario extends Error {}

export function textoOpcional(fd: FormData, nombre: string): string | null {
  const v = fd.get(nombre)
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
}

export function texto(fd: FormData, nombre: string, etiqueta: string): string {
  const v = textoOpcional(fd, nombre)
  if (v === null) throw new ErrorFormulario(`${etiqueta}: falta el dato.`)
  return v
}

export function numero(fd: FormData, nombre: string, etiqueta: string, min: number, max: number): number {
  const n = Number(texto(fd, nombre, etiqueta).replace(',', '.'))
  if (!Number.isFinite(n) || n < min || n > max) throw new ErrorFormulario(`${etiqueta}: debe ser un número entre ${min} y ${max}.`)
  return n
}

export function numeroOpcional(fd: FormData, nombre: string, etiqueta: string, min: number, max: number): number | null {
  return textoOpcional(fd, nombre) === null ? null : numero(fd, nombre, etiqueta, min, max)
}

export function entero(fd: FormData, nombre: string, etiqueta: string, min: number, max: number): number {
  const n = numero(fd, nombre, etiqueta, min, max)
  if (!Number.isInteger(n)) throw new ErrorFormulario(`${etiqueta}: debe ser un número entero.`)
  return n
}

export function fecha(fd: FormData, nombre: string, etiqueta: string): string {
  const v = texto(fd, nombre, etiqueta)
  const d = new Date(`${v}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) {
    throw new ErrorFormulario(`${etiqueta}: fecha no válida.`)
  }
  return v
}

export function hora(fd: FormData, nombre: string, etiqueta: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(texto(fd, nombre, etiqueta))
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) throw new ErrorFormulario(`${etiqueta}: hora no válida.`)
  return Number(m[1]) + Number(m[2]) / 60
}

export function opcion<T extends string>(fd: FormData, nombre: string, etiqueta: string, valores: readonly T[]): T {
  const v = texto(fd, nombre, etiqueta)
  if (!(valores as readonly string[]).includes(v)) throw new ErrorFormulario(`${etiqueta}: opción no válida.`)
  return v as T
}

export function contexto(fd: FormData): Contexto {
  return {
    compania: opcion(fd, 'compania', 'Compañía', ['solo', 'con-gente']),
    lugar: opcion(fd, 'lugar', 'Lugar', ['rocodromo', 'roca', 'casa']),
    minutosDisponibles: entero(fd, 'minutos', 'Minutos disponibles', 10, 600),
  }
}

// Campos dolor_<zona> (0-10) y alarma_<zona> (casilla). Solo se devuelven las zonas con dolor o alarma.
export function molestias(fd: FormData): Molestia[] {
  const out: Molestia[] = []
  for (const zona of ZONAS) {
    const dolor = entero(fd, `dolor_${zona}`, `Dolor en ${NOMBRE_ZONA[zona]}`, 0, 10)
    const alarma = fd.get(`alarma_${zona}`) === 'on'
    if (dolor > 0 || alarma) out.push({ zona, dolor, ...(alarma ? { alarma: true } : {}) })
  }
  return out
}

export const MAX_INTENTOS = 6

// Campos intento_0 … intento_5: '' (no hubo), 'encadenado' o un motivo de caída.
export function intentos(fd: FormData): { encadenado: boolean; motivoCaida?: MotivoCaida }[] {
  const out: { encadenado: boolean; motivoCaida?: MotivoCaida }[] = []
  for (let i = 0; i < MAX_INTENTOS; i++) {
    const v = textoOpcional(fd, `intento_${i}`)
    if (v === null) continue
    if (v === 'encadenado') out.push({ encadenado: true })
    else out.push({ encadenado: false, motivoCaida: opcion(fd, `intento_${i}`, `Intento ${i + 1}`, MOTIVOS_CAIDA) })
  }
  return out
}

export function mensajeDe(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
