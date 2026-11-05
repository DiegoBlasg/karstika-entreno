// La semana que la app supone al generar un entreno (P-74): cuántos días más entrenarás esta semana (lo que dices en
// Yo y lo que sueles hacer) y qué ratos, para que el motor reparta la carga (P-67). Puro.
import { VALORES, type Compania, type Hueco, type Lugar } from '../../motor'
import { lunesDe, sumarDias } from '../fecha'
import { franja, HORA_FRANJA, type Franja } from './agenda'
import type { DatosAtleta, DiasSemana } from './filas'

// Lo que no cuenta como día de entrenamiento al suponer la semana: el descanso y los extras suaves.
const NO_ES_ENTRENAMIENTO: readonly string[] = ['descanso', 'cardio', 'fuerza-forma', 'core-movilidad']

export interface EntradaSupuesta {
  fecha: string
  horaInicio: number
  contexto: { compania: Compania; lugar: Lugar; minutosDisponibles: number }
}

interface Habito {
  veces: number                   // semanas (de las del historial) con sesión en ese día y franja
  contexto: EntradaSupuesta['contexto']
}

export interface Habitos {
  porRato: Map<string, Habito>    // clave `${dia}-${franja}` (dia: 0 = lunes … 6 = domingo); solo los habituales
  mediaDias: number | null        // días con sesión por semana; null con menos semanas de historial de las necesarias
}

const FRANJAS: readonly Franja[] = ['manana', 'tarde']
const clave = (dia: number, f: Franja): string => `${dia}-${f}`
const diaDeLaSemana = (fecha: string): number => (new Date(`${fecha}T12:00:00Z`).getUTCDay() + 6) % 7
const masRepetido = <T>(xs: readonly T[], k: (x: T) => string): T => {
  const cuenta = new Map<string, { x: T; n: number }>()
  for (const x of xs) cuenta.set(k(x), { x, n: (cuenta.get(k(x))?.n ?? 0) + 1 })
  return [...cuenta.values()].sort((a, b) => b.n - a.n)[0]!.x
}

// Lo que haces de verdad: las sesiones generadas y registradas de las semanas anteriores a la de `fecha`. Un rato es
// habitual si se repite en al menos 2 semanas (una vez suelta no es costumbre).
export function habitos(d: DatosAtleta, fecha: string): Habitos {
  const { semanasHistorial, semanasMinimas, vecesHabitual } = VALORES['P-74']
  const lunes = lunesDe(fecha)
  const desde = sumarDias(lunes, -7 * semanasHistorial)
  const registradas = new Set(d.registros.map((r) => r.sesion_id))
  const hechas = d.sesiones.filter((s) =>
    s.propuesta?.contexto && registradas.has(s.id) && !NO_ES_ENTRENAMIENTO.includes(s.sesion.tipo) && s.fecha >= desde && s.fecha < lunes)
  const porSemana = new Map<string, Set<number>>()
  const porRatoSesiones = new Map<string, typeof hechas>()
  for (const s of hechas) {
    const dia = diaDeLaSemana(s.fecha)
    porSemana.set(lunesDe(s.fecha), (porSemana.get(lunesDe(s.fecha)) ?? new Set()).add(dia))
    const k = clave(dia, franja(s.sesion.horaInicio))
    porRatoSesiones.set(k, [...(porRatoSesiones.get(k) ?? []), s])
  }
  const porRato = new Map<string, Habito>()
  for (const [k, ss] of porRatoSesiones) {
    const veces = new Set(ss.map((s) => lunesDe(s.fecha))).size
    if (veces < vecesHabitual) continue
    const c = masRepetido(ss.map((s) => s.propuesta!.contexto!), (x) => `${x.compania}|${x.lugar}|${x.minutosDisponibles}`)
    porRato.set(k, { veces, contexto: { compania: c.compania, lugar: c.lugar, minutosDisponibles: c.minutosDisponibles } })
  }
  const semanas = [...porSemana.values()]
  const mediaDias = semanas.length >= semanasMinimas ? semanas.reduce((a, s) => a + s.size, 0) / semanas.length : null
  return { porRato, mediaDias }
}

// Cuántos días entrenas esta semana. Con un rango y sin historial, el mínimo: contar con días que luego no entrenas
// haría guardar carga para nada.
export function diasObjetivo(r: DiasSemana, mediaDias: number | null): number {
  const rango: Record<DiasSemana, [number, number]> = { '1': [1, 1], '2': [2, 2], '3-4': [3, 4], '5-6': [5, 6], todos: [7, 7] }
  const [min, max] = rango[r]
  return mediaDias === null ? min : Math.min(max, Math.max(min, Math.round(mediaDias)))
}

export interface RatoSupuesto {
  fecha: string
  franja: Franja
  contexto: EntradaSupuesta['contexto']
  aprendido: boolean   // sale de lo que sueles hacer (si no, repartido)
}

const ratosHabituales = (h: Habitos, fecha: string): { franja: Franja; habito: Habito }[] =>
  FRANJAS.flatMap((f) => {
    const habito = h.porRato.get(clave(diaDeLaSemana(fecha), f))
    return habito ? [{ franja: f, habito }] : []
  })

// Los ratos que la app supone que entrenarás después del que se genera, hasta el domingo: la otra franja de hoy si
// es habitual, y los días que faltan para tu número de días (primero los habituales, luego repartidos).
export function ratosSupuestos(d: DatosAtleta, e: EntradaSupuesta): RatoSupuesto[] {
  const respuesta = d.perfil.dias_semana
  if (!respuesta) return []
  const lunes = lunesDe(e.fecha)
  const domingo = sumarDias(lunes, 6)
  const sesionesSemana = d.sesiones.filter((s) => s.fecha >= lunes && s.fecha <= domingo && !NO_ES_ENTRENAMIENTO.includes(s.sesion.tipo))
  const conSesion = new Set(sesionesSemana.map((s) => s.fecha))
  conSesion.add(e.fecha)
  const h = habitos(d, e.fecha)
  const ratos: RatoSupuesto[] = []
  // Hoy por la tarde, si generas la mañana, es habitual, está libre y cabe después de lo que generas.
  if (franja(e.horaInicio) === 'manana' && HORA_FRANJA.manana * 60 + e.contexto.minutosDisponibles <= HORA_FRANJA.tarde * 60) {
    const tarde = h.porRato.get(clave(diaDeLaSemana(e.fecha), 'tarde'))
    const ocupada = sesionesSemana.some((s) => s.fecha === e.fecha && franja(s.sesion.horaInicio) === 'tarde')
    if (tarde && !ocupada) ratos.push({ fecha: e.fecha, franja: 'tarde', contexto: tarde.contexto, aprendido: true })
  }
  const quedan = diasObjetivo(respuesta, h.mediaDias) - conSesion.size
  if (quedan > 0) {
    const candidatos: string[] = []
    for (let f = sumarDias(e.fecha, 1); f <= domingo; f = sumarDias(f, 1)) {
      if (!conSesion.has(f) && f >= d.perfil.inicio_temporada && f <= d.perfil.objetivo_temporada) candidatos.push(f)
    }
    const vecesDia = (f: string): number => Math.max(0, ...ratosHabituales(h, f).map((r) => r.habito.veces))
    const aprendidos = candidatos.filter((f) => vecesDia(f) > 0).sort((a, b) => vecesDia(b) - vecesDia(a) || a.localeCompare(b)).slice(0, quedan)
    const resto = candidatos.filter((f) => !aprendidos.includes(f))
    const repartidos = [...resto.filter((_, i) => i % 2 === 0), ...resto.filter((_, i) => i % 2 === 1)].slice(0, quedan - aprendidos.length)
    for (const f of aprendidos) for (const r of ratosHabituales(h, f)) ratos.push({ fecha: f, franja: r.franja, contexto: r.habito.contexto, aprendido: true })
    for (const f of repartidos) ratos.push({ fecha: f, franja: franja(e.horaInicio), contexto: e.contexto, aprendido: false })
  }
  return ratos
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || FRANJAS.indexOf(a.franja) - FRANJAS.indexOf(b.franja))
    .slice(0, VALORES['P-67'].maxHuecos)
}

// Los huecos que se pasan al motor (P-67), con el material de casa del perfil. Sin respuesta en Yo, undefined (el motor
// decide día a día); con respuesta, una lista (vacía en el último rato de la semana, para que el plan aplique igual).
export function semanaSupuesta(d: DatosAtleta, e: EntradaSupuesta): Hueco[] | undefined {
  if (!d.perfil.dias_semana) return undefined
  return ratosSupuestos(d, e).map((x) => ({
    fecha: x.fecha,
    horaInicio: HORA_FRANJA[x.franja],
    contexto: { ...x.contexto, multipresaEnCasa: d.perfil.multipresa_en_casa },
  }))
}

const NOMBRE_DIA = ['el lunes', 'el martes', 'el miércoles', 'el jueves', 'el viernes', 'el sábado', 'el domingo']
const TEXTO_FRANJA: Record<Franja, string> = { manana: 'por la mañana', tarde: 'por la tarde' }
const lista = (xs: string[]): string => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)

// La línea de Semana: qué supone la app para el resto de esta semana (si generaras hoy).
export function lineaSemanaSupuesta(d: DatosAtleta, hoy: string, contexto: EntradaSupuesta['contexto'], horaInicio: number): string | null {
  if (!d.perfil.dias_semana) return 'Dime en Yo cuántos días sueles entrenar y repartiré mejor la carga de la semana.'
  const ratos = ratosSupuestos(d, { fecha: hoy, horaInicio, contexto })
  if (ratos.length === 0) return null
  const textos = ratos.map((x) => `${x.fecha === hoy ? 'hoy' : NOMBRE_DIA[diaDeLaSemana(x.fecha)]} ${TEXTO_FRANJA[x.franja]}`)
  const conHistorial = habitos(d, hoy).porRato.size > 0
  const porque = ratos.every((x) => x.aprendido)
    ? 'lo que sueles hacer'
    : ratos.some((x) => x.aprendido)
      ? 'lo que sueles hacer y, el resto, repartido en la semana'
      : conHistorial ? 'repartido en la semana' : 'repartido en la semana: aún no sé qué días sueles entrenar'
  return `Para repartir la carga, la app cuenta con que entrenarás también ${lista(textos)} (${porque}).`
}
