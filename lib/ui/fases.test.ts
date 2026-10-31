import { describe, expect, it } from 'vitest'
import type { FaseId } from '@/motor/propuesta-tipos'
import { COLOR_FASE } from './fases'

const FASES: FaseId[] = ['base', 'fuerza', 'resistencia', 'rendimiento', 'transicion']

describe('COLOR_FASE', () => {
  it.each(FASES)('la fase %s tiene todas sus clases', (f) => {
    const c = COLOR_FASE[f]
    for (const clase of Object.values(c)) expect(clase.length).toBeGreaterThan(0)
    expect(c.fondo).toBe(`bg-fase-${f}`)
    expect(c.texto).toBe(`text-fase-${f}`)
    expect(c.borde).toBe(`border-fase-${f}`)
    expect(c.trazo).toBe(`stroke-fase-${f}`)
    expect(c.relleno).toBe(`fill-fase-${f}`)
  })

  it('el texto encima es oscuro salvo en transición', () => {
    expect(COLOR_FASE.fuerza.textoEncima).toBe('text-fondo')
    expect(COLOR_FASE.transicion.textoEncima).toBe('text-texto')
  })
})
