import { describe, expect, it } from 'vitest'
import { ajusteCiclo2, diagnosticar, type IntentoLimite, type MotivoCaida } from './diagnostico'
import type { EvaluacionDedos } from './propuesta-tipos'
import { faseEnFecha, planificarTemporada } from './temporada'
import { diaNumero, fechaDesdeDia } from './tiempo'

const ev = (fecha: string, lastreKg: number, extra: Partial<EvaluacionDedos> = {}): EvaluacionDedos => ({
  fecha, pesoCorporalKg: 72, lastreKg, ...extra,
})
const HOY = '2027-03-10'
const haceDias = (n: number) => fechaDesdeDia(diaNumero(HOY) - n)
const caidas = (motivo: MotivoCaida, n: number, desdeHace = 1): IntentoLimite[] =>
  Array.from({ length: n }, (_, i) => ({ fecha: haceDias(desdeHace + i), encadenado: false, motivoCaida: motivo }))

describe('diagnosticar: progreso frente a la propia línea base (P-19: una medición no basta)', () => {
  it('sin evaluaciones no hay datos', () => {
    expect(diagnosticar([], [], HOY).progreso.fuerza).toEqual({ unidad: '%', mediciones: 0, tendencia: 'sin-datos' })
  })
  it('con 2 evaluaciones da el cambio pero no la tendencia', () => {
    const d = diagnosticar([ev('2027-01-19', 28), ev('2026-12-01', 20)], [], HOY)
    expect(d.progreso.fuerza.tendencia).toBe('sin-datos')
    expect(d.progreso.fuerza.cambio).toBeCloseTo(8.7, 1) // 92/72 → 100/72
    expect(d.progreso.fuerza.mediciones).toBe(2)
  })
  it('con 3 o más, «mejora» exige que las 2 últimas superen el 5 % frente a la primera', () => {
    expect(diagnosticar([ev('2026-12-01', 20), ev('2027-01-19', 26), ev('2027-03-02', 28)], [], HOY).progreso.fuerza.tendencia).toBe('mejora')
    // La penúltima solo +3,3 %: no confirma.
    expect(diagnosticar([ev('2026-12-01', 20), ev('2027-01-19', 23), ev('2027-03-02', 28)], [], HOY).progreso.fuerza.tendencia).toBe('sin-cambio')
    expect(diagnosticar([ev('2026-12-01', 20), ev('2027-01-19', 14), ev('2027-03-02', 12)], [], HOY).progreso.fuerza.tendencia).toBe('empeora')
  })
  it('la técnica (escala 1-7) se mide en puntos: mejora si las 2 últimas suben al menos 1 punto', () => {
    const d = diagnosticar(
      [ev('2026-12-01', 20, { tecnica: 3 }), ev('2027-01-19', 22, { tecnica: 4 }), ev('2027-03-02', 24, { tecnica: 4 })],
      [], HOY,
    )
    expect(d.progreso.tecnica).toMatchObject({ inicial: 3, actual: 4, cambio: 1, unidad: 'puntos', tendencia: 'mejora' })
    expect(d.explicaciones[0]!.motivo).toMatch(/\+1 puntos/)
  })
  it('la resistencia usa solo las evaluaciones que la midieron', () => {
    const d = diagnosticar(
      [ev('2026-12-01', 20, { resistenciaS: 80 }), ev('2027-01-19', 22), ev('2027-03-02', 24, { resistenciaS: 100 })],
      [], HOY,
    )
    expect(d.progreso.resistencia).toMatchObject({ inicial: 80, actual: 100, mediciones: 2, tendencia: 'sin-datos' })
  })
  it('ignora las evaluaciones posteriores a la fecha y rechaza dos el mismo día', () => {
    expect(diagnosticar([ev('2026-12-01', 20), ev('2027-04-01', 40)], [], HOY).progreso.fuerza.mediciones).toBe(1)
    expect(() => diagnosticar([ev('2026-12-01', 20), ev('2026-12-01', 25)], [], HOY)).toThrow(/mismo día/)
  })
  it('la explicación dice que una medición no basta y avisa de que los segundos son relativos al máximo del día', () => {
    const e = diagnosticar([], [], HOY).explicaciones[0]!
    expect(e.parametros).toEqual(['P-19', 'P-24', 'P-27'])
    expect(e.motivo).toMatch(/Una sola medición no basta/)
    expect(e.motivo).toMatch(/60 % del máximo de ese día/)
  })
})

describe('diagnosticar: orden de limitantes', () => {
  it('con menos de 10 caídas manda el orden de P-23, y la explicación declara el orden técnica/cabeza como diseño', () => {
    const d = diagnosticar([], caidas('bombeo', 9), HOY)
    expect(d.fuente).toBe('evidencia')
    expect(d.limitantes).toEqual(['fuerza-dedos', 'resistencia', 'tecnica', 'cabeza'])
    expect(d.explicaciones[1]!.motivo).toMatch(/decisión de diseño/)
  })
  it('con 10 caídas o más manda el registro, y los empates siguen P-23', () => {
    const d = diagnosticar([], [...caidas('bombeo', 6), ...caidas('tecnica-lectura', 6)], HOY)
    expect(d.fuente).toBe('caidas')
    expect(d.caidas).toEqual({ 'fuerza-dedos': 0, resistencia: 6, tecnica: 6, cabeza: 0 })
    expect(d.limitantes).toEqual(['resistencia', 'tecnica', 'fuerza-dedos', 'cabeza'])
  })
  it('la ventana es de 8 semanas exactas: cuenta lo de hace 55 días y no lo de hace 56', () => {
    const base = caidas('bombeo', 9, 1)
    expect(diagnosticar([], [...base, { fecha: haceDias(55), encadenado: false, motivoCaida: 'bombeo' }], HOY).fuente).toBe('caidas')
    expect(diagnosticar([], [...base, { fecha: haceDias(56), encadenado: false, motivoCaida: 'bombeo' }], HOY).fuente).toBe('evidencia')
    expect(diagnosticar([], [...base, { fecha: haceDias(-1), encadenado: false, motivoCaida: 'bombeo' }], HOY).fuente).toBe('evidencia')
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
  it('bombeo: 6 + 8; fuerza: 10 + 4; técnica: 8 + 6 con refuerzo; cabeza: 8 + 6', () => {
    expect(con('bombeo')).toMatchObject({ fuerza: 6, resistencia: 8, refuerzoTecnica: false })
    expect(con('paso-fuerza')).toMatchObject({ fuerza: 10, resistencia: 4, refuerzoTecnica: false })
    expect(con('tecnica-lectura')).toMatchObject({ fuerza: 8, resistencia: 6, refuerzoTecnica: true })
    expect(con('cabeza')).toMatchObject({ fuerza: 8, resistencia: 6, refuerzoTecnica: false })
  })
  it('sin registro suficiente, el orden de P-23 pone la fuerza primero', () => {
    expect(ajusteCiclo2(diagnosticar([], [], HOY))).toMatchObject({ fuerza: 10, resistencia: 4 })
  })
  it('las explicaciones citan P-31 y P-23, la de cabeza también P-62, y el refuerzo de técnica no promete de más', () => {
    expect(con('bombeo').explicacion.parametros).toEqual(['P-23', 'P-31'])
    expect(con('bombeo').explicacion.motivo).toMatch(/decisión de diseño/)
    expect(con('cabeza').explicacion.parametros).toEqual(['P-23', 'P-31', 'P-62'])
    expect(con('tecnica-lectura').explicacion.motivo).toMatch(/cuando hay hueco/)
  })
})

describe('temporada ajustada con el diagnóstico', () => {
  const ajuste = (motivo: MotivoCaida) => ajusteCiclo2(diagnosticar([], caidas(motivo, 12), HOY))

  it('acepta el ajuste directamente y reparte las 14 semanas del ciclo 2 sin mover el objetivo', () => {
    const t = planificarTemporada('2026-11-02', '2027-10-04', { ajuste: ajuste('bombeo') })
    const c2 = t.semanas.filter((s) => s.ciclo === 2)
    expect(c2.filter((s) => s.faseId === 'fuerza')).toHaveLength(6)
    expect(c2.filter((s) => s.faseId === 'resistencia')).toHaveLength(8)
    expect(t.semanas).toHaveLength(48)
    expect(t.objetivo).toBe('2027-10-04')
  })
  it.each(['bombeo', 'paso-fuerza', 'tecnica-lectura', 'cabeza'] as const)(
    '%s: nunca más de 10 semanas entre reevaluaciones (P-08) y descargas cada 4.ª semana de carga',
    (motivo) => {
      const t = planificarTemporada('2026-11-02', '2027-10-04', { ajuste: ajuste(motivo) })
      // El primer test lo desbloquea la base al empezar la fuerza del ciclo 1.
      const primeraFuerza = t.semanas.findIndex((s) => s.faseId === 'fuerza')
      const reev = [primeraFuerza, ...t.semanas.flatMap((s, i) => (s.reevaluar ? [i] : []))]
      for (let i = 1; i < reev.length; i++) expect(reev[i]! - reev[i - 1]!, motivo).toBeLessThanOrEqual(10)
      // Desde el último test hasta el objetivo tampoco pasan más de 10 semanas.
      expect(t.semanas.length - reev.at(-1)!).toBeLessThanOrEqual(10)
      for (const ciclo of [1, 2] as const) {
        const carga = t.semanas.filter((s) => s.ciclo === ciclo && ['fuerza', 'resistencia', 'rendimiento'].includes(s.faseId))
        carga.forEach((s, i) => {
          if (i !== carga.length - 1 || ciclo === 1) expect(s.descarga, `${ciclo}:${s.faseId}:${s.semanaDeFase}`).toBe((i + 1) % 4 === 0)
        })
      }
    },
  )
  it('con 10 semanas de fuerza hay test a mitad (semana 5) y al final', () => {
    const t = planificarTemporada('2026-11-02', '2027-10-04', { ciclo2: { fuerza: 10, resistencia: 4 } })
    const reev = t.semanas.filter((s) => s.ciclo === 2 && s.faseId === 'fuerza' && s.reevaluar).map((s) => s.semanaDeFase)
    expect(reev).toEqual([5, 10])
  })
  it('rechaza repartos fuera de P-31 o que cambian el total', () => {
    expect(() => planificarTemporada('2026-11-02', '2027-10-04', { ciclo2: { fuerza: 11, resistencia: 3 } })).toThrow(/P-31/)
    expect(() => planificarTemporada('2026-11-02', '2027-10-04', { ciclo2: { fuerza: 8, resistencia: 8 } })).toThrow(/sumar 14/)
  })
  it('el refuerzo de técnica añade un cupo de técnica solo en el ciclo 2', () => {
    const t = planificarTemporada('2026-11-02', '2027-10-04', { ajuste: ajuste('tecnica-lectura') })
    const lunes = (ciclo: 1 | 2) => t.semanas.find((s) => s.ciclo === ciclo && s.faseId === 'fuerza' && s.semanaDeFase === 1)!.lunes
    expect(faseEnFecha(t, lunes(2)).cupos.tecnica).toBe(2)
    expect(faseEnFecha(t, lunes(1)).cupos.tecnica).toBe(1)
  })
})
