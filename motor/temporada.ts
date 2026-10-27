import { descargar, FASE_OBJETIVO, FASES } from './fases'
import type { AjusteCiclo2 } from './diagnostico'
import { VALORES } from './parametros'
import type { Fase, FaseId } from './propuesta-tipos'
import { diaNumero, fechaDesdeDia } from './tiempo'

export interface SemanaPlan {
  lunes: string                 // 'AAAA-MM-DD'
  ciclo: 1 | 2
  faseId: FaseId
  semanaDeFase: number          // 1..n
  descarga: boolean             // P-47 / P-48 (y la última semana del ciclo 2: afinado)
  reevaluar: boolean            // última semana de fase, salvo transición (P-26)
}

export interface Temporada {
  inicio: string
  objetivo: string              // lunes de la semana objetivo
  semanas: SemanaPlan[]
  refuerzoTecnica: boolean      // ciclo 2 con una sesión más de técnica por semana (diagnóstico)
}

// Ajuste del ciclo 2 que sale del diagnóstico (ajusteCiclo2). Las 14 semanas de fuerza + resistencia se reparten
// dentro de los rangos de P-31 sin cambiar la duración total de la temporada.
export interface OpcionesTemporada {
  ciclo2?: { fuerza: number; resistencia: number }
  refuerzoTecnica?: boolean
  ajuste?: AjusteCiclo2         // atajo: aplica a la vez el reparto y el refuerzo de técnica de ajusteCiclo2
}

interface Tramo {
  faseId: FaseId
  ciclo: 1 | 2
  semanas: number
  min: number
  max: number
}

// Plantilla de dos ciclos (48 semanas). Rangos: P-32 (base mínima 4), P-08 y P-31 (fuerza 4-10, resistencia 4-8);
// el rendimiento y la transición son decisiones de diseño. En la parte 2, el diagnóstico ajustará fuerza y
// resistencia del ciclo 2 dentro de sus rangos.
function plantilla(): Tramo[] {
  return [
    { faseId: 'base', ciclo: 1, semanas: 4, min: 4, max: 4 },
    { faseId: 'fuerza', ciclo: 1, semanas: 8, min: 8, max: 8 },
    { faseId: 'resistencia', ciclo: 1, semanas: 6, min: 6, max: 6 },
    { faseId: 'rendimiento', ciclo: 1, semanas: 4, min: 3, max: 6 },
    { faseId: 'transicion', ciclo: 1, semanas: 2, min: 1, max: 3 },
    { faseId: 'fuerza', ciclo: 2, semanas: 8, min: 8, max: 8 },
    { faseId: 'resistencia', ciclo: 2, semanas: 6, min: 6, max: 6 },
    { faseId: 'rendimiento', ciclo: 2, semanas: 10, min: 6, max: 12 },
  ]
}
// Si la fecha objetivo no deja exactamente 48 semanas, se ajusta por este orden: rendimiento final, transición
// y rendimiento de primavera.
const ORDEN_AJUSTE = [7, 4, 3] as const
// P-47: 1 semana de descarga de cada 4 para < 2 años. Solo cuentan las fases de carga.
const CADA_CUANTAS_DESCARGA = 4
const FASES_QUE_CUENTAN: readonly FaseId[] = ['fuerza', 'resistencia', 'rendimiento']
// Test a mitad de fase cuando la fase es larga, para no pasar de 10 semanas sin reevaluar (P-08) contando con la
// transición: rendimiento de más de 6 semanas, fuerza o resistencia de más de 8.
const MAX_SEMANAS_SIN_TEST = 6
const MAX_SEMANAS_FASE_SIN_TEST = 8
// La semana objetivo y la siguiente (el viaje del 7a) se tratan como rendimiento sin test ni descarga.
const SEMANAS_TRAS_OBJETIVO = 2

// 1970-01-01 fue jueves: el día 4 fue lunes.
const desdeLunes = (dia: number): number => (((dia - 4) % 7) + 7) % 7

export function planificarTemporada(inicio: string, objetivo: string, opcionesRecibidas: OpcionesTemporada = {}): Temporada {
  const opciones: OpcionesTemporada = opcionesRecibidas.ajuste
    ? {
        ciclo2: { fuerza: opcionesRecibidas.ajuste.fuerza, resistencia: opcionesRecibidas.ajuste.resistencia },
        refuerzoTecnica: opcionesRecibidas.ajuste.refuerzoTecnica,
      }
    : opcionesRecibidas
  const di = diaNumero(inicio)
  if (desdeLunes(di) !== 0) throw new Error(`El inicio de la temporada debe ser un lunes: ${inicio}`)
  const dObjetivo = diaNumero(objetivo)
  const lunesObjetivo = dObjetivo - desdeLunes(dObjetivo)
  const n = (lunesObjetivo - di) / 7
  const tramos = plantilla()
  const base = tramos.reduce((a, t) => a + t.semanas, 0)
  const minimo = tramos.reduce((a, t) => a + t.min, 0)
  const maximo = tramos.reduce((a, t) => a + t.max, 0)
  if (n < minimo || n > maximo) {
    throw new Error(
      `La fecha objetivo deja ${n} semanas desde el inicio; con dos ciclos caben entre ${minimo} y ${maximo}.`,
    )
  }
  if (opciones.ciclo2) {
    const { fuerza, resistencia } = opciones.ciclo2
    const r = VALORES['P-31']
    const fuerzaC2 = tramos[5]!
    const resistenciaC2 = tramos[6]!
    if (!Number.isInteger(fuerza) || fuerza < r.fuerzaMin || fuerza > r.fuerzaMax) {
      throw new Error(`La fuerza del ciclo 2 debe durar de ${r.fuerzaMin} a ${r.fuerzaMax} semanas (P-31): ${fuerza}`)
    }
    if (!Number.isInteger(resistencia) || resistencia < r.resistenciaMin || resistencia > r.resistenciaMax) {
      throw new Error(`La resistencia del ciclo 2 debe durar de ${r.resistenciaMin} a ${r.resistenciaMax} semanas (P-31): ${resistencia}`)
    }
    if (fuerza + resistencia !== fuerzaC2.semanas + resistenciaC2.semanas) {
      throw new Error(`Fuerza y resistencia del ciclo 2 deben sumar ${fuerzaC2.semanas + resistenciaC2.semanas} semanas: ${fuerza} + ${resistencia}`)
    }
    fuerzaC2.semanas = fuerzaC2.min = fuerzaC2.max = fuerza
    resistenciaC2.semanas = resistenciaC2.min = resistenciaC2.max = resistencia
  }
  let diferencia = n - base
  for (const i of ORDEN_AJUSTE) {
    const t = tramos[i]!
    const cambio = Math.max(t.min - t.semanas, Math.min(t.max - t.semanas, diferencia))
    t.semanas += cambio
    diferencia -= cambio
  }

  const semanas: SemanaPlan[] = []
  const contador: Record<1 | 2, number> = { 1: 0, 2: 0 }
  for (const t of tramos) {
    for (let k = 1; k <= t.semanas; k++) {
      let descarga = false
      if (FASES_QUE_CUENTAN.includes(t.faseId)) {
        contador[t.ciclo] += 1
        descarga = contador[t.ciclo] % CADA_CUANTAS_DESCARGA === 0
      }
      semanas.push({
        lunes: fechaDesdeDia(di + 7 * semanas.length),
        ciclo: t.ciclo,
        faseId: t.faseId,
        semanaDeFase: k,
        descarga,
        // Test al final de cada fase (P-26) y a mitad de los rendimientos largos para no pasar de 10 semanas sin
        // reevaluar (P-08). La base no: su test lo desbloquea P-32 (28 días y 6 sesiones), no el calendario.
        reevaluar:
          t.faseId !== 'transicion' && t.faseId !== 'base' &&
          (k === t.semanas || (t.semanas > (t.faseId === 'rendimiento' ? MAX_SEMANAS_SIN_TEST : MAX_SEMANAS_FASE_SIN_TEST) && k === Math.floor(t.semanas / 2))),
      })
    }
  }
  // Afinado: la última semana antes del objetivo es siempre de descarga y sin test máximo (hay que llegar fresco).
  const ultima = semanas[semanas.length - 1]!
  ultima.descarga = true
  ultima.reevaluar = false
  return { inicio, objetivo: fechaDesdeDia(lunesObjetivo), semanas, refuerzoTecnica: opciones.refuerzoTecnica ?? false }
}

export function semanaEnFecha(t: Temporada, fecha: string): SemanaPlan | undefined {
  const indice = Math.floor((diaNumero(fecha) - diaNumero(t.inicio)) / 7)
  return indice >= 0 ? t.semanas[indice] : undefined
}

// La fase de una fecha con la semana aplicada: descarga si toca y, en la semana de reevaluación, el test de
// dedos permitido (también si coincide con una descarga: es poco volumen y medir tras descargar es lo habitual).
export function faseEnFecha(t: Temporada, fecha: string): Fase {
  const s = semanaEnFecha(t, fecha)
  const desdeObjetivo = diaNumero(fecha) - diaNumero(t.objetivo)
  // Semana objetivo: solo pegues y cosas suaves; la siguiente, rendimiento normal sin test.
  if (!s && desdeObjetivo >= 0 && desdeObjetivo < 7) return FASE_OBJETIVO
  if (!s && desdeObjetivo >= 7 && desdeObjetivo < 7 * SEMANAS_TRAS_OBJETIVO) return FASES.rendimiento
  if (!s) throw new Error(`La fecha ${fecha} está fuera de la temporada (${t.inicio} a ${t.objetivo}).`)
  let fase = FASES[s.faseId]
  if (t.refuerzoTecnica && s.ciclo === 2 && fase.prioridad.includes('tecnica')) {
    fase = { ...fase, cupos: { ...fase.cupos, tecnica: (fase.cupos.tecnica ?? 0) + 1 } }
  }
  if (s.descarga) fase = descargar(fase)
  if (s.reevaluar) {
    fase = {
      ...fase,
      cupos: { ...fase.cupos, 'evaluacion-dedos': 1 },
      prioridad: ['evaluacion-dedos', ...fase.prioridad.filter((x) => x !== 'evaluacion-dedos')],
      prohibidos: fase.prohibidos.filter((x) => x !== 'evaluacion-dedos'),
      reevaluar: true,
    }
  }
  return fase
}
