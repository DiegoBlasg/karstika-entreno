// Dónde cae una fecha dentro de la temporada: «Semana 3 de 49 · Ciclo 1 · Fuerza de dedos (semana 2 de 8)». Puro.
import { FASE_OBJETIVO, FASES, semanaEnFecha, type FaseId } from '../../motor'
import { sumarDias } from '../fecha'
import type { DatosAtleta } from './filas'
import { temporadaDe } from './peticion'

export interface PosicionTemporada {
  semana: number          // 1..total
  total: number           // semanas del plan + la semana objetivo
  ciclo: 1 | 2
  faseId: FaseId
  fase: string            // nombre de la fase
  semanaDeFase: number    // 1..semanasDeFase
  semanasDeFase: number   // semanas seguidas de esa fase en ese ciclo
  descarga: boolean
  reevaluar: boolean      // semana de test
  semanaObjetivo: boolean // la semana del viaje: solo pegues y cosas suaves
}

// Calendario de la temporada (la descarga programada, no una adelantada por el bienestar: esa la sabe la propuesta).
// Fuera de temporada, null; la semana objetivo cuenta como la última.
export function posicionEnTemporada(d: DatosAtleta, fecha: string): PosicionTemporada | null {
  const t = temporadaDe(d)
  const total = t.semanas.length + 1
  const s = semanaEnFecha(t, fecha)
  if (!s) {
    const ultima = t.semanas[t.semanas.length - 1]
    if (!ultima || fecha < t.objetivo || fecha > sumarDias(t.objetivo, 6)) return null
    return {
      semana: total, total, ciclo: ultima.ciclo, faseId: FASE_OBJETIVO.id, fase: FASE_OBJETIVO.nombre, semanaDeFase: 1,
      semanasDeFase: 1, descarga: false, reevaluar: false, semanaObjetivo: true,
    }
  }
  const i = t.semanas.indexOf(s)
  let fin = i
  while (t.semanas[fin + 1]?.faseId === s.faseId && t.semanas[fin + 1]?.ciclo === s.ciclo) fin++
  return {
    semana: i + 1, total, ciclo: s.ciclo, faseId: s.faseId, fase: FASES[s.faseId].nombre, semanaDeFase: s.semanaDeFase,
    semanasDeFase: s.semanaDeFase + (fin - i), descarga: s.descarga, reevaluar: s.reevaluar, semanaObjetivo: false,
  }
}

// Para las pantallas en las que la línea de contexto es un extra: si los datos no dejan calcular la temporada, no se
// muestra y la pantalla sigue funcionando (los datos incoherentes ya se avisan al preparar sesiones).
export function posicionSiSePuede(d: DatosAtleta, fecha: string): PosicionTemporada | null {
  try {
    return posicionEnTemporada(d, fecha)
  } catch {
    return null
  }
}

// «Semana 3 de 49 · Ciclo 1 · Fuerza de dedos (semana 2 de 8) · semana de descarga» y, debajo, el objetivo de la fase.
export function textoPosicion(p: PosicionTemporada): string {
  const partes = [`Semana ${p.semana} de ${p.total}`, `Ciclo ${p.ciclo}`]
  partes.push(p.semanasDeFase > 1 ? `${p.fase} (semana ${p.semanaDeFase} de ${p.semanasDeFase})` : p.fase)
  if (p.descarga) partes.push('semana de descarga')
  if (p.reevaluar) partes.push('semana de test')
  return partes.join(' · ')
}
