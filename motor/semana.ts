// Tramo 2e (P-67): plan semanal por huecos. Con los huecos que quedan hasta el domingo, se busca el reparto que mejor
// cubre los cupos de la fase y se devuelve la sesión del hueco pedido. Cada opción la calcula el generador de siempre
// (con el historial más lo ya elegido para los huecos anteriores), así que pasa por todas las reglas de seguridad y de
// estado. El generador se recibe como función para no crear un import circular con propuesta.ts.
import { tiposPosibles } from './contexto'
import { explicar, type Explicacion } from './explicacion'
import { VALORES } from './parametros'
import type { Hueco, Peticion, Propuesta, SesionPlan } from './propuesta-tipos'
import { NOMBRE_TIPO } from './nombres'
import { conDominadas, esCargaAlta } from './seguridad'
import { desdeLunes } from './temporada'
import { diaNumero, fechaDesdeDia } from './tiempo'
import { TIPOS_COMPLEMENTO, type Sesion, type TipoSesion } from './tipos'

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
export const MAX_POR_DIA = 2
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
  altaFuera: number    // sesiones de carga alta en huecos fuera de casa (rocódromo o roca)
  minutosFuera: number
  hombroSeguidos: number // pares de días seguidos con hombro (como sesión o complemento)
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

// P-41 (decisión de diseño de Diego del 2026-10-29): el hombro se prefiere en días no seguidos. Se cuentan los pares de
// días seguidos con hombro desde el día anterior al lunes (el domingo de la semana pasada también es «ayer»).
function hombroSeguidos(p: Peticion, plan: readonly Sesion[]): number {
  const d = diaNumero(p.fecha)
  const lunes = d - desdeLunes(d)
  const dias = new Set(
    [...p.historial, ...plan].filter((s) => cuentaPara(s, 'hombro')).map((s) => diaNumero(s.fecha)).filter((x) => x >= lunes - 1 && x <= lunes + 6),
  )
  return [...dias].filter((x) => dias.has(x + 1)).length
}

function puntuar(p: Peticion, ranuras: readonly Hueco[], elegidas: (SesionPlan | null)[]): Candidata {
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
    altaFuera: elegidas.filter((o, i) => o !== null && esCargaAlta(o.sesion) && ranuras[i]!.contexto.lugar !== 'casa').length,
    minutosFuera: elegidas.reduce((a, o, i) => a + (o !== null && ranuras[i]!.contexto.lugar !== 'casa' ? o.sesion.duracionMin : 0), 0),
    hombroSeguidos: hombroSeguidos(p, plan),
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
  // Decisión del usuario (2026-10-27): el rocódromo manda; las mejores sesiones van ahí y sus huecos se aprovechan.
  if (a.altaFuera !== b.altaFuera) return a.altaFuera > b.altaFuera
  if (a.minutosFuera !== b.minutosFuera) return a.minutosFuera > b.minutosFuera
  // P-41 (preferencia de diseño, no regla de seguridad): con todo lo anterior igual, el hombro en días no seguidos.
  if (a.hombroSeguidos !== b.hombroSeguidos) return a.hombroSeguidos < b.hombroSeguidos
  if (a.minutos !== b.minutos) return a.minutos > b.minutos
  const o = lex(a.orden, b.orden)
  if (o !== 0) return o < 0
  return a.tipos < b.tipos
}

// Las llamadas internas del plan solo deciden el tipo de cada hueco; las reglas de seguridad miran como mucho 70 días
// atrás (P-08, en testReciente), así que se usa un historial recortado para que el coste no crezca con la temporada.
// La autorregulación mira sin límite (un rojo sin alta, P-46), así que se conservan siempre, con su registro, las
// sesiones con alguna molestia apuntada, además de los tests de dedos y la primera sesión (P-32). La sesión de hoy se
// recalcula después con el historial completo; si no coincide, se descarta el plan (falla cerrado).
const DIAS_HISTORIAL_PLAN = 75

const enFrase = (x: string): string => (/^[A-Z]{2}/.test(x) ? x : x.charAt(0).toLowerCase() + x.slice(1))
const nombreSesion = (s: Sesion): string =>
  [NOMBRE_TIPO[s.tipo], ...(s.incluye ?? []).map((t) => NOMBRE_TIPO[t])].map(enFrase).join(' + ')
const mismaSesion = (a: SesionPlan, b: SesionPlan): boolean =>
  a.sesion.tipo === b.sesion.tipo && (a.sesion.incluye ?? []).join() === (b.sesion.incluye ?? []).join()

// Búsqueda en profundidad. En cada hueco se abre una rama por cada opción de carga alta que el generador propone ahí,
// otra por la mejor suave y, si esa suave lleva dominadas (que no pueden ir el día de una sesión intensa de dedos,
// P-39), otra con la misma sin dominadas (o el hueco libre, si sin dominadas no queda nada suave). Si la mejor suave
// lleva hombro, otra con la mejor suave sin hombro y, si ayer ya hubo hombro, otra con el hueco libre: así el plan puede
// repartir el hombro en días no seguidos (P-41). Si el generador recomienda descanso (principal nula), el hueco queda
// vacío.
// Se poda una rama cuando ni sumando un hueco por tipo a todos los restantes podría superar al mejor reparto.
export function planificarSemana(
  p: Peticion,
  proponerEn: (q: Peticion, sinDominadas: boolean, soloSuave: boolean, sinHombro: boolean) => Propuesta,
  // Si el test de dedos podría proponerse en ese hueco (no lo hay reciente); solo afina la poda. Sin él, se supone que sí.
  testPosibleEn: (h: Hueco) => boolean = () => true,
): { ranuras: Hueco[]; elegidas: (SesionPlan | null)[] } {
  const { huecos = [], ...base } = p
  const ranuras: Hueco[] = [
    { fecha: p.fecha, horaInicio: p.horaInicio, contexto: p.contexto },
    ...[...huecos].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio - b.horaInicio),
  ]
  const hoy = diaNumero(p.fecha)
  // Molestias efectivas: un registro sin molestias hereda las del chequeo de su día (P-45).
  const diasConMolestia = new Set((p.seguimiento?.chequeos ?? []).filter((c) => c.molestias.length > 0).map((c) => c.fecha))
  const conMolestia = new Set(
    (p.seguimiento?.registros ?? []).filter((r) => r.molestias.length > 0 || diasConMolestia.has(r.fecha)).map((r) => r.sesionId),
  )
  const primera = p.historial.reduce<Sesion | undefined>((a, s) => (!a || s.fecha < a.fecha ? s : a), undefined)
  const corto = p.historial.filter(
    (s) => diaNumero(s.fecha) >= hoy - DIAS_HISTORIAL_PLAN || conMolestia.has(s.id) || s.tipo === 'evaluacion-dedos' || s === primera,
  )
  const ids = new Set(corto.map((s) => s.id))
  const baseCorta: Peticion = {
    ...base,
    historial: corto,
    ...(p.seguimiento ? { seguimiento: { ...p.seguimiento, registros: p.seguimiento.registros.filter((r) => ids.has(r.sesionId)) } } : {}),
  }
  let mejor: Candidata | undefined
  const C: Record<string, number> = {}
  const cnt = (k: string) => { C[k] = (C[k] ?? 0) + 1 }
  // Cota de lo mejor que puede llegar a dar una rama, criterio a criterio y en el mismo orden que `esMejor`: cupos (un hueco
  // suma como mucho 1 a cada tipo), carga alta y minutos fuera de casa (cada hueco restante, como mucho, lo entero), hombro
  // en días seguidos (solo puede crecer) y minutos totales. Si la cota ya pierde con el mejor reparto, la rama se poda.
  const fueraDe = (h: Hueco): boolean => h.contexto.lugar !== 'casa'
  // Tipos que cada hueco puede llegar a sumar (como sesión o como complemento): los posibles en su contexto y no prohibidos.
  const posiblesEn = ranuras.map((h) => {
    const t = new Set(tiposPosibles(h.contexto).filter((x) => !p.fase.prohibidos.includes(x)))
    if (t.has('evaluacion-dedos') && !testPosibleEn(h)) t.delete('evaluacion-dedos')
    return t
  })
  const podar = (i: number, elegidas: (SesionPlan | null)[], m: Candidata): boolean => {
    const restantes = ranuras.slice(i)
    const plan = elegidas.flatMap((o) => (o ? [o.sesion] : []))
    const ventana = enLaSemana(p, [...p.historial, ...plan])
    const huecosPara = (t: TipoSesion): number => posiblesEn.slice(i).filter((x) => x.has(t)).length
    const vector = p.fase.prioridad.map((t) => Math.min(ventana.filter((s) => cuentaPara(s, t)).length + huecosPara(t), p.fase.cupos[t] ?? 0))
    const v = lex(vector, m.vector)
    if (v !== 0) return v < 0
    const actual = puntuar(p, ranuras, elegidas)
    // Una sesión de carga alta gasta cupo de su tipo (el cupo es tope) y como mucho va una por día (P-68); los tipos que
    // pueden ir de complemento son siempre suaves.
    const cupoAlta = p.fase.prioridad
      .filter((t) => !(TIPOS_COMPLEMENTO as readonly string[]).includes(t))
      .reduce((a, t) => a + Math.max(0, (p.fase.cupos[t] ?? 0) - ventana.filter((s) => cuentaPara(s, t)).length), 0)
    const diasFuera = new Set(restantes.filter(fueraDe).map((h) => h.fecha)).size
    const altaFuera = actual.altaFuera + Math.min(diasFuera, cupoAlta)
    if (altaFuera !== m.altaFuera) return altaFuera < m.altaFuera
    const minutosFuera = actual.minutosFuera + restantes.filter(fueraDe).reduce((a, h) => a + h.contexto.minutosDisponibles, 0)
    if (minutosFuera !== m.minutosFuera) return minutosFuera < m.minutosFuera
    if (actual.hombroSeguidos !== m.hombroSeguidos) return actual.hombroSeguidos > m.hombroSeguidos
    return actual.minutos + restantes.reduce((a, h) => a + h.contexto.minutosDisponibles, 0) < m.minutos
  }
  const visitar = (i: number, elegidas: (SesionPlan | null)[], historial: Sesion[]): void => {
    if (i === ranuras.length) {
      cnt('leaf')
      const c = puntuar(p, ranuras, elegidas)
      if (!mejor || esMejor(c, mejor)) mejor = c
      return
    }
    cnt(`n${i}`)
    if (mejor && podar(i, elegidas, mejor)) { cnt(`p${i}`); return }
    const h = ranuras[i]!
    const q: Peticion = { ...baseCorta, fecha: h.fecha, horaInicio: h.horaInicio, contexto: h.contexto, historial }
    const r = proponerEn(q, false, false, false)
    // En un hueco de rocódromo o roca no se deja la tarde vacía por el descanso recomendado (P-16): se prueban sus
    // alternativas suaves (decisión del usuario del 2026-10-27: el rocódromo se aprovecha siempre).
    const fuera = h.contexto.lugar !== 'casa'
    const opciones = r.principal
      ? [r.principal, ...r.alternativas]
      : fuera && r.descanso?.regla === 'generador.descanso-recomendado'
        ? r.alternativas
        : []
    const ramas: SesionPlan[] = []
    const anadir = (o: SesionPlan | null | undefined): void => {
      if (o && !ramas.some((x) => mismaSesion(x, o))) ramas.push(o)
    }
    const suave = opciones.find((o) => !esCargaAlta(o.sesion))
    for (const o of opciones) if (esCargaAlta(o.sesion) || o === suave) anadir(o)
    let libre = false
    if (suave && conDominadas(suave.sesion)) {
      const r2 = proponerEn(q, true, false, false)
      const sinDominadas = [r2.principal, ...r2.alternativas].find((o) => o !== null && !esCargaAlta(o.sesion))
      if (sinDominadas) anadir(sinDominadas)
      else libre = true
    }
    if (suave && cuentaPara(suave.sesion, 'hombro')) anadir(opciones.find((o) => !esCargaAlta(o.sesion) && !cuentaPara(o.sesion, 'hombro')))
    const ayer = fechaDesdeDia(diaNumero(h.fecha) - 1)
    if (ramas.some((o) => cuentaPara(o.sesion, 'hombro')) && historial.some((s) => s.fecha === ayer && cuentaPara(s, 'hombro'))) {
      // Ayer ya hubo hombro: se prueban también las mismas opciones sin hombro (P-41).
      const r4 = proponerEn(q, false, false, true)
      const sinHombro = [r4.principal, ...r4.alternativas].filter((o): o is SesionPlan => o !== null)
      const suaveSinHombro = sinHombro.find((o) => !esCargaAlta(o.sesion))
      for (const o of sinHombro) if (esCargaAlta(o.sesion) || o === suaveSinHombro) anadir(o)
      // El hueco libre solo hace falta si sin hombro no queda nada suave o lo que queda lleva dominadas (P-39).
      if (!suaveSinHombro || conDominadas(suaveSinHombro.sesion)) libre = true
    }
    // En el rocódromo o la roca, si no hay ninguna opción suave entre las primeras, se pide la mejor suave: el hueco se
    // aprovecha aunque el plan reserve la carga alta para otro (decisión del usuario del 2026-10-27).
    if (fuera && !ramas.some((o) => !esCargaAlta(o.sesion))) {
      const r3 = proponerEn(q, false, true, false)
      anadir([r3.principal, ...r3.alternativas].find((o) => o !== null && !esCargaAlta(o.sesion)))
    }
    // Si no hay opciones, o si todas son de carga alta, también se prueba dejar el hueco libre: una carga alta
    // forzada aquí puede quitar sitio a otra mejor más adelante.
    if (libre || ramas.length === 0 || !ramas.some((o) => !esCargaAlta(o.sesion))) visitar(i + 1, [...elegidas, null], historial)
    for (const o of ramas) visitar(i + 1, [...elegidas, o], [...historial, { ...o.sesion, id: `${PREFIJO_SEMANA}${i}` }])
  }
  visitar(0, [], [...corto])
  if (process.env.DEBUGPLAN) console.log('CALLS', JSON.stringify(C), mejor!.tipos)
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

export function explicacionHuecoLibre(ranuras: readonly Hueco[], elegidas: readonly (SesionPlan | null)[]): Explicacion {
  const i = elegidas.findIndex((o, k) => k > 0 && o !== null && esCargaAlta(o.sesion))
  const reserva = i > 0 ? ` El plan reserva la carga alta para ${franja(ranuras[i]!)} (${nombreSesion(elegidas[i]!.sesion)}).` : ''
  return explicar('plan.semana-libre', ['P-67'], `En este hueco no hace falta entrenar.${reserva} Si te apetece moverte, tienes las alternativas.`)
}

export function explicacionAlternativaSemana(): Explicacion {
  return explicar(
    'plan.semana-alternativa',
    ['P-67'],
    'Si eliges esta en lugar de la propuesta, el resto de la semana puede cambiar: el plan se recalcula en tu próxima petición.',
  )
}
