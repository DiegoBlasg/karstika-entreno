// Lectura y validación de campos de formulario. Los errores llevan un mensaje en español listo para mostrar.
import { ZONAS, type Agarre, type Compania, type Contexto, type Lugar, type Molestia, type MotivoCaida } from '../motor'
import type { EntradaPeticion } from './datos/peticion'
import { AGARRES, MOTIVOS_CAIDA, NOMBRE_ZONA } from './nombres'

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

// 'AAAA-MM-DD' de un día que existe.
export function esFechaValida(v: string): boolean {
  const d = new Date(`${v}T00:00:00Z`)
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

export function fecha(fd: FormData, nombre: string, etiqueta: string): string {
  const v = texto(fd, nombre, etiqueta)
  if (!esFechaValida(v)) throw new ErrorFormulario(`${etiqueta}: fecha no válida.`)
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

export function opcionOpcional<T extends string>(fd: FormData, nombre: string, etiqueta: string, valores: readonly T[]): T | null {
  return textoOpcional(fd, nombre) === null ? null : opcion(fd, nombre, etiqueta, valores)
}

export const COMPANIAS = ['solo', 'con-gente'] as const satisfies readonly Compania[]
export const LUGARES = ['rocodromo', 'roca', 'casa'] as const satisfies readonly Lugar[]
export const MINUTOS_DISPONIBLES = { min: 10, max: 600 } as const

export function contexto(fd: FormData): Contexto {
  return {
    compania: opcion(fd, 'compania', 'Compañía', COMPANIAS),
    lugar: opcion(fd, 'lugar', 'Lugar', LUGARES),
    minutosDisponibles: entero(fd, 'minutos', 'Minutos disponibles', MINUTOS_DISPONIBLES.min, MINUTOS_DISPONIBLES.max),
  }
}

// La petición que viaja oculta en el formulario de aceptar (JSON.parse ya hecho): se comprueba con las mismas reglas
// que el formulario de Entrenar antes de pasarla al motor.
export function leerEntradaPeticion(valor: unknown): EntradaPeticion {
  const objeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
  if (!objeto(valor)) throw new ErrorFormulario('La petición: no es válida.')
  const { fecha: f, horaInicio, contexto: c } = valor
  if (typeof f !== 'string' || !esFechaValida(f)) throw new ErrorFormulario('El día: fecha no válida.')
  if (typeof horaInicio !== 'number' || !Number.isFinite(horaInicio) || horaInicio < 0 || horaInicio >= 24) {
    throw new ErrorFormulario('La hora: hora no válida.')
  }
  if (!objeto(c)) throw new ErrorFormulario('El contexto: no es válido.')
  const { compania, lugar, minutosDisponibles: m } = c
  if (typeof compania !== 'string' || !(COMPANIAS as readonly string[]).includes(compania)) {
    throw new ErrorFormulario('Compañía: opción no válida.')
  }
  if (typeof lugar !== 'string' || !(LUGARES as readonly string[]).includes(lugar)) throw new ErrorFormulario('Lugar: opción no válida.')
  if (typeof m !== 'number' || !Number.isInteger(m) || m < MINUTOS_DISPONIBLES.min || m > MINUTOS_DISPONIBLES.max) {
    throw new ErrorFormulario(`Minutos disponibles: debe ser un número entero entre ${MINUTOS_DISPONIBLES.min} y ${MINUTOS_DISPONIBLES.max}.`)
  }
  return { fecha: f, horaInicio, contexto: { compania: compania as Compania, lugar: lugar as Lugar, minutosDisponibles: m } }
}

// Canto (regleta_mm, opcional) y agarre (opcional) de una sesión colgado de la regleta.
export const REGLETA_MM = { min: 1, max: 100 } as const

export function detalleRegleta(fd: FormData): { regletaMm?: number; agarre?: Agarre } {
  const regletaMm = numeroOpcional(fd, 'regleta_mm', 'La regleta', REGLETA_MM.min, REGLETA_MM.max)
  const agarre = opcionOpcional(fd, 'agarre', 'El agarre', AGARRES)
  return { ...(regletaMm !== null ? { regletaMm } : {}), ...(agarre !== null ? { agarre } : {}) }
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
