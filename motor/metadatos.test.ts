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
  it('hay 68 parámetros consecutivos P-01…P-68', () => {
    expect(PARAMETRO_IDS).toHaveLength(68)
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
  it('valores fijados a mano, independientes del parser', () => {
    expect(PARAMETRO_IDS.filter((id) => METADATOS[id].origen === 'diseno')).toHaveLength(33)
    // P-48 nombra sinEvidencia en la columna de valor, pero su columna de ids sí cita evidencia.
    expect(METADATOS['P-48']).toMatchObject({ origen: 'evidencia', nivelMinimo: 'C', evidencia: ['EV-PERIOD-008'] })
    expect(METADATOS['P-60']).toMatchObject({ origen: 'diseno', nivelMinimo: 'sinEvidencia', evidencia: [] })
    expect(METADATOS['P-14']).toMatchObject({ origen: 'diseno', nivelMinimo: 'sinEvidencia' })
    expect(METADATOS['P-02']).toMatchObject({
      origen: 'evidencia', nivelMinimo: 'A', evidencia: ['EV-DEDOS-004', 'EV-DEDOS-005'],
    })
  })
})
