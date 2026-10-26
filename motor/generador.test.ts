import { describe, expect, it } from 'vitest'
import { generarFuente, parsearParametros } from './generador'

const MUESTRA = [
  '| id | parámetro | valor | ids EV | nivel mínimo | notas |',
  '|---|---|---|---|---|---|',
  '| P-01 | Modalidad | Repeaters | EV-DEDOS-005, EV-DEDOS-004, EV-DEDOS-005 | A | nota |',
  '| P-02 | Descanso mínimo | 48 h | sinEvidencia | sinEvidencia (indirecta B) | nota |',
  '| P-03 | Otro | valor | EV-LESION-007 | C | nota |',
].join('\n')

describe('parsearParametros', () => {
  it('lee las filas P-xx e ignora cabecera y separador', () => {
    expect(parsearParametros(MUESTRA).map((p) => p.id)).toEqual(['P-01', 'P-02', 'P-03'])
  })
  it('deduplica y ordena los ids de evidencia', () => {
    const p = parsearParametros(MUESTRA)[0]!
    expect(p.evidencia).toEqual(['EV-DEDOS-004', 'EV-DEDOS-005'])
    expect(p.origen).toBe('evidencia')
    expect(p.nivelMinimo).toBe('A')
  })
  it('una fila sinEvidencia es de diseño, sin ids y nivel sinEvidencia', () => {
    const p = parsearParametros(MUESTRA)[1]!
    expect(p.origen).toBe('diseno')
    expect(p.evidencia).toEqual([])
    expect(p.nivelMinimo).toBe('sinEvidencia')
    expect(p.titulo).toBe('Descanso mínimo')
  })
  it('acepta saltos de línea CRLF', () => {
    expect(parsearParametros(MUESTRA.replace(/\n/g, '\r\n'))).toHaveLength(3)
  })
  it('lanza si una fila no tiene 6 columnas', () => {
    expect(() => parsearParametros('| P-01 | a | b | EV-DEDOS-004 | A |')).toThrow(/6/)
  })
  it('lanza si el nivel no se reconoce', () => {
    expect(() => parsearParametros('| P-01 | a | b | EV-DEDOS-004 | Z | n |')).toThrow(/Nivel/)
  })
  it('lanza si origen y nivel son incoherentes', () => {
    expect(() => parsearParametros('| P-01 | a | b | sinEvidencia | A | n |')).toThrow(/incoherentes/)
    expect(() => parsearParametros('| P-01 | a | b | EV-DEDOS-004 | sinEvidencia | n |')).toThrow(/incoherentes/)
  })
})

describe('generarFuente', () => {
  it('genera un módulo con ids, tipo y metadatos, y es determinista', () => {
    const fuente = generarFuente(parsearParametros(MUESTRA))
    expect(fuente).toContain('GENERADO')
    expect(fuente).toContain('export const PARAMETRO_IDS = ["P-01","P-02","P-03"] as const')
    expect(fuente).toContain('export type ParametroId')
    expect(fuente).toContain('"P-02": {"id":"P-02"')
    expect(fuente.endsWith('\n')).toBe(true)
    expect(generarFuente(parsearParametros(MUESTRA))).toBe(fuente)
  })
})
