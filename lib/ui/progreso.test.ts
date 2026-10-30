import { describe, expect, it } from 'vitest'
import { fraccionSegura, porcentaje } from './progreso'

describe('progreso', () => {
  it('recorta la fracción a 0–1', () => {
    expect(fraccionSegura(0.4)).toBe(0.4)
    expect(fraccionSegura(-1)).toBe(0)
    expect(fraccionSegura(3)).toBe(1)
    expect(fraccionSegura(Number.NaN)).toBe(0)
    expect(fraccionSegura(Number.POSITIVE_INFINITY)).toBe(1)
  })
  it('da el porcentaje entero', () => {
    expect(porcentaje(0.756)).toBe(76)
    expect(porcentaje(2)).toBe(100)
    expect(porcentaje(Number.NaN)).toBe(0)
  })
})
