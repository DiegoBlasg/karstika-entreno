import { describe, expect, it } from 'vitest'
import { evaluacionVigente, fuerzaRelativa, lastreRepeaters } from './evaluacion'
import type { EvaluacionDedos } from './propuesta-tipos'

const ev = (extra: Partial<EvaluacionDedos> = {}): EvaluacionDedos => ({
  fecha: '2026-10-20', pesoCorporalKg: 70, lastreKg: 30, ...extra,
})

describe('fuerzaRelativa', () => {
  it('es (peso + lastre) / peso en porcentaje', () => {
    expect(fuerzaRelativa(ev())).toBeCloseTo(142.857, 2)
    expect(fuerzaRelativa(ev({ lastreKg: 0 }))).toBe(100)
    expect(fuerzaRelativa(ev({ lastreKg: -7 }))).toBeCloseTo(90, 9)
  })
})

describe('evaluacionVigente', () => {
  it('sin evaluación no es vigente', () => {
    expect(evaluacionVigente(undefined, '2026-10-27')).toBe(false)
  })
  it('70 días pasan y 71 no (P-08: nunca más de 10 semanas)', () => {
    expect(evaluacionVigente(ev({ fecha: '2026-08-18' }), '2026-10-27')).toBe(true)
    expect(evaluacionVigente(ev({ fecha: '2026-08-17' }), '2026-10-27')).toBe(false)
  })
  it('una evaluación del futuro no es vigente', () => {
    expect(evaluacionVigente(ev({ fecha: '2026-10-28' }), '2026-10-27')).toBe(false)
  })
  it('el mismo día es vigente', () => {
    expect(evaluacionVigente(ev({ fecha: '2026-10-27' }), '2026-10-27')).toBe(true)
  })
})

describe('lastreRepeaters', () => {
  it('es el 80 % de (peso + lastre) menos el peso', () => {
    expect(lastreRepeaters(ev())).toBe(10) // 0,8 × 100 − 70
  })
  it('redondea hacia abajo a 0,5 kg para no superar nunca el 80 %', () => {
    expect(lastreRepeaters(ev({ lastreKg: 31 }))).toBe(10.5) // 0,8 × 101 − 70 = 10,8
    const total = 70 + lastreRepeaters(ev({ lastreKg: 31 }))
    expect(total / (70 + 31)).toBeLessThanOrEqual(0.8)
  })
  it('devuelve negativo cuando hace falta descarga', () => {
    expect(lastreRepeaters(ev({ lastreKg: -5 }))).toBe(-18) // 0,8 × 65 − 70
  })
  it('un resultado exacto no pierde 0,5 kg por ruido de coma flotante', () => {
    expect(lastreRepeaters(ev({ pesoCorporalKg: 60, lastreKg: 15 }))).toBe(0) // 0,8 × 75 − 60
  })
  it('nunca devuelve -0', () => {
    expect(Object.is(lastreRepeaters(ev({ pesoCorporalKg: 60, lastreKg: 15 })), 0)).toBe(true)
  })
  it('lanza con datos inválidos', () => {
    expect(() => lastreRepeaters(ev({ pesoCorporalKg: 0 }))).toThrow(/pesoCorporalKg/)
    expect(() => lastreRepeaters(ev({ lastreKg: Number.NaN }))).toThrow(/lastreKg/)
    expect(() => fuerzaRelativa(ev({ pesoCorporalKg: -1 }))).toThrow(/pesoCorporalKg/)
  })
})

describe('plausibilidad del test (protección contra errores al teclear)', () => {
  it('rechaza pesos y lastres fuera de rango', () => {
    expect(() => fuerzaRelativa(ev({ pesoCorporalKg: 25 }))).toThrow(/rango plausible/)
    expect(() => fuerzaRelativa(ev({ pesoCorporalKg: 250 }))).toThrow(/rango plausible/)
    expect(() => lastreRepeaters(ev({ lastreKg: 500 }))).toThrow(/rango plausible/)
    expect(() => lastreRepeaters(ev({ lastreKg: -50 }))).toThrow(/rango plausible/)
  })
  it('acepta los extremos del rango', () => {
    expect(() => fuerzaRelativa(ev({ lastreKg: 70 }))).not.toThrow()
    expect(() => fuerzaRelativa(ev({ lastreKg: -42 }))).not.toThrow()
  })
})

describe('lastreRepeaters con fracción', () => {
  it('al 70 % da menos carga que al 80 %', () => {
    expect(lastreRepeaters(ev(), 0.7)).toBe(0) // 0,7 × 100 − 70
    expect(lastreRepeaters(ev())).toBe(10)
  })
  it('nunca acepta una fracción por encima del tope de P-06', () => {
    expect(() => lastreRepeaters(ev(), 0.81)).toThrow(/fracción/)
    expect(() => lastreRepeaters(ev(), 0)).toThrow(/fracción/)
    expect(() => lastreRepeaters(ev(), Number.NaN)).toThrow(/fracción/)
  })
})

describe('campos del diagnóstico en la evaluación', () => {
  it('acepta resistencia en segundos y técnica de 1 a 7', () => {
    expect(() => fuerzaRelativa(ev({ resistenciaS: 85, tecnica: 4 }))).not.toThrow()
  })
  it('rechaza valores imposibles', () => {
    expect(() => fuerzaRelativa(ev({ resistenciaS: 0 }))).toThrow(/resistenciaS/)
    expect(() => fuerzaRelativa(ev({ resistenciaS: 900 }))).toThrow(/resistenciaS/)
    expect(() => fuerzaRelativa(ev({ tecnica: 0 }))).toThrow(/tecnica/)
    expect(() => fuerzaRelativa(ev({ tecnica: 8 }))).toThrow(/tecnica/)
    expect(() => fuerzaRelativa(ev({ tecnica: 4.5 }))).toThrow(/tecnica/)
  })
})
