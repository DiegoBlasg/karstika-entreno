// Estado del cronómetro. Puro: el instante (Date.now()) lo pasa quien llama, y el tiempo sale siempre de restar
// instantes, nunca de sumar ticks, así no se desfasa aunque el navegador duerma la pestaña.
import { segundosDe, type Paso } from './pasos'

export interface EstadoReloj {
  indice: number
  enMarcha: boolean
  desdeMs: number | null
  acumuladoMs: number
  totalMs: number
  colgadoFalloS: number | null
  terminado: boolean
}

export const ESTADO_INICIAL: EstadoReloj = {
  indice: 0, enMarcha: false, desdeMs: null, acumuladoMs: 0, totalMs: 0, colgadoFalloS: null, terminado: false,
}

export function transcurridoMs(e: EstadoReloj, ahoraMs: number): number {
  return e.acumuladoMs + (e.enMarcha && e.desdeMs !== null ? Math.max(0, ahoraMs - e.desdeMs) : 0)
}

export function empezar(e: EstadoReloj, ahoraMs: number): EstadoReloj {
  if (e.terminado || e.enMarcha) return e
  return { ...e, enMarcha: true, desdeMs: ahoraMs }
}

export function pausar(e: EstadoReloj, ahoraMs: number): EstadoReloj {
  if (!e.enMarcha) return e
  return { ...e, enMarcha: false, desdeMs: null, acumuladoMs: transcurridoMs(e, ahoraMs) }
}

// Pasa al paso siguiente con `sobranteMs` ya corridos en él; al pasar del último, termina.
function avanzar(pasos: readonly Paso[], e: EstadoReloj, ahoraMs: number, usadoMs: number, sobranteMs: number): EstadoReloj {
  const indice = e.indice + 1
  const totalMs = e.totalMs + usadoMs
  if (indice >= pasos.length) return { ...e, indice: pasos.length, totalMs, acumuladoMs: 0, enMarcha: false, desdeMs: null, terminado: true }
  return { ...e, indice, totalMs, acumuladoMs: e.enMarcha ? 0 : sobranteMs, desdeMs: e.enMarcha ? ahoraMs - sobranteMs : null }
}

export function tick(pasos: readonly Paso[], e: EstadoReloj, ahoraMs: number): EstadoReloj {
  let r = e
  while (r.enMarcha && !r.terminado) {
    const paso = pasos[r.indice]
    const s = paso ? segundosDe(paso) : null
    if (s === null) return r
    const t = transcurridoMs(r, ahoraMs)
    if (t < s * 1000) return r
    r = avanzar(pasos, r, ahoraMs, s * 1000, t - s * 1000)
  }
  return r
}

export function siguiente(pasos: readonly Paso[], e: EstadoReloj, ahoraMs: number): EstadoReloj {
  if (e.terminado) return e
  return avanzar(pasos, e, ahoraMs, transcurridoMs(e, ahoraMs), 0)
}

export function atras(e: EstadoReloj, ahoraMs: number): EstadoReloj {
  if (e.terminado) return e
  const vivido = transcurridoMs(e, ahoraMs)
  return {
    ...e,
    indice: Math.max(0, e.indice - 1),
    totalMs: e.totalMs + vivido,
    acumuladoMs: 0,
    desdeMs: e.enMarcha ? ahoraMs : null,
  }
}

export function faseFallo(paso: { trabajoS: number; descansoS: number }, ms: number): { fase: 'colgado' | 'descanso'; restanteS: number; colgadoS: number } {
  const t = paso.trabajoS * 1000
  const ciclo = t + paso.descansoS * 1000
  const completos = Math.floor(ms / ciclo)
  const resto = ms - completos * ciclo
  const colgadoS = Math.floor((completos * t + Math.min(resto, t)) / 1000)
  if (resto < t) return { fase: 'colgado', restanteS: Math.ceil((t - resto) / 1000), colgadoS }
  return { fase: 'descanso', restanteS: Math.ceil((ciclo - resto) / 1000), colgadoS }
}

export function noPuedoMas(pasos: readonly Paso[], e: EstadoReloj, ahoraMs: number): EstadoReloj {
  const paso = pasos[e.indice]
  if (e.terminado || !paso || paso.tipo !== 'fallo') return e
  const { colgadoS } = faseFallo(paso, transcurridoMs(e, ahoraMs))
  return siguiente(pasos, { ...e, colgadoFalloS: colgadoS }, ahoraMs)
}

export function terminar(e: EstadoReloj, ahoraMs: number): EstadoReloj {
  if (e.terminado) return e
  return { ...e, totalMs: e.totalMs + transcurridoMs(e, ahoraMs), acumuladoMs: 0, enMarcha: false, desdeMs: null, terminado: true }
}

export function restanteS(pasos: readonly Paso[], e: EstadoReloj, ahoraMs: number): number | null {
  const paso = pasos[e.indice]
  const s = paso ? segundosDe(paso) : null
  if (s === null || e.terminado) return null
  return Math.max(0, Math.ceil((s * 1000 - transcurridoMs(e, ahoraMs)) / 1000))
}

export function minutosReales(e: EstadoReloj, ahoraMs: number): number {
  const total = e.totalMs + (e.terminado ? 0 : transcurridoMs(e, ahoraMs))
  return Math.max(1, Math.ceil(total / 60_000))
}

// Lo guardado en localStorage: se valida campo a campo y siempre vuelve en pausa (el tiempo con la página cerrada no
// cuenta).
export function leerGuardado(x: unknown, nPasos: number): EstadoReloj | null {
  if (typeof x !== 'object' || x === null) return null
  const o = x as Record<string, unknown>
  const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0
  if (!num(o.indice) || !Number.isInteger(o.indice) || o.indice > nPasos) return null
  if (!num(o.acumuladoMs) || !num(o.totalMs) || typeof o.terminado !== 'boolean') return null
  if (o.colgadoFalloS !== null && !num(o.colgadoFalloS)) return null
  return {
    indice: o.indice, enMarcha: false, desdeMs: null, acumuladoMs: o.acumuladoMs, totalMs: o.totalMs,
    colgadoFalloS: (o.colgadoFalloS as number | null) ?? null, terminado: o.terminado,
  }
}
