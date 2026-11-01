// La semana que la app supone al generar un entreno (P-74): cuántos días más entrenarás esta semana (lo que dices en
// Yo y lo que sueles hacer) y cuáles, para que el motor reparta la carga (P-67). Puro.
import { VALORES, type Compania, type Hueco, type Lugar } from '../../motor'
import { lunesDe, sumarDias } from '../fecha'
import { franja, HORA_FRANJA, type Franja } from './agenda'
import type { DatosAtleta, DiasSemana } from './filas'

export interface EntradaSupuesta {
  fecha: string
  horaInicio: number
  contexto: { compania: Compania; lugar: Lugar; minutosDisponibles: number }
}

interface Habito {
  veces: number                   // semanas (de las del historial) con sesión ese día de la semana
  franja: Franja
  contexto: EntradaSupuesta['contexto']
}

export interface Habitos {
  porDia: Map<number, Habito>     // 0 = lunes … 6 = domingo
  mediaDias: number | null        // días con sesión por semana; null con menos semanas de historial de las necesarias
}

const diaDeLaSemana = (fecha: string): number => (new Date(`${fecha}T12:00:00Z`).getUTCDay() + 6) % 7
const masRepetido = <T>(xs: readonly T[], clave: (x: T) => string): T => {
  const cuenta = new Map<string, { x: T; n: number }>()
  for (const x of xs) {
    const k = clave(x)
    cuenta.set(k, { x, n: (cuenta.get(k)?.n ?? 0) + 1 })
  }
  return [...cuenta.values()].sort((a, b) => b.n - a.n)[0]!.x
}

// Lo que haces de verdad: las sesiones generadas y registradas de las semanas anteriores a la de `fecha`.
export function habitos(d: DatosAtleta, fecha: string): Habitos {
  const { semanasHistorial, semanasMinimas } = VALORES['P-74']
  const lunes = lunesDe(fecha)
  const desde = sumarDias(lunes, -7 * semanasHistorial)
  const registradas = new Set(d.registros.map((r) => r.sesion_id))
  const hechas = d.sesiones.filter((s) => s.propuesta?.contexto && registradas.has(s.id) && s.fecha >= desde && s.fecha < lunes)
  const porSemana = new Map<string, Set<number>>()
  const porDiaSesiones = new Map<number, typeof hechas>()
  for (const s of hechas) {
    const dia = diaDeLaSemana(s.fecha)
    const semana = lunesDe(s.fecha)
    porSemana.set(semana, (porSemana.get(semana) ?? new Set()).add(dia))
    porDiaSesiones.set(dia, [...(porDiaSesiones.get(dia) ?? []), s])
  }
  const porDia = new Map<number, Habito>()
  for (const [dia, ss] of porDiaSesiones) {
    const semanas = new Set(ss.map((s) => lunesDe(s.fecha))).size
    const f = masRepetido(ss.map((s) => franja(s.sesion.horaInicio)), (x) => x)
    const c = masRepetido(ss.map((s) => s.propuesta!.contexto!), (x) => `${x.compania}|${x.lugar}|${x.minutosDisponibles}`)
    porDia.set(dia, { veces: semanas, franja: f, contexto: { compania: c.compania, lugar: c.lugar, minutosDisponibles: c.minutosDisponibles } })
  }
  const semanasConSesion = [...porSemana.values()]
  const mediaDias = semanasConSesion.length >= semanasMinimas
    ? semanasConSesion.reduce((a, s) => a + s.size, 0) / semanasConSesion.length
    : null
  return { porDia, mediaDias }
}

// Cuántos días entrenas esta semana. Con un rango y sin historial, el mínimo: contar con días que luego no entrenas
// haría guardar carga para nada.
export function diasObjetivo(r: DiasSemana, mediaDias: number | null): number {
  const rango: Record<DiasSemana, [number, number]> = { '1': [1, 1], '2': [2, 2], '3-4': [3, 4], '5-6': [5, 6], todos: [7, 7] }
  const [min, max] = rango[r]
  return mediaDias === null ? min : Math.min(max, Math.max(min, Math.round(mediaDias)))
}

export interface DiaSupuesto {
  fecha: string
  franja: Franja
  contexto: EntradaSupuesta['contexto']
  aprendido: boolean   // sale de lo que sueles hacer (si no, repartido)
}

// Los días que la app supone que entrenarás después del que se genera, hasta el domingo.
export function diasSupuestos(d: DatosAtleta, e: EntradaSupuesta): DiaSupuesto[] {
  const respuesta = d.perfil.dias_semana
  if (!respuesta) return []
  const domingo = sumarDias(lunesDe(e.fecha), 6)
  const conSesion = new Set(d.sesiones.filter((s) => s.fecha >= lunesDe(e.fecha) && s.fecha <= domingo && s.sesion.tipo !== 'descanso').map((s) => s.fecha))
  conSesion.add(e.fecha)
  const h = habitos(d, e.fecha)
  const quedan = diasObjetivo(respuesta, h.mediaDias) - conSesion.size
  if (quedan <= 0) return []
  const candidatos: string[] = []
  for (let f = sumarDias(e.fecha, 1); f <= domingo; f = sumarDias(f, 1)) {
    if (!conSesion.has(f) && f >= d.perfil.inicio_temporada && f <= d.perfil.objetivo_temporada) candidatos.push(f)
  }
  // Primero los días que sueles entrenar (más semanas, y a igualdad el más cercano); si faltan, repartidos: uno sí y
  // uno no desde el siguiente y, si no llega, los que queden en orden.
  const aprendidos = candidatos
    .filter((f) => (h.porDia.get(diaDeLaSemana(f))?.veces ?? 0) > 0)
    .sort((a, b) => h.porDia.get(diaDeLaSemana(b))!.veces - h.porDia.get(diaDeLaSemana(a))!.veces || a.localeCompare(b))
    .slice(0, quedan)
  const resto = candidatos.filter((f) => !aprendidos.includes(f))
  const repartidos = [...resto.filter((_, i) => i % 2 === 0), ...resto.filter((_, i) => i % 2 === 1)].slice(0, quedan - aprendidos.length)
  const elegidos = [...aprendidos, ...repartidos].sort().slice(0, VALORES['P-67'].maxHuecos)
  return elegidos.map((fecha) => {
    const habito = aprendidos.includes(fecha) ? h.porDia.get(diaDeLaSemana(fecha)) : undefined
    return habito
      ? { fecha, franja: habito.franja, contexto: habito.contexto, aprendido: true }
      : { fecha, franja: franja(e.horaInicio), contexto: e.contexto, aprendido: false }
  })
}

// Los huecos que se pasan al motor (P-67), con el material de casa del perfil.
export function semanaSupuesta(d: DatosAtleta, e: EntradaSupuesta): Hueco[] {
  return diasSupuestos(d, e).map((x) => ({
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
  const dias = diasSupuestos(d, { fecha: hoy, horaInicio, contexto })
  if (dias.length === 0) return null
  const textos = dias.map((x) => `${NOMBRE_DIA[diaDeLaSemana(x.fecha)]} ${TEXTO_FRANJA[x.franja]}`)
  const porque = dias.every((x) => x.aprendido)
    ? 'lo que sueles hacer'
    : dias.some((x) => x.aprendido)
      ? 'lo que sueles hacer y, el resto, repartido en la semana'
      : 'repartidos en la semana: aún no sé qué días sueles entrenar'
  return `Para repartir la carga, la app cuenta con que entrenarás también ${lista(textos)} (${porque}).`
}
