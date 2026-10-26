import { describe, expect, it } from 'vitest'
import { FASE_BASE, FASE_FUERZA } from './fases'

describe.each([FASE_BASE, FASE_FUERZA])('fase $id', (fase) => {
  it('ningún tipo está a la vez en prioridad y en prohibidos', () => {
    for (const t of fase.prioridad) expect(fase.prohibidos, t).not.toContain(t)
  })
  it('los cupos solo existen para tipos prioritarios y son enteros positivos', () => {
    for (const [tipo, cupo] of Object.entries(fase.cupos)) {
      expect(fase.prioridad, tipo).toContain(tipo)
      expect(Number.isInteger(cupo) && cupo! > 0, tipo).toBe(true)
    }
  })
  it('la prioridad no tiene repetidos', () => {
    expect(new Set(fase.prioridad).size).toBe(fase.prioridad.length)
  })
})

describe('FASE_BASE respeta P-32', () => {
  it('no prescribe fuerza de dedos ni board', () => {
    for (const t of ['multipresa-resistencia', 'multipresa-maxima', 'board', 'campus'] as const) {
      expect(FASE_BASE.prioridad).not.toContain(t)
      expect(FASE_BASE.prohibidos).toContain(t)
    }
  })
  it('permite el test de dedos', () => {
    expect(FASE_BASE.prioridad[0]).toBe('evaluacion-dedos')
  })
})

describe('FASE_FUERZA', () => {
  it('prioriza la multipresa de repeaters y nunca las suspensiones máximas ni el campus', () => {
    expect(FASE_FUERZA.prioridad).toContain('multipresa-resistencia')
    expect(FASE_FUERZA.prohibidos).toContain('multipresa-maxima')
    expect(FASE_FUERZA.prohibidos).toContain('campus')
  })
})
