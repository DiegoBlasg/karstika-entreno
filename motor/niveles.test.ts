import { describe, expect, it } from 'vitest'
import { nivelMasBajo, ORDEN_NIVEL } from './niveles'

describe('nivelMasBajo', () => {
  it('devuelve el peor nivel', () => {
    expect(nivelMasBajo(['A', 'C', 'B'])).toBe('C')
    expect(nivelMasBajo(['A', 'sinEvidencia', 'B'])).toBe('sinEvidencia')
    expect(nivelMasBajo(['B'])).toBe('B')
  })
  it('lanza con lista vacía', () => {
    expect(() => nivelMasBajo([])).toThrow()
  })
  it('el orden va de menos a más evidencia', () => {
    expect(ORDEN_NIVEL).toEqual(['sinEvidencia', 'C', 'B', 'A'])
  })
})
