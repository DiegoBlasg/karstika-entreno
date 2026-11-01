import { describe, expect, it } from 'vitest'
import { ajusteCiclo2, diagnosticar, type Freno, type MotivoCaida, type RespuestaFreno } from './diagnostico'
import type { EvaluacionDedos } from './propuesta-tipos'
import { faseEnFecha, planificarTemporada } from './temporada'
import { diaNumero, fechaDesdeDia } from './tiempo'

const ev = (fecha: string, lastreKg: number, extra: Partial<EvaluacionDedos> = {}): EvaluacionDedos => ({
  fecha, pesoCorporalKg: 72, lastreKg, ...extra,
})
const HOY = '2027-03-10'
const haceDias = (n: number) => fechaDesdeDia(diaNumero(HOY) - n)
const frenos = (freno: Freno, n: number, desdeHace = 1): RespuestaFreno[] =>
  Array.from({ length: n }, (_, i) => ({ fecha: haceDias(desdeHace + i), freno }))
// Tres tests: la fuerza mejora (+11 % y +15 %) y la resistencia no (80 → 81 → 80 s).
const fuerzaSubeResistenciaNo = [
  ev('2026-12-01', 20, { colgado30S: 80 }), ev('2027-01-19', 30, { colgado30S: 81 }), ev('2027-03-02', 34, { colgado30S: 80 }),
]
// Tres tests: la resistencia (colgado) mejora (80 → 105 → 120 s, más del 25 %) y la fuerza no (20 → 20,5 → 21 kg: < 10 %).
const resistenciaSubeFuerzaNo = [
  ev('2026-12-01', 20, { colgado30S: 80 }), ev('2027-01-19', 20.5, { colgado30S: 105 }), ev('2027-03-02', 21, { colgado30S: 120 }),
]

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
  it('con 3 o más, «mejora» exige que las 2 últimas superen el 10 % frente a la primera (P-19)', () => {
    expect(diagnosticar([ev('2026-12-01', 20), ev('2027-01-19', 30), ev('2027-03-02', 34)], [], HOY).progreso.fuerza.tendencia).toBe('mejora')
    // La penúltima solo +6,5 %: no confirma.
    expect(diagnosticar([ev('2026-12-01', 20), ev('2027-01-19', 26), ev('2027-03-02', 34)], [], HOY).progreso.fuerza.tendencia).toBe('sin-cambio')
    expect(diagnosticar([ev('2026-12-01', 20), ev('2027-01-19', 10), ev('2027-03-02', 8)], [], HOY).progreso.fuerza.tendencia).toBe('empeora')
  })
  it('la técnica (escala 1-7) se mide en puntos: mejora si las 2 últimas suben al menos 1 punto', () => {
    const d = diagnosticar(
      [ev('2026-12-01', 20, { tecnica: 3 }), ev('2027-01-19', 22, { tecnica: 4 }), ev('2027-03-02', 24, { tecnica: 4 })],
      [], HOY,
    )
    expect(d.progreso.tecnica).toMatchObject({ inicial: 3, actual: 4, cambio: 1, unidad: 'puntos', tendencia: 'mejora' })
    expect(d.explicaciones[0]!.motivo).toMatch(/\+1 punto con 3 tests/)
  })
  it('la resistencia usa solo las evaluaciones que la midieron', () => {
    const d = diagnosticar(
      [ev('2026-12-01', 20, { colgado30S: 80 }), ev('2027-01-19', 22), ev('2027-03-02', 24, { colgado30S: 100 })],
      [], HOY,
    )
    expect(d.progreso.resistencia).toMatchObject({ inicial: 80, actual: 100, mediciones: 2, tendencia: 'sin-datos' })
  })
  it('ignora las evaluaciones posteriores a la fecha y rechaza dos el mismo día', () => {
    expect(diagnosticar([ev('2026-12-01', 20), ev('2027-04-01', 40)], [], HOY).progreso.fuerza.mediciones).toBe(1)
    expect(() => diagnosticar([ev('2026-12-01', 20), ev('2026-12-01', 25)], [], HOY)).toThrow(/mismo día/)
  })
  it('la explicación dice que una medición no basta, da los márgenes por prueba y que la resistencia es el colgado', () => {
    const e = diagnosticar([], [], HOY).explicaciones[0]!
    expect(e.parametros).toEqual(['P-19', 'P-24', 'P-27'])
    expect(e.motivo).toMatch(/Una sola medición no basta/)
    expect(e.motivo).toMatch(/10 % en fuerza, un 25 % en el colgado/)
    expect(e.motivo).toMatch(/colgado en 30 mm a peso corporal/)
  })
})

describe('diagnosticar: limitante principal (P-69, P-70, P-23)', () => {
  it('sin respuestas ni tests manda P-23 y lo explica como orden general', () => {
    const d = diagnosticar([], [], HOY)
    expect(d.fuente).toBe('evidencia')
    expect(d.limitantes).toEqual(['fuerza-dedos', 'resistencia', 'tecnica', 'cabeza'])
    expect(d.explicaciones[1]!.parametros).toEqual(['P-23', 'P-69'])
    expect(d.explicaciones[1]!.motivo).toMatch(/Ningún estudio ordena técnica y cabeza entre sí/)
  })
  it('con 6 respuestas y mayoría ≥ 40 % manda la respuesta', () => {
    const d = diagnosticar([], [...frenos('bombeo', 3), ...frenos('tecnica-lectura', 2, 10), ...frenos('cabeza', 1, 20)], HOY)
    expect(d.fuente).toBe('respuestas')
    expect(d.frenos).toEqual({ 'fuerza-dedos': 0, resistencia: 3, tecnica: 2, cabeza: 1 })
    expect(d.limitantes).toEqual(['resistencia', 'fuerza-dedos', 'tecnica', 'cabeza'])
    expect(d.explicaciones[1]!.motivo).toMatch(/la resistencia sale en el 50 %/)
  })
  it('con 5 respuestas no basta; «nada» no cuenta para el mínimo', () => {
    expect(diagnosticar([], frenos('cabeza', 5), HOY).fuente).toBe('evidencia')
    const d = diagnosticar([], [...frenos('cabeza', 5), ...frenos('nada', 4, 10)], HOY)
    expect(d.fuente).toBe('evidencia')
    expect(d.nada).toBe(4)
  })
  it('sin mayoría del 40 % no hay candidato por respuestas, y la explicación lo dice así', () => {
    // 7 respuestas: 2 + 2 + 2 + 1 → el máximo es 28,6 %.
    const r = [...frenos('bombeo', 2), ...frenos('paso-fuerza', 2, 5), ...frenos('tecnica-lectura', 2, 10), ...frenos('cabeza', 1, 15)]
    const d = diagnosticar([], r, HOY)
    expect(d.fuente).toBe('evidencia')
    expect(d.explicaciones[1]!.motivo).toMatch(/7 respuestas, sin ningún motivo que llegue al 40 %/)
    expect(diagnosticar([], frenos('cabeza', 4), HOY).explicaciones[1]!.motivo).toMatch(/4 de 6 respuestas/)
  })
  it('los empates de mayoría siguen P-23', () => {
    const d = diagnosticar([], [...frenos('cabeza', 3), ...frenos('tecnica-lectura', 3, 10)], HOY)
    expect(d.limitantes[0]).toBe('tecnica')
  })
  it('la ventana es de 56 días exactos: cuenta hace 55 y no hace 56 ni el futuro', () => {
    const base = frenos('cabeza', 5, 1)
    expect(diagnosticar([], [...base, { fecha: haceDias(55), freno: 'cabeza' }], HOY).fuente).toBe('respuestas')
    expect(diagnosticar([], [...base, { fecha: haceDias(56), freno: 'cabeza' }], HOY).fuente).toBe('evidencia')
    expect(diagnosticar([], [...base, { fecha: haceDias(-1), freno: 'cabeza' }], HOY).fuente).toBe('evidencia')
  })
  it('los tests corrigen una respuesta física contraria: dices bombeo, pero la resistencia mejora y la fuerza no', () => {
    const d = diagnosticar(resistenciaSubeFuerzaNo, frenos('bombeo', 6), HOY)
    expect(d.fuente).toBe('respuestas-y-tests')
    expect(d.limitantes[0]).toBe('fuerza-dedos')
    expect(d.explicaciones[1]!.parametros).toEqual(['P-23', 'P-69', 'P-70'])
    expect(d.explicaciones[1]!.motivo).toMatch(/manda el test/)
  })
  it('y al revés: dices presas, pero la fuerza mejora y la resistencia no', () => {
    const d = diagnosticar(fuerzaSubeResistenciaNo, frenos('paso-fuerza', 6), HOY)
    expect(d.fuente).toBe('respuestas-y-tests')
    expect(d.limitantes[0]).toBe('resistencia')
  })
  it('si los tests coinciden con la respuesta, la fuente sigue siendo la respuesta', () => {
    const d = diagnosticar(fuerzaSubeResistenciaNo, frenos('bombeo', 6), HOY)
    expect(d.fuente).toBe('respuestas')
    expect(d.limitantes[0]).toBe('resistencia')
  })
  it('los tests no corrigen la técnica ni la cabeza', () => {
    expect(diagnosticar(fuerzaSubeResistenciaNo, frenos('cabeza', 6), HOY).limitantes[0]).toBe('cabeza')
    expect(diagnosticar(resistenciaSubeFuerzaNo, frenos('tecnica-lectura', 6), HOY).limitantes[0]).toBe('tecnica')
  })
  it('sin respuestas suficientes deciden los tests solos', () => {
    const d = diagnosticar(fuerzaSubeResistenciaNo, frenos('bombeo', 2), HOY)
    expect(d.fuente).toBe('tests')
    expect(d.limitantes).toEqual(['resistencia', 'fuerza-dedos', 'tecnica', 'cabeza'])
    expect(d.explicaciones[1]!.parametros).toEqual(['P-23', 'P-70'])
  })
  it('sin veredicto de los tests (ambas mejoran o falta una) no deciden', () => {
    const ambas = [ev('2026-12-01', 20, { colgado30S: 80 }), ev('2027-01-19', 30, { colgado30S: 105 }), ev('2027-03-02', 34, { colgado30S: 120 })]
    expect(diagnosticar(ambas, [], HOY).fuente).toBe('evidencia')
    const sinResistencia = [ev('2026-12-01', 20), ev('2027-01-19', 30), ev('2027-03-02', 34)]
    expect(diagnosticar(sinResistencia, [], HOY).fuente).toBe('evidencia')
  })
  it('rechaza respuestas mal formadas', () => {
    expect(() => diagnosticar([], [{ fecha: '2027-03-01', freno: 'sueño' as never }], HOY)).toThrow(/freno desconocido/)
    expect(() => diagnosticar([], [{ fecha: '2027-02-30', freno: 'nada' }], HOY)).toThrow()
  })
  it('es determinista y no muta sus entradas', () => {
    const evs = [...fuerzaSubeResistenciaNo]
    const rs = [...frenos('bombeo', 6), ...frenos('nada', 2, 10)]
    const antes = structuredClone({ evs, rs })
    expect(diagnosticar(evs, rs, HOY)).toEqual(diagnosticar(evs, rs, HOY))
    expect({ evs, rs }).toEqual(antes)
  })
})

describe('diagnosticar: fortaleza (P-71)', () => {
  it('sin datos propios no hay fortaleza', () => {
    expect(diagnosticar([], [], HOY).fortaleza).toBeNull()
  })
  it('por tests: la que mejora cuando otra no', () => {
    expect(diagnosticar(resistenciaSubeFuerzaNo, [], HOY).fortaleza).toEqual({ cualidad: 'resistencia', fuente: 'tests' })
  })
  it('por tests, la técnica cuenta (escala 1-7) y gana la de mayor cambio relativo', () => {
    const evs = [
      ev('2026-12-01', 20, { colgado30S: 80, tecnica: 3 }), ev('2027-01-19', 30, { colgado30S: 81, tecnica: 4 }),
      ev('2027-03-02', 34, { colgado30S: 80, tecnica: 5 }),
    ]
    // Fuerza: (106 − 92) / 92 ≈ +15 %; técnica: +2 / 3 ≈ +67 % → técnica.
    expect(diagnosticar(evs, [], HOY).fortaleza).toEqual({ cualidad: 'tecnica', fuente: 'tests' })
  })
  it('nunca coincide con el limitante principal', () => {
    // Fuerza mejora, técnica igual y resistencia sin datos: no hay veredicto, P-23 pone la fuerza primero → la
    // fortaleza «fuerza» se descarta.
    const evs = [ev('2026-12-01', 20, { tecnica: 4 }), ev('2027-01-19', 30, { tecnica: 4 }), ev('2027-03-02', 34, { tecnica: 4 })]
    const d = diagnosticar(evs, [], HOY)
    expect(d.limitantes[0]).toBe('fuerza-dedos')
    expect(d.fortaleza).toBeNull()
  })
  it('por respuestas: el único motivo nunca marcado, con al menos 6 respuestas', () => {
    const r = [...frenos('bombeo', 4), ...frenos('tecnica-lectura', 1, 10), ...frenos('cabeza', 1, 20)]
    expect(diagnosticar([], r, HOY).fortaleza).toEqual({ cualidad: 'fuerza-dedos', fuente: 'respuestas' })
  })
  it('con varios motivos a cero no se sabe', () => {
    expect(diagnosticar([], frenos('bombeo', 6), HOY).fortaleza).toBeNull()
  })
  it('si lo que más mejora es el limitante principal, la fortaleza es la siguiente que mejora', () => {
    // Técnica (por respuestas) es el limitante; técnica y fuerza mejoran, la resistencia no → fuerza.
    const evs = [
      ev('2026-12-01', 20, { colgado30S: 80, tecnica: 3 }), ev('2027-01-19', 30, { colgado30S: 81, tecnica: 4 }),
      ev('2027-03-02', 34, { colgado30S: 80, tecnica: 5 }),
    ]
    const d = diagnosticar(evs, frenos('tecnica-lectura', 6), HOY)
    expect(d.limitantes[0]).toBe('tecnica')
    expect(d.fortaleza).toEqual({ cualidad: 'fuerza-dedos', fuente: 'tests' })
  })
  it('la explicación de la fortaleza cita P-71', () => {
    const d = diagnosticar(resistenciaSubeFuerzaNo, [], HOY)
    expect(d.explicaciones[2]!.parametros).toEqual(['P-71'])
    expect(d.explicaciones[2]!.motivo).toMatch(/^Lo que mejor llevas es la resistencia/)
  })
})

describe('ajusteCiclo2', () => {
  const con = (motivo: MotivoCaida) => ajusteCiclo2(diagnosticar([], frenos(motivo, 12), HOY))
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
    expect(con('bombeo').explicacion.motivo).toMatch(/se dan más semanas a lo que más te limita/)
    expect(con('cabeza').explicacion.parametros).toEqual(['P-23', 'P-31', 'P-62'])
    expect(con('tecnica-lectura').explicacion.motivo).toMatch(/cuando hay hueco/)
  })
})

describe('temporada ajustada con el diagnóstico', () => {
  const ajuste = (motivo: MotivoCaida) => ajusteCiclo2(diagnosticar([], frenos(motivo, 12), HOY))

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
  it('P-08 en todas las longitudes válidas (42-53 semanas) y todos los repartos: tests separados entre 3 y 10 semanas', () => {
    const repartos = [undefined, ...(['bombeo', 'paso-fuerza', 'tecnica-lectura', 'cabeza'] as const).map(ajuste)]
    for (let n = 42; n <= 53; n++) {
      const objetivo = fechaDesdeDia(diaNumero('2026-11-02') + n * 7)
      for (const a of repartos) {
        const t = planificarTemporada('2026-11-02', objetivo, a ? { ajuste: a } : {})
        expect(t.semanas).toHaveLength(n)
        const reev = [t.semanas.findIndex((s) => s.faseId === 'fuerza'), ...t.semanas.flatMap((s, i) => (s.reevaluar ? [i] : []))]
        const etiqueta = `${n} semanas, ${a ? `${a.fuerza}+${a.resistencia}` : 'por defecto'}`
        for (let i = 1; i < reev.length; i++) {
          expect(reev[i]! - reev[i - 1]!, etiqueta).toBeLessThanOrEqual(10)
          expect(reev[i]! - reev[i - 1]!, etiqueta).toBeGreaterThanOrEqual(3)
        }
        expect(t.semanas.length - reev.at(-1)!, etiqueta).toBeLessThanOrEqual(10)
        expect(t.semanas.at(-1)!.reevaluar, etiqueta).toBe(false)
        for (const i of reev.slice(1)) expect(['transicion', 'base'], etiqueta).not.toContain(t.semanas[i]!.faseId)
      }
    }
  })
  it('rechaza combinar `ajuste` con `ciclo2` o `refuerzoTecnica`', () => {
    const a = ajuste('bombeo')
    expect(() => planificarTemporada('2026-11-02', '2027-10-04', { ajuste: a, ciclo2: { fuerza: 8, resistencia: 6 } })).toThrow(/no ambos/)
    expect(() => planificarTemporada('2026-11-02', '2027-10-04', { ajuste: a, refuerzoTecnica: false })).toThrow(/no ambos/)
  })
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
