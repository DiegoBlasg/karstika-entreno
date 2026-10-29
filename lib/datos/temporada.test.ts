import { describe, expect, it } from 'vitest'
import { TIPOS_SESION, type FaseId } from '../../motor'
import { DONDE_SE_HACE, OBJETIVO_FASE } from '../nombres'
import { datosVacios } from './_fabrica'
import { posicionEnTemporada, textoPosicion } from './temporada'

// Temporada por defecto del perfil de prueba: 2026-11-02 → semana objetivo 2027-10-04 (48 semanas + la objetivo).
describe('posicionEnTemporada', () => {
  const d = datosVacios()
  it('primera semana: base, semana 1 de 4', () => {
    expect(posicionEnTemporada(d, '2026-11-02')).toEqual({
      semana: 1, total: 49, ciclo: 1, faseId: 'base', fase: 'Base técnica y adaptación', semanaDeFase: 1, semanasDeFase: 4,
      descarga: false, reevaluar: false, semanaObjetivo: false,
    })
  })
  it('un miércoles de fuerza: semana 6, fuerza semana 2 de 8', () => {
    expect(posicionEnTemporada(d, '2026-12-09')).toMatchObject({
      semana: 6, ciclo: 1, faseId: 'fuerza', fase: 'Fuerza de dedos', semanaDeFase: 2, semanasDeFase: 8, descarga: false,
    })
  })
  it('la cuarta semana de fuerza es de descarga', () => {
    expect(posicionEnTemporada(d, '2026-12-27')).toMatchObject({ semana: 8, faseId: 'fuerza', semanaDeFase: 4, descarga: true })
  })
  it('la última semana de la fuerza del ciclo 1 es de test', () => {
    expect(posicionEnTemporada(d, '2027-01-18')).toMatchObject({ semana: 12, faseId: 'fuerza', semanaDeFase: 8, reevaluar: true })
  })
  it('la semana objetivo es la última', () => {
    expect(posicionEnTemporada(d, '2027-10-06')).toEqual({
      semana: 49, total: 49, ciclo: 2, faseId: 'rendimiento', fase: 'Semana objetivo', semanaDeFase: 1, semanasDeFase: 1,
      descarga: false, reevaluar: false, semanaObjetivo: true,
    })
  })
  it('fuera de temporada (antes y después) devuelve null', () => {
    expect(posicionEnTemporada(d, '2026-11-01')).toBeNull()
    expect(posicionEnTemporada(d, '2027-10-11')).toBeNull()
  })
})

describe('textos de la temporada', () => {
  it('todas las fases tienen objetivo y todos los tipos dónde se hacen', () => {
    const fases: FaseId[] = ['base', 'fuerza', 'resistencia', 'rendimiento', 'transicion']
    for (const f of fases) expect(OBJETIVO_FASE[f]?.length).toBeGreaterThan(0)
    for (const t of TIPOS_SESION) expect(DONDE_SE_HACE[t]?.length).toBeGreaterThan(0)
  })
})

describe('textoPosicion', () => {
  const d = datosVacios()
  it('fase con semanas, descarga y test', () => {
    expect(textoPosicion(posicionEnTemporada(d, '2026-12-09')!)).toBe('Semana 6 de 49 · Ciclo 1 · Fuerza de dedos (semana 2 de 8)')
    expect(textoPosicion(posicionEnTemporada(d, '2026-12-21')!)).toBe('Semana 8 de 49 · Ciclo 1 · Fuerza de dedos (semana 4 de 8) · semana de descarga')
    expect(textoPosicion(posicionEnTemporada(d, '2027-01-18')!)).toBe('Semana 12 de 49 · Ciclo 1 · Fuerza de dedos (semana 8 de 8) · semana de descarga · semana de test')
  })
  it('semana objetivo: sin «semana 1 de 1»', () => {
    expect(textoPosicion(posicionEnTemporada(d, '2027-10-04')!)).toBe('Semana 49 de 49 · Ciclo 2 · Semana objetivo')
  })
})
