import { describe, expect, it } from 'vitest'
import { todos } from './index'
import { BLOQUES, PREFIJOS } from './tipos'

const ANIO_MAX = new Date().getFullYear()

describe('base de evidencia', () => {
  it('los ids son únicos', () => {
    const ids = todos.map((h) => h.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(todos.map((h) => [h.id, h] as const))('%s cumple el esquema', (_id, h) => {
    expect(h.id).toMatch(/^EV-[A-Z]{5,6}-\d{3}$/)
    expect(h.id.startsWith(`EV-${PREFIJOS[h.bloque]}-`)).toBe(true)
    expect(BLOQUES).toContain(h.bloque)
    expect(['A', 'B', 'C']).toContain(h.nivel)
    expect(h.afirmacion.trim().length).toBeGreaterThan(20)
    expect(h.limitaciones.trim().length).toBeGreaterThan(10)
    expect(h.fuentes.length).toBeGreaterThan(0)
    expect(h.verificada.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    for (const f of h.fuentes) {
      expect(f.autores.trim()).not.toBe('')
      expect(f.titulo.trim()).not.toBe('')
      expect(f.anio).toBeGreaterThanOrEqual(1970)
      expect(f.anio).toBeLessThanOrEqual(ANIO_MAX)
      expect(Boolean(f.doi || f.url)).toBe(true)
    }
  })

  it('nivel A o B exige verificación contra la fuente primaria', () => {
    for (const h of todos.filter((x) => x.nivel !== 'C')) {
      expect(h.verificada.metodo, h.id).toBe('fuente-primaria')
    }
  })

  it('cada bloque tiene al menos 8 hallazgos', () => {
    for (const b of BLOQUES) {
      expect(todos.filter((h) => h.bloque === b).length, b).toBeGreaterThanOrEqual(8)
    }
  })
})
