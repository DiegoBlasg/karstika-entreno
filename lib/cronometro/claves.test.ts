import { describe, expect, it } from 'vitest'
import { clavesObsoletas } from './claves'

describe('clavesObsoletas', () => {
  it('borra las del cronómetro y del test de sesiones que ya no están pendientes de hoy', () => {
    const claves = ['cronometro:a', 'cronometro:a:test', 'cronometro:b', 'cronometro:b:test', 'cronometro:c']
    expect(clavesObsoletas(claves, ['a'])).toEqual(['cronometro:b', 'cronometro:b:test', 'cronometro:c'])
  })
  it('no toca otras claves ni las vigentes', () => {
    expect(clavesObsoletas(['tema', 'cronometro:a', 'cronometro:a:test', 'cronometro:a:otra', 'xcronometro:z'], ['a'])).toEqual([])
  })
  it('sin pendientes, todas las del cronómetro', () => {
    expect(clavesObsoletas(['cronometro:a', 'otra'], [])).toEqual(['cronometro:a'])
  })
})
