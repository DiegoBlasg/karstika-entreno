import { describe, expect, it } from 'vitest'
import { ses } from './_fabrica'
import { diaNumero, finHoras, inicioHoras, validarEntrada } from './tiempo'

describe('diaNumero', () => {
  it('cuenta días desde 1970-01-01', () => {
    expect(diaNumero('1970-01-01')).toBe(0)
    expect(diaNumero('1970-01-02')).toBe(1)
  })
  it('días consecutivos difieren en 1 también al cambiar de mes, año y bisiesto', () => {
    expect(diaNumero('2026-11-01') - diaNumero('2026-10-31')).toBe(1)
    expect(diaNumero('2027-01-01') - diaNumero('2026-12-31')).toBe(1)
    expect(diaNumero('2024-03-01') - diaNumero('2024-02-29')).toBe(1)
  })
  it('lanza con fechas inexistentes o mal formadas', () => {
    expect(() => diaNumero('2026-02-30')).toThrow()
    expect(() => diaNumero('2026-13-01')).toThrow()
    expect(() => diaNumero('26-10-01')).toThrow()
    expect(() => diaNumero('2026-10-1')).toThrow()
  })
})

describe('inicioHoras y finHoras', () => {
  it('suma hora de inicio y duración', () => {
    const s = ses('a', '1970-01-02', 18, { duracionMin: 90 })
    expect(inicioHoras(s)).toBe(24 + 18)
    expect(finHoras(s)).toBe(24 + 18 + 1.5)
  })
})

describe('validarEntrada', () => {
  it('acepta sesiones válidas', () => {
    expect(() => validarEntrada([ses('a', '2026-10-26', 18), ses('b', '2026-10-27', 0)])).not.toThrow()
  })
  it('lanza con ids duplicados', () => {
    expect(() => validarEntrada([ses('a', '2026-10-26', 18), ses('a', '2026-10-27', 18)])).toThrow(/duplicado/)
  })
  it('lanza con hora fuera de [0, 24)', () => {
    expect(() => validarEntrada([ses('a', '2026-10-26', 24)])).toThrow(/horaInicio/)
    expect(() => validarEntrada([ses('a', '2026-10-26', -1)])).toThrow(/horaInicio/)
    expect(() => validarEntrada([ses('a', '2026-10-26', Number.NaN)])).toThrow(/horaInicio/)
  })
  it('lanza con duración no positiva o no finita', () => {
    expect(() => validarEntrada([ses('a', '2026-10-26', 18, { duracionMin: 0 })])).toThrow(/duracionMin/)
    expect(() => validarEntrada([ses('a', '2026-10-26', 18, { duracionMin: Infinity })])).toThrow(/duracionMin/)
  })
  it('lanza con tipo o intensidad desconocidos', () => {
    expect(() => validarEntrada([ses('a', '2026-10-26', 18, { tipo: 'zumba' as never })])).toThrow(/tipo/)
    expect(() => validarEntrada([ses('a', '2026-10-26', 18, { intensidad: 'media' as never })])).toThrow(/intensidad/)
  })
  it('lanza con una fecha inexistente', () => {
    expect(() => validarEntrada([ses('a', '2026-02-30', 18)])).toThrow()
  })
})
