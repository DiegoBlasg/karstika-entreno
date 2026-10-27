import { describe, expect, it } from 'vitest'
import { ahoraMadrid, fechaLarga, sumarDias } from './fecha'

describe('ahoraMadrid', () => {
  it('usa la hora de Madrid, también el día del cambio de hora', () => {
    expect(ahoraMadrid(new Date('2026-10-25T00:30:00Z'))).toEqual({ fecha: '2026-10-25', hora: 2.5, hhmm: '02:30' })
    expect(ahoraMadrid(new Date('2026-11-02T23:30:00Z'))).toEqual({ fecha: '2026-11-03', hora: 0.5, hhmm: '00:30' })
    expect(ahoraMadrid(new Date('2026-07-01T21:45:00Z'))).toEqual({ fecha: '2026-07-01', hora: 23.75, hhmm: '23:45' })
  })
})

describe('fechaLarga y sumarDias', () => {
  it('escribe la fecha en español', () => {
    expect(fechaLarga('2026-11-02')).toBe('lunes, 2 de noviembre')
  })
  it('suma días cruzando meses y años', () => {
    expect(sumarDias('2026-12-30', 3)).toBe('2027-01-02')
    expect(sumarDias('2026-11-02', 48 * 7)).toBe('2027-10-04')
    expect(sumarDias('2026-11-02', -1)).toBe('2026-11-01')
  })
})
