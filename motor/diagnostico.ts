import { fuerzaRelativa, validarEvaluacion } from './evaluacion'
import { explicar, type Explicacion } from './explicacion'
import { VALORES } from './parametros'
import type { EvaluacionDedos } from './propuesta-tipos'
import { diaNumero } from './tiempo'

export type Limitante = 'fuerza-dedos' | 'resistencia' | 'tecnica' | 'cabeza'
export type MotivoCaida = 'bombeo' | 'paso-fuerza' | 'tecnica-lectura' | 'cabeza'

// Un intento al límite registrado (en vía, bloque o proyecto). Si no se encadenó, el usuario marca por qué cayó.
export interface IntentoLimite {
  fecha: string
  encadenado: boolean
  motivoCaida?: MotivoCaida
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

export interface Diagnostico {
  progreso: { fuerza: Progreso; resistencia: Progreso; tecnica: Progreso }
  limitantes: Limitante[]                 // de más a menos prioritario
  fuente: 'caidas' | 'evidencia'          // con al menos MIN_CAIDAS caídas recientes manda el registro; si no, P-23
  caidas: Record<Limitante, number>
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
// menos un 5 % (o 1 punto en la técnica, escala 1-7). El registro de caídas manda con al menos 10 caídas con
// motivo en las últimas 8 semanas.
const UMBRAL_CAMBIO_PCT = 5
const UMBRAL_PUNTOS = 1
const MIN_MEDICIONES = 3
const MIN_CAIDAS = 10
const VENTANA_CAIDAS_DIAS = 56

const LIMITANTE_DE: Record<MotivoCaida, Limitante> = {
  bombeo: 'resistencia',
  'paso-fuerza': 'fuerza-dedos',
  'tecnica-lectura': 'tecnica',
  cabeza: 'cabeza',
}
const MOTIVOS: readonly MotivoCaida[] = ['bombeo', 'paso-fuerza', 'tecnica-lectura', 'cabeza']

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

function validarIntento(i: IntentoLimite): void {
  diaNumero(i.fecha)
  if (typeof i.encadenado !== 'boolean') throw new Error(`intento del ${i.fecha}: encadenado debe ser booleano`)
  if (i.motivoCaida !== undefined && !MOTIVOS.includes(i.motivoCaida)) {
    throw new Error(`intento del ${i.fecha}: motivoCaida desconocido: ${String(i.motivoCaida)}`)
  }
  if (i.encadenado && i.motivoCaida !== undefined) throw new Error(`intento del ${i.fecha}: un encadenado no tiene motivo de caída`)
}

export function diagnosticar(evaluaciones: readonly EvaluacionDedos[], intentos: readonly IntentoLimite[], fecha: string): Diagnostico {
  const hoy = diaNumero(fecha)
  const fechas = new Set<string>()
  for (const e of evaluaciones) {
    validarEvaluacion(e)
    diaNumero(e.fecha)
    if (fechas.has(e.fecha)) throw new Error(`Hay dos evaluaciones el mismo día (${e.fecha}): deja solo una`)
    fechas.add(e.fecha)
  }
  for (const i of intentos) validarIntento(i)

  // Solo cuenta lo que ya ha pasado; las evaluaciones, en orden de fecha.
  const pasadas = evaluaciones.filter((e) => diaNumero(e.fecha) <= hoy).sort((a, b) => diaNumero(a.fecha) - diaNumero(b.fecha))
  const fuerza = progreso(pasadas.map(fuerzaRelativa), '%')
  const resistencia = progreso(pasadas.flatMap((e) => (e.resistenciaS === undefined ? [] : [e.resistenciaS])), '%')
  const tecnica = progreso(pasadas.flatMap((e) => (e.tecnica === undefined ? [] : [e.tecnica])), 'puntos')

  const caidas: Record<Limitante, number> = { 'fuerza-dedos': 0, resistencia: 0, tecnica: 0, cabeza: 0 }
  for (const i of intentos) {
    const d = diaNumero(i.fecha)
    if (i.motivoCaida && d <= hoy && d > hoy - VENTANA_CAIDAS_DIAS) caidas[LIMITANTE_DE[i.motivoCaida]] += 1
  }
  const totalCaidas = Object.values(caidas).reduce((a, b) => a + b, 0)
  const ordenEvidencia = VALORES['P-23'].orden as readonly Limitante[]
  const fuente = totalCaidas >= MIN_CAIDAS ? 'caidas' : 'evidencia'
  const limitantes =
    fuente === 'caidas'
      ? [...ordenEvidencia].sort((a, b) => caidas[b] - caidas[a] || ordenEvidencia.indexOf(a) - ordenEvidencia.indexOf(b))
      : [...ordenEvidencia]

  const cambio = (p: Progreso) =>
    p.cambio === undefined ? '' : ` (${p.cambio > 0 ? '+' : ''}${p.unidad === '%' ? `${p.cambio.toFixed(1)} %` : `${p.cambio} puntos`})`
  const explicaciones = [
    explicar(
      'diagnostico.progreso',
      ['P-19', 'P-24', 'P-27'],
      `Progreso frente a tu propia línea base: fuerza de dedos ${fuerza.tendencia}${cambio(fuerza)}, resistencia ${resistencia.tendencia}${cambio(resistencia)}, técnica ${tecnica.tendencia}${cambio(tecnica)}. Una sola medición no basta (P-19): hacen falta ${MIN_MEDICIONES} tests y que los 2 últimos confirmen un cambio de al menos un ${UMBRAL_CAMBIO_PCT} % (1 punto en la técnica); los umbrales son decisión de diseño. Los segundos de resistencia se miden al 60 % del máximo de ese día: si tu fuerza sube, pueden quedarse igual aunque hayas mejorado.`,
    ),
    fuente === 'caidas'
      ? explicar(
          'diagnostico.limitantes',
          ['P-23'],
          `Tus ${totalCaidas} caídas de las últimas 8 semanas: ${limitantes.map((l) => `${l} ${caidas[l]}`).join(', ')}. El orden sigue tus caídas; los empates, el orden de P-23.`,
        )
      : explicar(
          'diagnostico.limitantes',
          ['P-23'],
          `Con menos de ${MIN_CAIDAS} caídas registradas en 8 semanas (${totalCaidas}), el orden es el de la evidencia: fuerza de dedos y resistencia intermitente (P-23); después técnica y cabeza (la táctica de P-23), cuyo orden entre sí es decisión de diseño.`,
        ),
  ]
  return { progreso: { fuerza, resistencia, tecnica }, limitantes, fuente, caidas, explicaciones }
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
    resistencia: 'Tu limitante principal es la resistencia (te caes por bombeo): el ciclo 2 alarga la resistencia a 8 semanas y acorta la fuerza a 6.',
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
      `${motivo} Los rangos (fuerza 4-10, resistencia 4-8) son los de los ensayos (P-31); el reparto concreto es decisión de diseño.`,
    ),
  }
}
