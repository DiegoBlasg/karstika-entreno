import { describe, expect, it } from 'vitest'
import { ajusteCiclo2, diagnosticar, type IntentoLimite, type MotivoCaida } from './diagnostico'
import type { EvaluacionDedos } from './propuesta-tipos'
import { faseEnFecha, planificarTemporada } from './temporada'

const ev = (fecha: string, lastreKg: number, extra: Partial<EvaluacionDedos> = {}): EvaluacionDedos => ({
  fecha, pesoCorporalKg: 72, lastreKg, ...extra,
})
const caidas = (motivo: MotivoCaida, n: number, desde = '2027-02-01'): IntentoLimite[] =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(2027, 1, 1 + i)).toISOString().slice(0, 10)
    return { fecha: desde === '2027-02-01' ? d : desde, encadenado: false, motivoCaida: motivo }
  })
const HOY = '2027-03-10'

describe('diagnosticar: progreso frente a la propia línea base', () => {
  it('sin evaluaciones no hay datos', () => {
    const d = diagnosticar([], [], HOY)
    expect(d.progreso.fuerza).toEqual({ tendencia: 'sin-datos' })
  })
  it('con una sola evaluación hay valor pero no tendencia', () => {
    const d = diagnosticar([ev('2026-12-01', 20)], [], HOY)
    expect(d.progreso.fuerza.tendencia).toBe('sin-datos')
    expect(d.progreso.fuerza.actual).toBeCloseTo(127.78, 1)
  })
  it('compara la primera y la última por fecha, con el umbral del 5 %', () => {
    // 92/72 = 127,8 % → 100/72 = 138,9 %: +8,7 %.
    const d = diagnosticar([ev('2027-01-19', 28), ev('2026-12-01', 20)], [], HOY)
    expect(d.progreso.fuerza.tendencia).toBe('mejora')
    expect(d.progreso.fuerza.cambioPct).toBeCloseTo(8.7, 1)
    // +3 kg sobre 92: +3,3 % → sin cambio.
    expect(diagnosticar([ev('2026-12-01', 20), ev('2027-01-19', 23)], [], HOY).progreso.fuerza.tendencia).toBe('sin-cambio')
    expect(diagnosticar([ev('2026-12-01', 20), ev('2027-01-19', 10)], [], HOY).progreso.fuerza.tendencia).toBe('empeora')
  })
  it('la resistencia y la técnica usan solo las evaluaciones que las midieron', () => {
    const d = diagnosticar(
      [ev('2026-12-01', 20, { resistenciaS: 80, tecnica: 3 }), ev('2027-01-19', 22), ev('2027-03-02', 24, { resistenciaS: 100, tecnica: 4 })],
      [], HOY,
    )
    expect(d.progreso.resistencia).toMatchObject({ inicial: 80, actual: 100, tendencia: 'mejora' })
    expect(d.progreso.tecnica).toMatchObject({ inicial: 3, actual: 4, tendencia: 'mejora' })
  })
  it('ignora las evaluaciones posteriores a la fecha del diagnóstico', () => {
    const d = diagnosticar([ev('2026-12-01', 20), ev('2027-04-01', 40)], [], HOY)
    expect(d.progreso.fuerza.tendencia).toBe('sin-datos')
  })
})

describe('diagnosticar: orden de limitantes', () => {
  it('con menos de 10 caídas manda el orden de P-23', () => {
    const d = diagnosticar([], caidas('bombeo', 9), HOY)
    expect(d.fuente).toBe('evidencia')
    expect(d.limitantes).toEqual(['fuerza-dedos', 'resistencia', 'tecnica', 'cabeza'])
    expect(d.explicaciones[1]!.parametros).toEqual(['P-23'])
  })
  it('con 10 caídas o más manda el registro, y los empates siguen P-23', () => {
    const d = diagnosticar([], [...caidas('bombeo', 6), ...caidas('tecnica-lectura', 6)], HOY)
    expect(d.fuente).toBe('caidas')
    expect(d.caidas).toEqual({ 'fuerza-dedos': 0, resistencia: 6, tecnica: 6, cabeza: 0 })
    expect(d.limitantes).toEqual(['resistencia', 'tecnica', 'fuerza-dedos', 'cabeza'])
  })
  it('solo cuentan las caídas de las últimas 8 semanas, y nunca los encadenados', () => {
    const viejas = caidas('cabeza', 12, '2026-12-01')
    const encadenados: IntentoLimite[] = Array.from({ length: 12 }, () => ({ fecha: '2027-03-01', encadenado: true }))
    const d = diagnosticar([], [...viejas, ...encadenados], HOY)
    expect(d.fuente).toBe('evidencia')
    expect(d.caidas.cabeza).toBe(0)
  })
  it('rechaza intentos mal formados', () => {
    expect(() => diagnosticar([], [{ fecha: '2027-03-01', encadenado: true, motivoCaida: 'bombeo' }], HOY)).toThrow(/encadenado/)
    expect(() => diagnosticar([], [{ fecha: '2027-03-01', encadenado: false, motivoCaida: 'sueño' as never }], HOY)).toThrow(/motivoCaida/)
    expect(() => diagnosticar([], [{ fecha: '2027-02-30', encadenado: false }], HOY)).toThrow()
  })
  it('es determinista y no muta sus entradas', () => {
    const evs = [ev('2027-01-19', 28), ev('2026-12-01', 20)]
    const ints = [...caidas('bombeo', 6), ...caidas('paso-fuerza', 5)]
    const antes = structuredClone({ evs, ints })
    expect(diagnosticar(evs, ints, HOY)).toEqual(diagnosticar(evs, ints, HOY))
    expect({ evs, ints }).toEqual(antes)
  })
})

describe('ajusteCiclo2', () => {
  const con = (motivo: MotivoCaida) => ajusteCiclo2(diagnosticar([], caidas(motivo, 12), HOY))
  it('bombeo: más resistencia (6 + 8); fuerza: más fuerza (10 + 4); técnica: 8 + 6 con refuerzo; cabeza: 8 + 6', () => {
    expect(con('bombeo')).toMatchObject({ fuerza: 6, resistencia: 8, refuerzoTecnica: false })
    expect(con('paso-fuerza')).toMatchObject({ fuerza: 10, resistencia: 4, refuerzoTecnica: false })
    expect(con('tecnica-lectura')).toMatchObject({ fuerza: 8, resistencia: 6, refuerzoTecnica: true })
    expect(con('cabeza')).toMatchObject({ fuerza: 8, resistencia: 6, refuerzoTecnica: false })
  })
  it('sin registro suficiente, el orden de P-23 pone la fuerza primero', () => {
    expect(ajusteCiclo2(diagnosticar([], [], HOY))).toMatchObject({ fuerza: 10, resistencia: 4 })
  })
  it('explica el ajuste con P-31 y lo declara decisión de diseño en el reparto', () => {
    const a = con('bombeo')
    expect(a.explicacion.parametros).toEqual(['P-23', 'P-31'])
    expect(a.explicacion.motivo).toMatch(/decisión de diseño/)
  })
})

describe('temporada ajustada con el diagnóstico', () => {
  it('reparte las 14 semanas del ciclo 2 y mantiene la fecha objetivo', () => {
    const a = con12('bombeo')
    const t = planificarTemporada('2026-11-02', '2027-10-04', { ciclo2: { fuerza: a.fuerza, resistencia: a.resistencia } })
    const c2 = t.semanas.filter((s) => s.ciclo === 2)
    expect(c2.filter((s) => s.faseId === 'fuerza')).toHaveLength(6)
    expect(c2.filter((s) => s.faseId === 'resistencia')).toHaveLength(8)
    expect(t.semanas).toHaveLength(48)
  })
  it('rechaza repartos fuera de P-31 o que cambian el total', () => {
    expect(() => planificarTemporada('2026-11-02', '2027-10-04', { ciclo2: { fuerza: 11, resistencia: 3 } })).toThrow(/P-31/)
    expect(() => planificarTemporada('2026-11-02', '2027-10-04', { ciclo2: { fuerza: 8, resistencia: 8 } })).toThrow(/sumar 14/)
  })
  it('el refuerzo de técnica añade una sesión de técnica por semana solo en el ciclo 2', () => {
    const t = planificarTemporada('2026-11-02', '2027-10-04', { refuerzoTecnica: true })
    const lunes = (ciclo: 1 | 2) => t.semanas.find((s) => s.ciclo === ciclo && s.faseId === 'fuerza' && s.semanaDeFase === 1)!.lunes
    expect(faseEnFecha(t, lunes(2)).cupos.tecnica).toBe(2)
    expect(faseEnFecha(t, lunes(1)).cupos.tecnica).toBe(1)
  })
})

function con12(motivo: MotivoCaida) {
  return ajusteCiclo2(diagnosticar([], caidas(motivo, 12), HOY))
}
