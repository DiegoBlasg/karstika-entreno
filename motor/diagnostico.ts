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
  cambioPct?: number
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

// Decisiones de diseño (no están en parametros.md): se desconoce el cambio mínimo detectable (P-19), así que un
// cambio de menos del 5 % se trata como «sin cambio»; el registro de caídas manda con al menos 10 caídas con motivo
// en las últimas 8 semanas.
const UMBRAL_CAMBIO_PCT = 5
const MIN_CAIDAS = 10
const VENTANA_CAIDAS_DIAS = 56

const LIMITANTE_DE: Record<MotivoCaida, Limitante> = {
  bombeo: 'resistencia',
  'paso-fuerza': 'fuerza-dedos',
  'tecnica-lectura': 'tecnica',
  cabeza: 'cabeza',
}
const MOTIVOS: readonly MotivoCaida[] = ['bombeo', 'paso-fuerza', 'tecnica-lectura', 'cabeza']

function progreso(valores: readonly number[]): Progreso {
  if (valores.length === 0) return { tendencia: 'sin-datos' }
  const inicial = valores[0]!
  const actual = valores[valores.length - 1]!
  if (valores.length < 2) return { inicial, actual, tendencia: 'sin-datos' }
  const cambioPct = ((actual - inicial) / inicial) * 100
  const tendencia: Tendencia =
    Math.abs(cambioPct) < UMBRAL_CAMBIO_PCT ? 'sin-cambio' : cambioPct > 0 ? 'mejora' : 'empeora'
  return { inicial, actual, cambioPct, tendencia }
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
  for (const e of evaluaciones) {
    validarEvaluacion(e)
    diaNumero(e.fecha)
  }
  for (const i of intentos) validarIntento(i)

  // Solo cuenta lo que ya ha pasado; las evaluaciones, en orden de fecha.
  const pasadas = evaluaciones.filter((e) => diaNumero(e.fecha) <= hoy).sort((a, b) => diaNumero(a.fecha) - diaNumero(b.fecha))
  const fuerza = progreso(pasadas.map(fuerzaRelativa))
  const resistencia = progreso(pasadas.flatMap((e) => (e.resistenciaS === undefined ? [] : [e.resistenciaS])))
  const tecnica = progreso(pasadas.flatMap((e) => (e.tecnica === undefined ? [] : [e.tecnica])))

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

  const pct = (x?: number) => (x === undefined ? '' : ` (${x > 0 ? '+' : ''}${x.toFixed(1)} %)`)
  const explicaciones = [
    explicar(
      'diagnostico.progreso',
      ['P-19', 'P-24', 'P-27'],
      `Progreso frente a tu propia línea base: fuerza de dedos ${fuerza.tendencia}${pct(fuerza.cambioPct)}, resistencia ${resistencia.tendencia}${pct(resistencia.cambioPct)}, técnica ${tecnica.tendencia}${pct(tecnica.cambioPct)}. Un cambio de menos del ${UMBRAL_CAMBIO_PCT} % se trata como «sin cambio» porque el cambio mínimo detectable es desconocido (decisión de diseño).`,
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
          `Con menos de ${MIN_CAIDAS} caídas registradas en 8 semanas (${totalCaidas}), el orden es el de la evidencia: fuerza de dedos, resistencia intermitente y después técnica y cabeza (P-23).`,
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
    tecnica: 'Tu limitante principal es la técnica o la lectura: el ciclo 2 mantiene 8 + 6 semanas y añade una sesión de técnica por semana.',
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
