// La temporada como una vía de largos: fase = largo, semana = chapa, test = reunión, semana objetivo = cima. Puro.
import { FASES, fuerzaRelativa, type FaseId, type SemanaPlan } from '../../motor'
import { lunesDe, sumarDias } from '../fecha'
import { OBJETIVO_FASE, OBJETIVO_SEMANA_OBJETIVO } from '../nombres'
import type { DatosAtleta } from './filas'
import { evaluacionMotor } from './mapeo'
import { temporadaDe } from './peticion'

export type EstadoTramo = 'hecho' | 'actual' | 'futuro'

export interface ChapaVia {
  lunes: string
  estado: EstadoTramo
  descarga: boolean
  sesionesHechas: number // registradas, sin descansos, en esa semana (solo hasta hoy)
}

export interface ResultadoTest {
  fecha: string
  lastreKg: number
  fuerzaRelativa: number // % del peso
}

export interface ReunionVia {
  lunes: string // lunes de la semana de test
  estado: 'hecha' | 'proxima' | 'futura' | 'sin-hacer' // sin-hacer: la semana pasó sin resultado
  resultado: ResultadoTest | null // la última evaluación con fecha dentro de esa semana
}

export interface LargoVia {
  numero: number // 1..n
  ciclo: 1 | 2
  faseId: FaseId
  fase: string
  objetivo: string // OBJETIVO_FASE[faseId]
  estado: EstadoTramo
  chapas: ChapaVia[]
  sesionesHechas: number // suma de las chapas
  reunion: ReunionVia | null // la semana con reevaluar del largo, si la tiene
}

export interface VistaVia {
  largos: LargoVia[]
  cima: { lunes: string; actual: boolean; objetivo: string; grado: string } // grado = perfil.grado_objetivo
  tests: ResultadoTest[] // todas las evaluaciones, de la más antigua a la más reciente (evolución)
  aviso?: string // si la temporada no se puede calcular
}

const mensajeDe = (e: unknown): string => (e instanceof Error ? e.message : String(e))

export function vistaVia(d: DatosAtleta, hoy: string): VistaVia {
  const tests: ResultadoTest[] = [...d.evaluaciones]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((e) => ({ fecha: e.fecha, lastreKg: e.lastre_kg, fuerzaRelativa: fuerzaRelativa(evaluacionMotor(e)) }))
  const cimaBase = { objetivo: OBJETIVO_SEMANA_OBJETIVO, grado: d.perfil.grado_objetivo }
  let semanas: readonly SemanaPlan[]
  let objetivo: string
  try {
    const t = temporadaDe(d)
    semanas = t.semanas
    objetivo = t.objetivo
  } catch (e) {
    return { largos: [], cima: { lunes: d.perfil.objetivo_temporada, actual: false, ...cimaBase }, tests, aviso: `No se ha podido calcular la temporada: ${mensajeDe(e)}` }
  }
  const lunesHoy = lunesDe(hoy)
  const registradas = new Set(d.registros.map((r) => r.sesion_id))
  const hechasEn = (lunes: string): number =>
    d.sesiones.filter((s) => s.fecha >= lunes && s.fecha <= sumarDias(lunes, 6) && s.fecha <= hoy && s.sesion.tipo !== 'descanso' && registradas.has(s.id)).length
  const resultadoEn = (lunes: string): ResultadoTest | null =>
    tests.filter((t) => t.fecha >= lunes && t.fecha <= sumarDias(lunes, 6) && t.fecha <= hoy).at(-1) ?? null

  const tramos: SemanaPlan[][] = []
  for (const s of semanas) {
    const ultimo = tramos.at(-1)
    if (ultimo && ultimo[0]!.ciclo === s.ciclo && ultimo[0]!.faseId === s.faseId) ultimo.push(s)
    else tramos.push([s])
  }

  let proximaAsignada = false
  const largos: LargoVia[] = tramos.map((tramo, i) => {
    const chapas: ChapaVia[] = tramo.map((s) => ({
      lunes: s.lunes,
      estado: s.lunes < lunesHoy ? 'hecho' : s.lunes === lunesHoy ? 'actual' : 'futuro',
      descarga: s.descarga,
      sesionesHechas: s.lunes <= lunesHoy ? hechasEn(s.lunes) : 0,
    }))
    const estado: EstadoTramo = chapas.some((c) => c.estado === 'actual') ? 'actual' : chapas.every((c) => c.estado === 'hecho') ? 'hecho' : 'futuro'
    const semanaTest = tramo.find((s) => s.reevaluar)
    let reunion: ReunionVia | null = null
    if (semanaTest) {
      const resultado = resultadoEn(semanaTest.lunes)
      let estadoReunion: ReunionVia['estado']
      if (resultado) estadoReunion = 'hecha'
      else if (sumarDias(semanaTest.lunes, 6) < hoy) estadoReunion = 'sin-hacer'
      else if (!proximaAsignada) { estadoReunion = 'proxima'; proximaAsignada = true }
      else estadoReunion = 'futura'
      reunion = { lunes: semanaTest.lunes, estado: estadoReunion, resultado }
    }
    const primera = tramo[0]!
    return {
      numero: i + 1, ciclo: primera.ciclo, faseId: primera.faseId, fase: FASES[primera.faseId].nombre,
      objetivo: OBJETIVO_FASE[primera.faseId], estado, chapas,
      sesionesHechas: chapas.reduce((n, c) => n + c.sesionesHechas, 0), reunion,
    }
  })
  return { largos, cima: { lunes: objetivo, actual: lunesHoy === objetivo, ...cimaBase }, tests }
}
