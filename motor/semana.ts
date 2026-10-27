// Tramo 2e (P-67): plan semanal por huecos. Con los huecos que quedan hasta el domingo, se busca el reparto que mejor
// cubre los cupos de la fase y se devuelve la sesión del hueco pedido. Cada opción la calcula el generador de siempre
// (con el historial más lo ya elegido para los huecos anteriores), así que pasa por todas las reglas de seguridad y de
// estado. El generador se recibe como función para no crear un import circular con propuesta.ts.
import { tiposPosibles } from './contexto'
import { explicar, type Explicacion } from './explicacion'
import { VALORES } from './parametros'
import type { Hueco, Peticion, Propuesta, SesionPlan } from './propuesta-tipos'
import { NOMBRE_TIPO } from './nombres'
import { esCargaAlta } from './seguridad'
import { desdeLunes } from './temporada'
import { diaNumero, fechaDesdeDia } from './tiempo'
import type { Sesion, TipoSesion } from './tipos'

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const MAX_POR_DIA = 2
const franja = (h: Hueco): string => `el ${DIAS[desdeLunes(diaNumero(h.fecha))]} por la ${h.horaInicio < 14 ? 'mañana' : 'tarde'}`
const inicioMin = (h: Hueco): number => diaNumero(h.fecha) * 1440 + Math.round(h.horaInicio * 60)

export function validarHuecos(p: Peticion): void {
  const huecos = p.huecos
  if (huecos === undefined) return
  if (!Array.isArray(huecos)) throw new Error('huecos debe ser un array')
  const { maxHuecos } = VALORES['P-67']
  if (huecos.length > maxHuecos) throw new Error(`Como mucho ${maxHuecos} huecos por semana: hay ${huecos.length}`)
  const hoy = diaNumero(p.fecha)
  const domingo = hoy - desdeLunes(hoy) + 6
  for (const h of huecos) {
    if (h == null || typeof h.fecha !== 'string') throw new Error('Cada hueco necesita una fecha')
    const donde = `Hueco del ${h.fecha} a las ${h.horaInicio}`
    const d = diaNumero(h.fecha)
    if (!Number.isFinite(h.horaInicio) || h.horaInicio < 0 || h.horaInicio >= 24) throw new Error(`${donde}: la hora debe estar entre 0 y 24`)
    if (d < hoy || (d === hoy && h.horaInicio <= p.horaInicio)) throw new Error(`${donde}: tiene que ser posterior a la sesión que pides`)
    if (d > domingo) throw new Error(`${donde}: los huecos llegan como mucho hasta el domingo de esta semana (${fechaDesdeDia(domingo)})`)
    if (h.contexto == null) throw new Error(`${donde}: falta el contexto`)
    tiposPosibles(h.contexto) // lanza si el contexto no es válido
  }
  const todos: Hueco[] = [{ fecha: p.fecha, horaInicio: p.horaInicio, contexto: p.contexto }, ...huecos]
  const tramos = todos
    .map((h) => ({ h, ini: inicioMin(h), fin: inicioMin(h) + Math.round(h.contexto.minutosDisponibles) }))
    .sort((a, b) => a.ini - b.ini)
  for (let k = 1; k < tramos.length; k++) {
    const t = tramos[k]!
    if (t.ini < tramos[k - 1]!.fin) throw new Error(`Hueco del ${t.h.fecha} a las ${t.h.horaInicio}: se solapa con otro hueco o con la sesión que pides`)
  }
  const porDia = new Map<string, number>()
  for (const h of todos) porDia.set(h.fecha, (porDia.get(h.fecha) ?? 0) + 1)
  for (const [fecha, n] of porDia) {
    if (n > MAX_POR_DIA) throw new Error(`El ${fecha} tiene ${n} huecos contando la sesión que pides: como mucho ${MAX_POR_DIA} por día`)
  }
}

const cuentaPara = (s: Sesion, t: TipoSesion): boolean => s.tipo === t || (s.incluye ?? []).some((c) => c === t)

interface Candidata {
  elegidas: (SesionPlan | null)[]
  vector: number[]     // cupos cubiertos, en el orden de prioridad de la fase
  minutos: number
  orden: number[]      // puesto de prioridad de cada hueco (menor = más prioritario)
  tipos: string
}

// Sesiones de la semana natural de la petición (los cupos son por semana, de lunes a domingo).
function enLaSemana(p: Peticion, sesiones: readonly Sesion[]): Sesion[] {
  const d = diaNumero(p.fecha)
  const lunes = d - desdeLunes(d)
  return sesiones.filter((s) => {
    const x = diaNumero(s.fecha)
    return x >= lunes && x <= lunes + 6
  })
}

function puntuar(p: Peticion, elegidas: (SesionPlan | null)[]): Candidata {
  const plan = elegidas.flatMap((o) => (o ? [o.sesion] : []))
  const ventana = enLaSemana(p, [...p.historial, ...plan])
  const n = p.fase.prioridad.length
  const puesto = (o: SesionPlan | null): number => {
    if (!o) return n + 1
    const i = p.fase.prioridad.indexOf(o.sesion.tipo)
    return i < 0 ? n : i
  }
  return {
    elegidas,
    vector: p.fase.prioridad.map((t) => Math.min(ventana.filter((s) => cuentaPara(s, t)).length, p.fase.cupos[t] ?? 0)),
    minutos: plan.reduce((a, s) => a + s.duracionMin, 0),
    orden: elegidas.map(puesto),
    tipos: elegidas.map((o) => o?.sesion.tipo ?? '-').join(','),
  }
}

const lex = (a: readonly number[], b: readonly number[]): number => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i]! - b[i]!
  return 0
}

function esMejor(a: Candidata, b: Candidata): boolean {
  const v = lex(a.vector, b.vector)
  if (v !== 0) return v > 0
  if (a.minutos !== b.minutos) return a.minutos > b.minutos
  const o = lex(a.orden, b.orden)
  if (o !== 0) return o < 0
  return a.tipos < b.tipos
}

// Las llamadas internas del plan solo deciden el tipo de cada hueco; las reglas que lo deciden miran como mucho 70 días
// atrás (P-08, en testReciente), así que se usa un historial recortado para que el coste no crezca con la temporada.
// La sesión de hoy se recalcula después con el historial completo (cargas exactas).
const DIAS_HISTORIAL_PLAN = 75

const nombreSesion = (s: Sesion): string =>
  [NOMBRE_TIPO[s.tipo], ...(s.incluye ?? []).map((t) => NOMBRE_TIPO[t])].map((x) => x.toLowerCase()).join(' + ')
const mismaSesion = (a: SesionPlan, b: SesionPlan): boolean =>
  a.sesion.tipo === b.sesion.tipo && (a.sesion.incluye ?? []).join() === (b.sesion.incluye ?? []).join()

// Búsqueda en profundidad. En cada hueco se abre una rama por cada opción de carga alta que el generador propone ahí,
// otra por la mejor suave y, si esa suave lleva dominadas (que no pueden ir el día de una sesión intensa de dedos,
// P-39), otra con la misma sin dominadas. Si el generador recomienda descanso (principal nula), el hueco queda vacío.
// Se poda una rama cuando ni sumando un hueco por tipo a todos los restantes podría superar al mejor reparto.
export function planificarSemana(
  p: Peticion,
  proponerEn: (q: Peticion, sinDominadas: boolean) => Propuesta,
): { ranuras: Hueco[]; elegidas: (SesionPlan | null)[] } {
  const { huecos = [], ...base } = p
  const ranuras: Hueco[] = [
    { fecha: p.fecha, horaInicio: p.horaInicio, contexto: p.contexto },
    ...[...huecos].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio - b.horaInicio),
  ]
  const hoy = diaNumero(p.fecha)
  const corto = p.historial.filter((s) => diaNumero(s.fecha) >= hoy - DIAS_HISTORIAL_PLAN)
  const ids = new Set(corto.map((s) => s.id))
  const baseCorta: Peticion = {
    ...base,
    historial: corto,
    ...(p.seguimiento ? { seguimiento: { ...p.seguimiento, registros: p.seguimiento.registros.filter((r) => ids.has(r.sesionId)) } } : {}),
  }
  let mejor: Candidata | undefined
  const cota = (i: number, elegidas: (SesionPlan | null)[]): number[] => {
    const restantes = ranuras.length - i
    const ventana = enLaSemana(p, [...p.historial, ...elegidas.flatMap((o) => (o ? [o.sesion] : []))])
    return p.fase.prioridad.map((t) => Math.min(ventana.filter((s) => cuentaPara(s, t)).length + restantes, p.fase.cupos[t] ?? 0))
  }
  const visitar = (i: number, elegidas: (SesionPlan | null)[], historial: Sesion[]): void => {
    if (i === ranuras.length) {
      const c = puntuar(p, elegidas)
      if (!mejor || esMejor(c, mejor)) mejor = c
      return
    }
    if (mejor && lex(cota(i, elegidas), mejor.vector) < 0) return
    const h = ranuras[i]!
    const q: Peticion = { ...baseCorta, fecha: h.fecha, horaInicio: h.horaInicio, contexto: h.contexto, historial }
    const r = proponerEn(q, false)
    const opciones = r.principal ? [r.principal, ...r.alternativas] : []
    const ramas: SesionPlan[] = []
    const anadir = (o: SesionPlan | null | undefined): void => {
      if (o && !ramas.some((x) => mismaSesion(x, o))) ramas.push(o)
    }
    const suave = opciones.find((o) => !esCargaAlta(o.sesion))
    for (const o of opciones) if (esCargaAlta(o.sesion) || o === suave) anadir(o)
    if (suave && (suave.sesion.incluye ?? []).includes('dominadas')) {
      const r2 = proponerEn(q, true)
      anadir([r2.principal, ...r2.alternativas].find((o) => o !== null && !esCargaAlta(o.sesion)))
    }
    if (ramas.length === 0) visitar(i + 1, [...elegidas, null], historial)
    for (const o of ramas) visitar(i + 1, [...elegidas, o], [...historial, { ...o.sesion, id: `${PREFIJO_SEMANA}${i}` }])
  }
  visitar(0, [], [...corto])
  return { ranuras, elegidas: mejor!.elegidas }
}

export const PREFIJO_SEMANA = 'semana-'

export function explicacionSemana(ranuras: readonly Hueco[], elegidas: readonly (SesionPlan | null)[], hoySinPlan: SesionPlan | null): Explicacion {
  const lista = ranuras.slice(1).map((h, i) => {
    const o = elegidas[i + 1]
    return `${franja(h)}, ${o ? `${nombreSesion(o.sesion)} (${o.sesion.duracionMin} min)` : 'libre'}`
  })
  const partes = [`Plan del resto de la semana con tus huecos: ${lista.join('; ')}.`]
  const hoy = elegidas[0]
  if (hoySinPlan && hoy && esCargaAlta(hoySinPlan.sesion) && !esCargaAlta(hoy.sesion)) {
    const i = elegidas.findIndex((o, k) => k > 0 && o !== null && esCargaAlta(o.sesion))
    if (i > 0) partes.push(`Hoy va suave: el plan reserva la carga alta para ${franja(ranuras[i]!)} (${nombreSesion(elegidas[i]!.sesion)}).`)
  }
  partes.push('El plan se recalcula cada vez que pides una sesión.')
  return explicar('plan.semana', ['P-67'], partes.join(' '))
}

export function explicacionAlternativaSemana(): Explicacion {
  return explicar(
    'plan.semana-alternativa',
    ['P-67'],
    'Si eliges esta en lugar de la propuesta, el resto de la semana puede cambiar: el plan se recalcula en tu próxima petición.',
  )
}
