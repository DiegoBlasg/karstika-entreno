// Progreso real del atleta: constancia por semanas, escalada y logros (derivados, sin tabla propia). Puro.
import type { MotivoCaida, SemanaPlan } from '../../motor'
import { lunesDe, sumarDias } from '../fecha'
import type { DatosAtleta } from './filas'
import { temporadaDe } from './peticion'
import { vistaVia } from './via'

export type EstadoSemana = 'cumplida' | 'no-cumplida' | 'neutra' | 'actual'
export interface SemanaCumplida { lunes: string; estado: EstadoSemana; descarga: boolean }
export interface Constancia {
  semanas: SemanaCumplida[]   // desde el inicio de la temporada hasta la semana actual (incluida, como 'actual')
  cumplidas: number
  conSesiones: number         // semanas pasadas con alguna sesión (cumplidas + no cumplidas)
  rachaActual: number         // cumplidas seguidas que terminan en la última semana pasada; las neutras ni suman ni cortan
  mejorRacha: number
}

export interface ResumenEscalada {
  gradoActual: string
  gradoObjetivo: string
  encadenes: number                  // intentos encadenados hasta hoy
  ultimaCaida: MotivoCaida | null    // motivo del último intento no encadenado con motivo, hasta hoy
}

export interface Logro { id: string; titulo: string; descripcion: string; conseguido: boolean; fecha: string | null }

// Por debajo de este cambio (en puntos de % del peso) un test se considera igual que el anterior: ni sube ni es récord.
export const UMBRAL_IGUAL = 1

const VACIA: Constancia = { semanas: [], cumplidas: 0, conSesiones: 0, rachaActual: 0, mejorRacha: 0 }

export function constancia(d: DatosAtleta, hoy: string): Constancia {
  let semanasPlan: readonly SemanaPlan[]
  try {
    semanasPlan = temporadaDe(d).semanas
  } catch {
    return VACIA
  }
  const lunesHoy = lunesDe(hoy)
  const registradas = new Set(d.registros.map((r) => r.sesion_id))
  const semanas: SemanaCumplida[] = []
  for (const s of semanasPlan) {
    if (s.lunes > lunesHoy) break
    if (s.lunes === lunesHoy) { semanas.push({ lunes: s.lunes, estado: 'actual', descarga: s.descarga }); break }
    const deLaSemana = d.sesiones.filter((x) => x.fecha >= s.lunes && x.fecha <= sumarDias(s.lunes, 6) && x.sesion.tipo !== 'descanso')
    const estado: EstadoSemana = deLaSemana.length === 0 ? 'neutra' : deLaSemana.every((x) => registradas.has(x.id)) ? 'cumplida' : 'no-cumplida'
    semanas.push({ lunes: s.lunes, estado, descarga: s.descarga })
  }
  let racha = 0
  let mejorRacha = 0
  for (const s of semanas) {
    if (s.estado === 'cumplida') { racha++; mejorRacha = Math.max(mejorRacha, racha) }
    else if (s.estado === 'no-cumplida') racha = 0
  }
  return {
    semanas,
    cumplidas: semanas.filter((s) => s.estado === 'cumplida').length,
    conSesiones: semanas.filter((s) => s.estado === 'cumplida' || s.estado === 'no-cumplida').length,
    rachaActual: racha,
    mejorRacha,
  }
}

export function resumenEscalada(d: DatosAtleta, hoy: string): ResumenEscalada {
  const hasta = [...d.intentos].filter((i) => i.fecha <= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))
  const caida = hasta.filter((i) => !i.encadenado && i.motivo_caida).at(-1)
  return {
    gradoActual: d.perfil.grado_actual,
    gradoObjetivo: d.perfil.grado_objetivo,
    encadenes: hasta.filter((i) => i.encadenado).length,
    ultimaCaida: caida?.motivo_caida ?? null,
  }
}

const domingo = (lunes: string): string => sumarDias(lunes, 6)

export function logros(d: DatosAtleta, hoy: string): Logro[] {
  const c = constancia(d, hoy)
  const via = vistaVia(d, hoy)
  const cumplidas = c.semanas.filter((s) => s.estado === 'cumplida')
  let racha = 0
  let cuatro: string | null = null
  for (const s of c.semanas) {
    if (s.estado === 'cumplida') { racha++; if (racha === 4 && !cuatro) cuatro = domingo(s.lunes) }
    else if (s.estado === 'no-cumplida') racha = 0
  }
  const encadene = [...d.intentos].filter((i) => i.encadenado && i.fecha <= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))[0]
  let record: string | null = null
  let mejor = -Infinity
  via.tests.filter((t) => t.fecha <= hoy).forEach((t, i) => {
    if (i > 0 && t.fuerzaRelativa >= mejor + UMBRAL_IGUAL) record = t.fecha
    mejor = Math.max(mejor, t.fuerzaRelativa)
  })
  // La cima pide haber entrenado: al menos una sesión registrada (no descanso) en la temporada, hasta hoy.
  const registradas = new Set(d.registros.map((r) => r.sesion_id))
  const inicio = via.largos[0]?.chapas[0]?.lunes
  const entrenada = inicio !== undefined &&
    d.sesiones.some((x) => registradas.has(x.id) && x.sesion.tipo !== 'descanso' && x.fecha >= inicio && x.fecha <= hoy)
  const logro = (id: string, titulo: string, descripcion: string, fecha: string | null): Logro =>
    ({ id, titulo, descripcion, conseguido: fecha !== null, fecha })
  return [
    logro('primera-semana', 'Primera semana cumplida', 'Registraste todas las sesiones de una semana.', cumplidas[0] ? domingo(cumplidas[0].lunes) : null),
    logro('cuatro-seguidas', '4 semanas seguidas', 'Cuatro semanas cumplidas una detrás de otra.', cuatro),
    logro('primer-encadene', 'Primer encadene', 'Encadenaste una vía o un bloque al límite.', encadene?.fecha ?? null),
    logro('record-fuerza', 'Récord de fuerza de dedos', 'Un test mejor que todos los anteriores.', record),
    ...via.largos.map((l) =>
      logro(`largo-${l.numero}`, `Largo ${l.numero} · ${l.fase}`, 'Largo completado.',
        l.estado === 'hecho' && l.sesionesHechas > 0 ? domingo(l.chapas.at(-1)!.lunes) : null)),
    logro('cima', 'Cima', 'Llegaste a la semana objetivo de la temporada.', entrenada && lunesDe(hoy) >= via.cima.lunes ? via.cima.lunes : null),
  ]
}
