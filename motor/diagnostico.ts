import { fuerzaRelativa, validarEvaluacion } from './evaluacion'
import { explicar, type Explicacion } from './explicacion'
import type { ParametroId } from './metadatos'
import { VALORES } from './parametros'
import type { EvaluacionDedos } from './propuesta-tipos'
import { diaNumero } from './tiempo'

export type Limitante = 'fuerza-dedos' | 'resistencia' | 'tecnica' | 'cabeza'
export type MotivoCaida = 'bombeo' | 'paso-fuerza' | 'tecnica-lectura' | 'cabeza'
// Respuesta a «¿Qué te frenó hoy?» al terminar una sesión al límite (P-69). «nada» = buen día.
export type Freno = MotivoCaida | 'nada'
export interface RespuestaFreno {
  fecha: string
  freno: Freno
}

export type Tendencia = 'mejora' | 'sin-cambio' | 'empeora' | 'sin-datos'

export interface Progreso {
  inicial?: number
  actual?: number
  cambio?: number                 // en % (fuerza, resistencia) o en puntos (técnica, escala 1-7)
  unidad: '%' | 'puntos'
  mediciones: number
  tendencia: Tendencia
}

export type FuenteDiagnostico = 'respuestas' | 'tests' | 'respuestas-y-tests' | 'evidencia'
export interface Fortaleza {
  cualidad: Limitante
  fuente: 'tests' | 'respuestas'
}

export interface Diagnostico {
  progreso: { fuerza: Progreso; resistencia: Progreso; tecnica: Progreso }
  limitantes: Limitante[]                 // de más a menos prioritario
  fuente: FuenteDiagnostico               // qué decidió el primero (P-69, P-70; si nada, P-23)
  frenos: Record<Limitante, number>       // respuestas de la ventana por limitante (sin «nada»)
  nada: number                            // respuestas «nada» de la ventana
  fortaleza: Fortaleza | null             // P-71
  explicaciones: Explicacion[]
}

export interface AjusteCiclo2 {
  fuerza: number
  resistencia: number
  refuerzoTecnica: boolean
  explicacion: Explicacion
}

// Decisiones de diseño (no están en parametros.md). Se desconoce el cambio mínimo detectable y una sola medición
// no basta (P-19): hacen falta al menos 3 tests y que los 2 últimos confirmen el cambio frente al primero, de al
// menos un 5 % (o 1 punto en la técnica, escala 1-7).
const UMBRAL_CAMBIO_PCT = 5
const UMBRAL_PUNTOS = 1
const MIN_MEDICIONES = 3
const { ventanaDias: VENTANA_DIAS, minRespuestas: MIN_RESPUESTAS, mayoriaPct: MAYORIA_PCT } = VALORES['P-69']

const LIMITANTE_DE: Record<MotivoCaida, Limitante> = {
  bombeo: 'resistencia',
  'paso-fuerza': 'fuerza-dedos',
  'tecnica-lectura': 'tecnica',
  cabeza: 'cabeza',
}
const FRENOS: readonly Freno[] = ['bombeo', 'paso-fuerza', 'tecnica-lectura', 'cabeza', 'nada']
const NOMBRE: Record<Limitante, string> = {
  'fuerza-dedos': 'la fuerza de dedos',
  resistencia: 'la resistencia',
  tecnica: 'la técnica o la lectura',
  cabeza: 'la cabeza',
}
const FISICOS: readonly Limitante[] = ['fuerza-dedos', 'resistencia']

function progreso(valores: readonly number[], unidad: '%' | 'puntos'): Progreso {
  const mediciones = valores.length
  if (mediciones === 0) return { unidad, mediciones, tendencia: 'sin-datos' }
  const inicial = valores[0]!
  const actual = valores[mediciones - 1]!
  const delta = (v: number): number => (unidad === '%' ? ((v - inicial) / inicial) * 100 : v - inicial)
  const cambio = mediciones >= 2 ? delta(actual) : undefined
  const base = { inicial, actual, ...(cambio !== undefined ? { cambio } : {}), unidad, mediciones }
  if (mediciones < MIN_MEDICIONES) return { ...base, tendencia: 'sin-datos' }
  const umbral = unidad === '%' ? UMBRAL_CAMBIO_PCT : UMBRAL_PUNTOS
  const ultimas = valores.slice(-2).map(delta)
  const tendencia: Tendencia = ultimas.every((x) => x >= umbral)
    ? 'mejora'
    : ultimas.every((x) => x <= -umbral)
      ? 'empeora'
      : 'sin-cambio'
  return { ...base, tendencia }
}

function validarRespuesta(r: RespuestaFreno): void {
  diaNumero(r.fecha)
  if (!FRENOS.includes(r.freno)) throw new Error(`respuesta del ${r.fecha}: freno desconocido: ${String(r.freno)}`)
}

// P-70: los tests solo opinan de lo físico, y solo si una de las dos cualidades mejora y la otra no.
function veredictoTests(fuerza: Progreso, resistencia: Progreso): Limitante | null {
  const noMejora = (p: Progreso) => p.tendencia === 'sin-cambio' || p.tendencia === 'empeora'
  if (fuerza.tendencia === 'mejora' && noMejora(resistencia)) return 'resistencia'
  if (resistencia.tendencia === 'mejora' && noMejora(fuerza)) return 'fuerza-dedos'
  return null
}

// P-71: solo con datos propios y nunca la misma que el limitante principal.
function fortalezaDe(
  progresos: readonly [Limitante, Progreso][], frenos: Record<Limitante, number>, n: number, principal: Limitante,
): Fortaleza | null {
  const conDatos = progresos.filter(([, p]) => p.tendencia !== 'sin-datos')
  const mejoran = conDatos.filter(([, p]) => p.tendencia === 'mejora')
  // Sin el limitante principal: si es lo que más mejora, la fortaleza es la siguiente que mejora.
  const candidatas = mejoran.filter(([l]) => l !== principal)
  if (candidatas.length > 0 && mejoran.length < conDatos.length) {
    const relativo = (p: Progreso): number => (p.unidad === '%' ? p.cambio! : (p.cambio! / p.inicial!) * 100)
    const [mejor] = candidatas.reduce((a, b) => (relativo(b[1]) > relativo(a[1]) ? b : a))
    return { cualidad: mejor, fuente: 'tests' }
  }
  if (n >= MIN_RESPUESTAS) {
    const ceros = (Object.keys(frenos) as Limitante[]).filter((l) => frenos[l] === 0)
    if (ceros.length === 1 && ceros[0] !== principal) return { cualidad: ceros[0]!, fuente: 'respuestas' }
  }
  return null
}

export function diagnosticar(evaluaciones: readonly EvaluacionDedos[], respuestas: readonly RespuestaFreno[], fecha: string): Diagnostico {
  const hoy = diaNumero(fecha)
  const fechas = new Set<string>()
  for (const e of evaluaciones) {
    validarEvaluacion(e)
    diaNumero(e.fecha)
    if (fechas.has(e.fecha)) throw new Error(`Hay dos evaluaciones el mismo día (${e.fecha}): deja solo una`)
    fechas.add(e.fecha)
  }
  for (const r of respuestas) validarRespuesta(r)

  // Solo cuenta lo que ya ha pasado; las evaluaciones, en orden de fecha.
  const pasadas = evaluaciones.filter((e) => diaNumero(e.fecha) <= hoy).sort((a, b) => diaNumero(a.fecha) - diaNumero(b.fecha))
  const fuerza = progreso(pasadas.map(fuerzaRelativa), '%')
  const resistencia = progreso(pasadas.flatMap((e) => (e.resistenciaS === undefined ? [] : [e.resistenciaS])), '%')
  const tecnica = progreso(pasadas.flatMap((e) => (e.tecnica === undefined ? [] : [e.tecnica])), 'puntos')

  const frenos: Record<Limitante, number> = { 'fuerza-dedos': 0, resistencia: 0, tecnica: 0, cabeza: 0 }
  let nada = 0
  for (const r of respuestas) {
    const d = diaNumero(r.fecha)
    if (d > hoy || d <= hoy - VENTANA_DIAS) continue
    if (r.freno === 'nada') nada += 1
    else frenos[LIMITANTE_DE[r.freno]] += 1
  }
  const n = Object.values(frenos).reduce((a, b) => a + b, 0)
  const orden = VALORES['P-23'].orden as readonly Limitante[]

  // P-69: candidato por respuestas (empates por el orden de P-23).
  let candidato: Limitante | null = null
  if (n >= MIN_RESPUESTAS) {
    const max = orden.reduce((a, b) => (frenos[b] > frenos[a] ? b : a))
    if (frenos[max] * 100 >= MAYORIA_PCT * n) candidato = max
  }
  const veredicto = veredictoTests(fuerza, resistencia)

  let principal: Limitante | null = null
  let fuente: FuenteDiagnostico = 'evidencia'
  if (candidato !== null) {
    const corrige = FISICOS.includes(candidato) && veredicto !== null && veredicto !== candidato
    principal = corrige ? veredicto : candidato
    fuente = corrige ? 'respuestas-y-tests' : 'respuestas'
  } else if (veredicto !== null) {
    principal = veredicto
    fuente = 'tests'
  }
  const limitantes = principal === null ? [...orden] : [principal, ...orden.filter((l) => l !== principal)]

  const cambio = (p: Progreso) => {
    if (p.cambio === undefined) return ''
    const signo = p.cambio > 0 ? '+' : ''
    const valor = p.unidad === '%' ? `${p.cambio.toFixed(1)} %` : `${p.cambio} ${Math.abs(p.cambio) === 1 ? 'punto' : 'puntos'}`
    return ` (${signo}${valor} con ${p.mediciones} tests)`
  }
  const estado = (p: Progreso) => (p.tendencia === 'sin-datos' ? 'sin datos suficientes' : p.tendencia)
  const pct = (l: Limitante) => Math.round((frenos[l] / n) * 100)
  const respuestasNoDeciden = n < MIN_RESPUESTAS
    ? `${n} de ${MIN_RESPUESTAS} respuestas`
    : `${n} respuestas, sin ningún motivo que llegue al ${MAYORIA_PCT} %`
  const lecturaTests = veredicto === 'resistencia'
    ? 'tu fuerza de dedos mejora y tu resistencia no'
    : 'tu resistencia mejora y tu fuerza de dedos no'
  const motivoLimitante = {
    respuestas: () =>
      `En las últimas 8 semanas respondiste ${n} veces qué te frenó (sin contar los días buenos); ${NOMBRE[principal!]} sale en el ${pct(principal!)} %, así que es tu limitante principal (P-69). Los empates siguen el orden de P-23.`,
    'respuestas-y-tests': () =>
      `Tus respuestas apuntaban a ${NOMBRE[candidato!]} (${pct(candidato!)} %), pero en tus tests ${lecturaTests}: manda el test y el limitante principal es ${NOMBRE[principal!]} (P-70).`,
    tests: () =>
      `Tus respuestas aún no deciden (${respuestasNoDeciden}), pero en tus tests ${lecturaTests}: el limitante principal es ${NOMBRE[principal!]} (P-70).`,
    evidencia: () =>
      `Tus datos aún no deciden (${respuestasNoDeciden} y sin un veredicto claro de los tests), así que el orden es el general de la evidencia: fuerza de dedos y resistencia intermitente (P-23); después técnica y cabeza (la táctica de P-23). Ningún estudio ordena técnica y cabeza entre sí; la técnica va antes porque con menos de 2 años es lo que más margen tiene.`,
  }[fuente]()
  const parametrosLimitante: Record<FuenteDiagnostico, ParametroId[]> = {
    respuestas: ['P-23', 'P-69'],
    'respuestas-y-tests': ['P-23', 'P-69', 'P-70'],
    tests: ['P-23', 'P-70'],
    evidencia: ['P-23', 'P-69'],
  }
  const explicaciones = [
    explicar(
      'diagnostico.progreso',
      ['P-19', 'P-24', 'P-27'],
      `Progreso frente a tu propia línea base: fuerza de dedos ${estado(fuerza)}${cambio(fuerza)}, resistencia ${estado(resistencia)}${cambio(resistencia)}, técnica ${estado(tecnica)}${cambio(tecnica)}. Una sola medición no basta (P-19): hacen falta ${MIN_MEDICIONES} tests y que los 2 últimos confirmen un cambio de al menos un ${UMBRAL_CAMBIO_PCT} % (1 punto en la técnica). No se conoce el cambio mínimo que detectan estos tests y sin dinamómetro su error ronda el 5-30 %, así que se pide confirmación para no tomar el ruido por progreso. Los segundos de resistencia se miden al 60 % del máximo de ese día: si tu fuerza sube, pueden quedarse igual aunque hayas mejorado.`,
    ),
    explicar('diagnostico.limitantes', parametrosLimitante[fuente], motivoLimitante),
  ]
  const fortaleza = fortalezaDe(
    [['fuerza-dedos', fuerza], ['resistencia', resistencia], ['tecnica', tecnica]], frenos, n, limitantes[0]!,
  )
  explicaciones.push(explicar(
    'diagnostico.fortaleza',
    ['P-71'],
    fortaleza === null
      ? 'Lo que mejor llevas solo sale con datos tuyos: una cualidad que mejora en tus tests cuando otra no, o el único motivo que nunca marcas con al menos 6 respuestas (P-71). Todavía no hay una diferencia clara.'
      : fortaleza.fuente === 'tests'
        ? `Lo que mejor llevas es ${NOMBRE[fortaleza.cualidad]}: mejora en tus tests mientras otra cualidad no (P-71).`
        : `Lo que mejor llevas es ${NOMBRE[fortaleza.cualidad]}: en ${n} respuestas nunca la has marcado como lo que te frenó (P-71).`,
  ))
  return { progreso: { fuerza, resistencia, tecnica }, limitantes, fuente, frenos, nada, fortaleza, explicaciones }
}

// Reparto de las 14 semanas de fuerza y resistencia del ciclo 2 dentro de los rangos de P-31.
const REPARTO: Record<Limitante, { fuerza: number; resistencia: number }> = {
  'fuerza-dedos': { fuerza: 10, resistencia: 4 },
  resistencia: { fuerza: 6, resistencia: 8 },
  tecnica: { fuerza: 8, resistencia: 6 },
  cabeza: { fuerza: 8, resistencia: 6 },
}

export function ajusteCiclo2(d: Diagnostico): AjusteCiclo2 {
  const principal = d.limitantes[0]!
  const { fuerza, resistencia } = REPARTO[principal]
  const refuerzoTecnica = principal === 'tecnica'
  const motivo = {
    'fuerza-dedos': 'Tu limitante principal es la fuerza de dedos: el ciclo 2 alarga la fuerza a 10 semanas y acorta la resistencia a 4.',
    resistencia: 'Tu limitante principal es la resistencia: el ciclo 2 alarga la resistencia a 8 semanas y acorta la fuerza a 6.',
    tecnica: 'Tu limitante principal es la técnica o la lectura: el ciclo 2 mantiene 8 + 6 semanas y añade un cupo de técnica por semana, que se usa cuando hay hueco (días suaves, descargas y rendimiento); no desplaza a las sesiones de fuerza.',
    cabeza: 'Tu limitante principal es la cabeza: el ciclo 2 mantiene 8 + 6 semanas; el trabajo mental va en los consejos (no hay protocolo con evidencia, P-62).',
  }[principal]
  return {
    fuerza,
    resistencia,
    refuerzoTecnica,
    explicacion: explicar(
      'diagnostico.ajuste-ciclo2',
      principal === 'cabeza' ? ['P-31', 'P-23', 'P-62'] : ['P-31', 'P-23'],
      `${motivo} Los rangos (fuerza 4-10, resistencia 4-8) son los de los ensayos (P-31); dentro de esos rangos, se dan más semanas a lo que más te limita.`,
    ),
  }
}
