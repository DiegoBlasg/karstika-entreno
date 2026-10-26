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
    expect(Number.isNaN(Date.parse(h.verificada.fecha))).toBe(false)
    expect(Date.parse(h.verificada.fecha)).toBeLessThanOrEqual(Date.now())
    expect(h.afirmacion).not.toMatch(/TODO|TBD|<[^>]+>/)
    expect(h.limitaciones).not.toMatch(/TODO|TBD|<[^>]+>/)
    expect(Object.values(h.aplicaA).some((v) => v && v.trim() !== '')).toBe(true)
    for (const f of h.fuentes) {
      expect(f.autores.trim()).not.toBe('')
      expect(f.titulo.trim()).not.toBe('')
      expect(Number.isInteger(f.anio)).toBe(true)
      expect(f.publicacion.trim()).not.toBe('')
      if (f.doi) expect(f.doi).toMatch(/^10\.\d{4,9}\/\S+$/)
      if (f.url) expect(f.url).toMatch(/^https?:\/\/\S+$/)
      expect(f.anio).toBeGreaterThanOrEqual(1970)
      expect(f.anio).toBeLessThanOrEqual(ANIO_MAX)
      expect(Boolean(f.doi || f.url)).toBe(true)
    }
  })

  it('el nivel describe el diseño; si solo se leyó el resumen, debe declararse en limitaciones', () => {
    for (const h of todos.filter((x) => x.verificada.metodo === 'resumen')) {
      expect(h.limitaciones, h.id).toMatch(/resumen|abstract/i)
    }
  })

  it('cada bloque tiene al menos 8 hallazgos', () => {
    for (const b of BLOQUES) {
      expect(todos.filter((h) => h.bloque === b).length, b).toBeGreaterThanOrEqual(8)
    }
  })
})
