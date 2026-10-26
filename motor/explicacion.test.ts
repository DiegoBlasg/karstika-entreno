import { describe, expect, it } from 'vitest'
import { explicar, explicarContexto } from './explicacion'
import { METADATOS, type ParametroId } from './metadatos'

describe('explicar', () => {
  it('deriva evidencias, nivel y origen de los parámetros', () => {
    const e = explicar('regla.prueba', ['P-02'], 'porque sí')
    expect(e.parametros).toEqual(['P-02'])
    expect(e.evidencias).toEqual(METADATOS['P-02'].evidencia)
    expect(e.nivelMinimo).toBe(METADATOS['P-02'].nivelMinimo)
    expect(e.origen).toBe('evidencia')
    expect(e.motivo).toBe('porque sí')
  })
  it('un parámetro de diseño rebaja el nivel a sinEvidencia y el origen a diseno', () => {
    const e = explicar('regla.prueba', ['P-02', 'P-14'], 'm')
    expect(METADATOS['P-14'].origen).toBe('diseno')
    expect(e.nivelMinimo).toBe('sinEvidencia')
    expect(e.origen).toBe('diseno')
  })
  it('une evidencias sin duplicados y ordenadas, y ordena los parámetros', () => {
    const e = explicar('regla.prueba', ['P-05', 'P-02', 'P-02'], 'm')
    expect(e.parametros).toEqual(['P-02', 'P-05'])
    expect(e.evidencias).toEqual([...new Set(e.evidencias)].sort())
    expect(e.evidencias.length).toBeGreaterThan(0)
  })
  it('lanza sin parámetros', () => {
    expect(() => explicar('regla.prueba', [], 'm')).toThrow(/ningún parámetro/)
  })
  it('lanza con un parámetro desconocido', () => {
    expect(() => explicar('regla.prueba', ['P-99' as ParametroId], 'm')).toThrow(/desconocido/)
  })
  it('lanza con regla o motivo vacíos', () => {
    expect(() => explicar('', ['P-02'], 'm')).toThrow()
    expect(() => explicar('regla.prueba', ['P-02'], '  ')).toThrow()
  })
})

describe('explicarContexto', () => {
  it('no cita parámetros ni evidencia', () => {
    const e = explicarContexto('contexto.sin-cuerda', 'Sin compañero no hay cuerda.')
    expect(e).toEqual({
      regla: 'contexto.sin-cuerda',
      parametros: [],
      evidencias: [],
      nivelMinimo: 'sinEvidencia',
      origen: 'contexto',
      motivo: 'Sin compañero no hay cuerda.',
    })
  })
  it('exige que la regla empiece por contexto.', () => {
    expect(() => explicarContexto('seguridad.x', 'm')).toThrow(/contexto\./)
  })
})
