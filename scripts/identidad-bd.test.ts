import { describe, expect, it } from 'vitest'
import { identidadBd } from './identidad-bd.ts'

const directa = 'postgresql://u:p@ep-cool-rain-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require'

describe('identidadBd', () => {
  it('host con pooler y directo tienen la misma identidad', () => {
    expect(identidadBd('postgresql://u:p@ep-cool-rain-123456-pooler.eu-central-1.aws.neon.tech/neondb')).toBe(identidadBd(directa))
  })
  it('distinto nombre de base, distinta identidad', () => {
    expect(identidadBd(directa.replace('/neondb', '/otra'))).not.toBe(identidadBd(directa))
  })
  it('distinta rama (distinto host), distinta identidad', () => {
    expect(identidadBd(directa.replace('cool-rain-123456', 'dark-moon-654321'))).not.toBe(identidadBd(directa))
  })
  it('ignora los parámetros de la URL y las credenciales', () => {
    expect(identidadBd('postgresql://otro:otra@ep-cool-rain-123456.eu-central-1.aws.neon.tech/neondb?channel_binding=require')).toBe(identidadBd(directa))
  })
  it('no distingue mayúsculas', () => {
    expect(identidadBd(directa.toUpperCase().replace('POSTGRESQL', 'postgresql'))).toBe(identidadBd(directa))
  })
})
