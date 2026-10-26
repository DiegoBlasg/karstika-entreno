import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { porId } from './index'

const md = readFileSync('docs/evidencia/parametros.md', 'utf8')
const filas = md.split('\n').filter((l) => /^\|\s*P-\d{2}/.test(l))

describe('parámetros del motor', () => {
  it('hay al menos 20 parámetros', () => {
    expect(filas.length).toBeGreaterThanOrEqual(20)
  })
  it.each(filas.map((l) => [l.split('|')[1]!.trim(), l] as const))('%s cita evidencia existente o sinEvidencia', (_p, fila) => {
    if (fila.includes('sinEvidencia')) return
    const ids = fila.match(/EV-[A-Z]{5,6}-\d{3}/g) ?? []
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) expect(porId(id), id).toBeDefined()
  })
})
