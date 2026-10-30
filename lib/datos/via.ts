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
  resultado: ResultadoTest | null // la última evaluación dentro de su ventana (ver ventanasReuniones)
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
  reuniones: ReunionVia[] // las semanas con reevaluar del largo, en orden (puede haber un test a mitad de fase)
}

export interface VistaVia {
  largos: LargoVia[]
  cima: { lunes: string; actual: boolean; objetivo: string; grado: string } // grado = perfil.grado_objetivo
  tests: ResultadoTest[] // todas las evaluaciones, de la más antigua a la más reciente (evolución)
  aviso?: string // si la temporada no se puede calcular
}

// Ventana de fechas en la que un test cuenta para cada reunión, para que valga hacerlo unos días antes o después de su
// semana. Regla: la reunión k cubre del día siguiente al final de la ventana anterior (el inicio de la temporada para la
// primera) hasta el domingo de su semana + MARGEN_DIAS_TRAS_TEST días, sin pasar nunca del día antes del lunes de la
// reunión siguiente. Así un test adelantado o hecho a mitad de una fase larga, entre dos reuniones, cuenta para la
// siguiente; uno hecho pocos días después de su semana cuenta para la suya, y el margen no roba el de la siguiente.
// Cada reunión se queda con el último test (fecha <= hoy) de su ventana.
export const MARGEN_DIAS_TRAS_TEST = 6

export interface VentanaReunion {
  lunes: string // lunes de la semana de test
  desde: string // incluido
  hasta: string // incluido
}

export function ventanasReuniones(lunesTests: readonly string[], inicio: string): VentanaReunion[] {
  const ventanas: VentanaReunion[] = []
  lunesTests.forEach((lunes, k) => {
    const siguiente = lunesTests[k + 1]
    const finMargen = sumarDias(lunes, 6 + MARGEN_DIAS_TRAS_TEST)
    const hasta = siguiente && sumarDias(siguiente, -1) < finMargen ? sumarDias(siguiente, -1) : finMargen
    const desde = k === 0 ? inicio : sumarDias(ventanas[k - 1]!.hasta, 1)
    ventanas.push({ lunes, desde, hasta })
  })
  return ventanas
}

// El último test de la ventana hecho hasta hoy, o null.
export function testDeVentana<T extends { fecha: string }>(v: VentanaReunion, tests: readonly T[], hoy: string): T | null {
  return [...tests].filter((t) => t.fecha >= v.desde && t.fecha <= v.hasta && t.fecha <= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha)).at(-1) ?? null
}

const mensajeDe = (e: unknown): string => (e instanceof Error ? e.message : String(e))

export function vistaVia(d: DatosAtleta, hoy: string): VistaVia {
  const tests: ResultadoTest[] = [...d.evaluaciones]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((e) => ({ fecha: e.fecha, lastreKg: e.lastre_kg, fuerzaRelativa: fuerzaRelativa(evaluacionMotor(e)) }))
  const cimaBase = { objetivo: OBJETIVO_SEMANA_OBJETIVO, grado: d.perfil.grado_objetivo }
  let semanas: readonly SemanaPlan[]
  let objetivo: string
  let inicio: string
  try {
    const t = temporadaDe(d)
    semanas = t.semanas
    objetivo = t.objetivo
    inicio = t.inicio
  } catch (e) {
    return { largos: [], cima: { lunes: d.perfil.objetivo_temporada, actual: false, ...cimaBase }, tests, aviso: `No se ha podido calcular la temporada: ${mensajeDe(e)}` }
  }
  const lunesHoy = lunesDe(hoy)
  const registradas = new Set(d.registros.map((r) => r.sesion_id))
  const hechasEn = (lunes: string): number =>
    d.sesiones.filter((s) => s.fecha >= lunes && s.fecha <= sumarDias(lunes, 6) && s.fecha <= hoy && s.sesion.tipo !== 'descanso' && registradas.has(s.id)).length
  const tramos: SemanaPlan[][] = []
  for (const s of semanas) {
    const ultimo = tramos.at(-1)
    if (ultimo && ultimo[0]!.ciclo === s.ciclo && ultimo[0]!.faseId === s.faseId) ultimo.push(s)
    else tramos.push([s])
  }

  // Estados de todas las reuniones de la temporada, en orden: «sin-hacer» si su semana ya pasó sin resultado (aún puede
  // pasar a «hecha» si se apunta dentro del margen), «proxima» la primera pendiente, «futura» las demás.
  const ventanas = ventanasReuniones(semanas.filter((s) => s.reevaluar).map((s) => s.lunes), inicio)
  let proximaAsignada = false
  const reunionDe = new Map<string, ReunionVia>()
  for (const v of ventanas) {
    const resultado = testDeVentana(v, tests, hoy)
    let estado: ReunionVia['estado']
    if (resultado) estado = 'hecha'
    else if (sumarDias(v.lunes, 6) < hoy) estado = 'sin-hacer'
    else if (!proximaAsignada) { estado = 'proxima'; proximaAsignada = true }
    else estado = 'futura'
    reunionDe.set(v.lunes, { lunes: v.lunes, estado, resultado })
  }

  const largos: LargoVia[] = tramos.map((tramo, i) => {
    const chapas: ChapaVia[] = tramo.map((s) => ({
      lunes: s.lunes,
      estado: s.lunes < lunesHoy ? 'hecho' : s.lunes === lunesHoy ? 'actual' : 'futuro',
      descarga: s.descarga,
      sesionesHechas: s.lunes <= lunesHoy ? hechasEn(s.lunes) : 0,
    }))
    const estado: EstadoTramo = chapas.some((c) => c.estado === 'actual') ? 'actual' : chapas.every((c) => c.estado === 'hecho') ? 'hecho' : 'futuro'
    const reuniones = tramo.flatMap((s) => reunionDe.get(s.lunes) ?? [])
    const primera = tramo[0]!
    return {
      numero: i + 1, ciclo: primera.ciclo, faseId: primera.faseId, fase: FASES[primera.faseId].nombre,
      objetivo: OBJETIVO_FASE[primera.faseId], estado, chapas,
      sesionesHechas: chapas.reduce((n, c) => n + c.sesionesHechas, 0), reuniones,
    }
  })
  return { largos, cima: { lunes: objetivo, actual: lunesHoy === objetivo, ...cimaBase }, tests }
}
