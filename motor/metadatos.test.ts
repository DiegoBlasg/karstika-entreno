import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { porId } from '../evidencia'
import { generarFuente, parsearParametros } from './generador'
import { METADATOS, PARAMETRO_IDS } from './metadatos'

const md = readFileSync('docs/evidencia/parametros.md', 'utf8')

describe('metadatos de parámetros', () => {
  it('motor/metadatos.ts está al día con parametros.md (ejecuta npm run metadatos si falla)', () => {
    const esperado = generarFuente(parsearParametros(md))
    const actual = readFileSync('motor/metadatos.ts', 'utf8').replace(/\r\n/g, '\n')
    expect(actual).toBe(esperado)
  })
  it('hay 62 parámetros consecutivos P-01…P-62', () => {
    expect(PARAMETRO_IDS).toHaveLength(62)
    PARAMETRO_IDS.forEach((id, i) => expect(id).toBe(`P-${String(i + 1).padStart(2, '0')}`))
  })
  it('todos los ids de evidencia citados existen', () => {
    for (const id of PARAMETRO_IDS) {
      for (const ev of METADATOS[id].evidencia) expect(porId(ev), `${id} cita ${ev}`).toBeDefined()
    }
  })
  it('origen diseno equivale a nivel sinEvidencia y a no citar ids', () => {
    for (const id of PARAMETRO_IDS) {
      const m = METADATOS[id]
      expect(m.origen === 'diseno').toBe(m.nivelMinimo === 'sinEvidencia')
      if (m.origen === 'diseno') expect(m.evidencia).toEqual([])
    }
  })
})
