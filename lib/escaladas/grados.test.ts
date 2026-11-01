import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compararGrados, distanciaGrados, ESCALA, esGradoValido, GRADOS_BLOQUE, GRADOS_VIA, maxGrado, ordenGrado } from './grados'

describe('escalas', () => {
  it('vías en grado francés: 4a, 4b, 4c y desde el 5 cada letra con su +, hasta el 9a', () => {
    expect(GRADOS_VIA.slice(0, 6)).toEqual(['4a', '4b', '4c', '5a', '5a+', '5b'])
    expect(GRADOS_VIA).toContain('6b+')
    expect(GRADOS_VIA).toContain('7a')
    expect(GRADOS_VIA).toContain('8c+')
    expect(GRADOS_VIA.at(-1)).toBe('9a')
    expect(GRADOS_VIA).not.toContain('4a+')
    expect(GRADOS_VIA).not.toContain('9a+')
    expect(GRADOS_VIA).toHaveLength(3 + 4 * 6 + 1)
  })
  it('bloques en Font: 4, 4+, 5, 5+, 6A, 6A+ … 8A+', () => {
    expect(GRADOS_BLOQUE.slice(0, 6)).toEqual(['4', '4+', '5', '5+', '6A', '6A+'])
    expect(GRADOS_BLOQUE).toContain('7C+')
    expect(GRADOS_BLOQUE.at(-1)).toBe('8A+')
    expect(GRADOS_BLOQUE).toHaveLength(4 + 12 + 2)
    expect(ESCALA.via).toBe(GRADOS_VIA)
    expect(ESCALA.bloque).toBe(GRADOS_BLOQUE)
  })
  it('las listas del check de la migración 008 son exactamente las de la escala', () => {
    const sql = readFileSync('migraciones/008_escaladas.sql', 'utf8')
    const lista = (tipo: string): string[] => {
      const m = new RegExp(`tipo = '${tipo}' and grado in \\(([^)]*)\\)`).exec(sql)
      if (!m) throw new Error(`no está la lista de ${tipo}`)
      return m[1]!.split(',').map((g) => g.trim().replace(/^'|'$/g, ''))
    }
    expect(lista('via')).toEqual([...GRADOS_VIA])
    expect(lista('bloque')).toEqual([...GRADOS_BLOQUE])
  })
})

describe('validación', () => {
  it('acepta los grados de su escala', () => {
    expect(esGradoValido('via', '6b')).toBe(true)
    expect(esGradoValido('via', '5c+')).toBe(true)
    expect(esGradoValido('bloque', '6A+')).toBe(true)
    expect(esGradoValido('bloque', '4+')).toBe(true)
  })
  it('rechaza un grado inválido', () => {
    for (const g of ['6d', '4a+', '9a+', '10a', '', ' 6b', '6b ', '6B']) expect(esGradoValido('via', g)).toBe(false)
    for (const g of ['3', '8B', '6a', '6D', '9A']) expect(esGradoValido('bloque', g)).toBe(false)
  })
  it('rechaza un grado de la escala equivocada para el tipo', () => {
    expect(esGradoValido('via', '6A')).toBe(false)
    expect(esGradoValido('via', '5+')).toBe(false)
    expect(esGradoValido('bloque', '6a')).toBe(false)
    expect(esGradoValido('bloque', '5c')).toBe(false)
  })
})

describe('orden', () => {
  it('ordena dentro de cada escala', () => {
    expect(ordenGrado('via', '6b')).toBeLessThan(ordenGrado('via', '6b+'))
    expect(ordenGrado('via', '6c+')).toBeLessThan(ordenGrado('via', '7a'))
    expect(ordenGrado('via', '4c')).toBeLessThan(ordenGrado('via', '5a'))
    expect(ordenGrado('bloque', '5+')).toBeLessThan(ordenGrado('bloque', '6A'))
    expect(compararGrados('via', '7a', '6c+')).toBeGreaterThan(0)
    expect(compararGrados('via', '6a', '6a')).toBe(0)
    expect(compararGrados('bloque', '6A', '6A+')).toBeLessThan(0)
    expect(['7a', '5b', '6b+', '6b'].sort((a, b) => compararGrados('via', a, b))).toEqual(['5b', '6b', '6b+', '7a'])
  })
  it('un grado inválido al ordenar es un error', () => {
    expect(() => ordenGrado('via', '6A')).toThrow('Grado no válido para vía: 6A')
    expect(() => ordenGrado('bloque', '6a')).toThrow('Grado no válido para bloque: 6a')
  })
  it('el máximo de una lista, o null si está vacía', () => {
    expect(maxGrado('via', ['6a', '6b+', '6b'])).toBe('6b+')
    expect(maxGrado('bloque', ['5+', '6A'])).toBe('6A')
    expect(maxGrado('via', [])).toBeNull()
  })
  it('la distancia en grados de la escala (cada + cuenta): de 6b a 7a son 4', () => {
    expect(distanciaGrados('via', '6b', '7a')).toBe(4)
    expect(distanciaGrados('via', '6c+', '7a')).toBe(1)
    expect(distanciaGrados('via', '7a', '7a')).toBe(0)
    expect(distanciaGrados('via', '7a+', '7a')).toBe(-1)
    expect(distanciaGrados('via', '4c', '5a+')).toBe(2)
  })
})
