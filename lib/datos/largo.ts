// El largo de la temporada en el que estás (fase seguida de un ciclo) y cuánto llevas. Puro.
import { FASE_OBJETIVO, type FaseId, type SemanaPlan } from '../../motor'
import { lunesDe, sumarDias } from '../fecha'
import type { DatosAtleta } from './filas'
import { temporadaDe } from './peticion'
import { posicionSiSePuede } from './temporada'

export interface ProgresoLargo {
  largo: number
  totalLargos: number
  ciclo: 1 | 2
  faseId: FaseId
  fase: string
  semanaDeFase: number
  semanasDeFase: number
  descarga: boolean
  sesionesHechas: number
  proximaReunion: { lunes: string; enSemanas: number } | null
  enCima: boolean
}

// Tramos de semanas seguidas con el mismo ciclo y fase, en orden.
function largosDe(semanas: readonly SemanaPlan[]): SemanaPlan[][] {
  const largos: SemanaPlan[][] = []
  for (const s of semanas) {
    const ultimo = largos.at(-1)
    if (ultimo && ultimo[0]!.ciclo === s.ciclo && ultimo[0]!.faseId === s.faseId) ultimo.push(s)
    else largos.push([s])
  }
  return largos
}

const semanasEntre = (desde: string, hasta: string): number =>
  Math.round((Date.parse(`${hasta}T12:00:00Z`) - Date.parse(`${desde}T12:00:00Z`)) / (7 * 86_400_000))

export function progresoLargo(d: DatosAtleta, hoy: string): ProgresoLargo | null {
  const posicion = posicionSiSePuede(d, hoy)
  if (!posicion) return null
  try {
    const t = temporadaDe(d)
    const largos = largosDe(t.semanas)
    const lunes = lunesDe(hoy)
    const indice = posicion.semanaObjetivo ? largos.length - 1 : largos.findIndex((l) => l.some((s) => s.lunes === lunes))
    if (indice < 0) return null
    const inicio = posicion.semanaObjetivo ? t.objetivo : largos[indice]![0]!.lunes
    const registradas = new Set(d.registros.map((r) => r.sesion_id))
    const sesionesHechas = d.sesiones.filter(
      (s) => s.fecha >= inicio && s.fecha <= hoy && s.sesion.tipo !== 'descanso' && registradas.has(s.id),
    ).length
    const hecho = (l: string): boolean => d.evaluaciones.some((e) => e.fecha >= l && e.fecha <= sumarDias(l, 6) && e.fecha <= hoy)
    const test = posicion.semanaObjetivo ? undefined : t.semanas.find((s) => s.reevaluar && s.lunes >= lunes && !hecho(s.lunes))
    return {
      largo: indice + 1,
      totalLargos: largos.length,
      ciclo: posicion.ciclo,
      faseId: posicion.faseId,
      fase: posicion.fase,
      semanaDeFase: posicion.semanaDeFase,
      semanasDeFase: posicion.semanasDeFase,
      descarga: posicion.descarga,
      sesionesHechas,
      proximaReunion: test ? { lunes: test.lunes, enSemanas: semanasEntre(lunes, test.lunes) } : null,
      enCima: posicion.semanaObjetivo,
    }
  } catch {
    return null
  }
}

export function textoReunion(p: ProgresoLargo): string {
  if (p.enCima) return 'Semana objetivo: a por la cima'
  if (!p.proximaReunion) return 'No quedan tests en la temporada'
  const n = p.proximaReunion.enSemanas
  if (n === 0) return 'Test esta semana'
  if (n === 1) return 'Test la semana que viene'
  return `Test en ${n} semanas`
}

export function tituloLargo(p: ProgresoLargo): string {
  if (p.enCima) return FASE_OBJETIVO.nombre
  return p.descarga ? `${p.fase} · descarga` : p.fase
}
