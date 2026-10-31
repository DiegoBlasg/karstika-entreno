import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contraste, luminancia, tokensDeCss } from './contraste'

const tokens = tokensDeCss(readFileSync('app/globals.css', 'utf8'))
const c = (nombre: string): string => {
  const v = tokens[nombre]
  if (!v) throw new Error(`Falta el token --color-${nombre} en app/globals.css`)
  return v
}

describe('contraste', () => {
  it('calcula la luminancia y la relación de WCAG', () => {
    expect(luminancia('#000000')).toBe(0)
    expect(luminancia('#FFFFFF')).toBeCloseTo(1, 5)
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contraste('#FFFFFF', '#000000')).toBeCloseTo(21, 5)
  })

  it('lee los tokens de color del CSS', () => {
    expect(tokensDeCss('@theme static {\n  --color-fondo: #0E1417;\n  --color-texto-2: #9FB0A8;\n}')).toEqual({
      fondo: '#0E1417',
      'texto-2': '#9FB0A8',
    })
  })

  it('tiene todos los tokens del spec con su valor exacto', () => {
    expect(tokens).toMatchObject({
      fondo: '#0E1417', 'fondo-hundido': '#0B1013', superficie: '#172024', 'superficie-2': '#22303A',
      borde: '#26333A', pista: '#2A3539', texto: '#E8EDEA', 'texto-2': '#9FB0A8', 'texto-3': '#6E7F78',
      progreso: '#C6F24E', cima: '#FF7A45', ambar: '#F5B83D', rojo: '#FF5A5A',
    })
  })

  it.each(['texto', 'texto-2', 'progreso', 'cima', 'ambar', 'rojo'])('%s se lee como texto (AA) sobre fondo y superficie', (t) => {
    expect(contraste(c(t), c('fondo'))).toBeGreaterThanOrEqual(4.5)
    expect(contraste(c(t), c('superficie'))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['texto', 'texto-2'])('%s se lee sobre superficie-2 (chips)', (t) => {
    expect(contraste(c(t), c('superficie-2'))).toBeGreaterThanOrEqual(4.5)
  })

  it('texto-3 solo llega para texto grande (≥ 3:1)', () => {
    expect(contraste(c('texto-3'), c('fondo'))).toBeGreaterThanOrEqual(3)
    expect(contraste(c('texto-3'), c('superficie'))).toBeGreaterThanOrEqual(3)
  })

  it.each(['progreso', 'rojo', 'ambar', 'cima'])('el texto oscuro (fondo) se lee sobre un botón %s', (t) => {
    expect(contraste(c('fondo'), c(t))).toBeGreaterThanOrEqual(4.5)
  })
})

describe('colores de fase', () => {
  it('tienen el valor del spec', () => {
    expect(tokens).toMatchObject({
      'fase-base': '#8FB3A6', 'fase-fuerza': '#C6F24E', 'fase-resistencia': '#4FD1C5',
      'fase-rendimiento': '#FF7A45', 'fase-transicion': '#6E7F78',
    })
  })

  it.each(['base', 'fuerza', 'resistencia', 'rendimiento'])('el texto oscuro (fondo) se lee sobre fase-%s (AA)', (f) => {
    expect(contraste(c('fondo'), c(`fase-${f}`))).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['base', 'fuerza', 'resistencia', 'rendimiento', 'transicion'])('fase-%s se distingue sobre fondo (no texto, ≥ 3:1)', (f) => {
    expect(contraste(c(`fase-${f}`), c('fondo'))).toBeGreaterThanOrEqual(3)
  })

  // Transición (gris #6E7F78) no llega a 4,5:1 con texto oscuro: lleva el texto claro (`texto`) encima.
  it('transición lleva texto claro encima', () => {
    expect(contraste(c('fondo'), c('fase-transicion'))).toBeLessThan(4.5)
    expect(contraste(c('texto'), c('fase-transicion'))).toBeGreaterThanOrEqual(3)
  })
})
