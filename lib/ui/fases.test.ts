import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { FaseId } from '@/motor/propuesta-tipos'
import { contraste, tokensDeCss } from './contraste'
import { COLOR_CIMA, COLOR_FASE } from './fases'

const tokens = tokensDeCss(readFileSync('app/globals.css', 'utf8'))

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

  it('el texto pequeño es el de la fase salvo en transición, que pasa al secundario', () => {
    expect(COLOR_FASE.base.textoPequeno).toBe('text-fase-base')
    expect(COLOR_FASE.transicion.textoPequeno).toBe('text-texto-2')
    expect(COLOR_CIMA.textoPequeno).toBe('text-cima')
  })

  // Texto pequeño (AA, 4,5:1) sobre fondo, superficie (tarjetas) y superficie-2 (la semana actual en la hoja del largo).
  it.each([...FASES.map((f) => [f, COLOR_FASE[f]] as const), ['cima', COLOR_CIMA] as const])('el texto pequeño de %s se lee (AA)', (_, c) => {
    const color = tokens[c.textoPequeno.replace(/^text-/, '')]
    expect(color).toBeDefined()
    for (const sobre of ['fondo', 'superficie', 'superficie-2']) expect(contraste(color!, tokens[sobre]!)).toBeGreaterThanOrEqual(4.5)
  })
})
