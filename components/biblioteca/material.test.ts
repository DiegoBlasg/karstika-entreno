import { describe, expect, it } from 'vitest'
import { FICHAS } from '../../lib/biblioteca/fichas'
import { piezasMaterial, resumenMaterial } from './material'

describe('material de las fichas', () => {
  it('«Ninguno» se enseña como «Sin material»', () => {
    expect(resumenMaterial('Ninguno')).toBe('Sin material')
    expect(piezasMaterial('Ninguno')).toEqual(['Sin material'])
  })

  it('con algo tras el «;», la lista enseña eso y los chips llevan las dos cosas', () => {
    const m = 'Ninguno; presas fáciles o vías y bloques por debajo de tu nivel'
    expect(resumenMaterial(m)).toBe('Presas fáciles o vías y bloques por debajo de tu nivel')
    expect(piezasMaterial(m)).toEqual(['Sin material', 'presas fáciles o vías y bloques por debajo de tu nivel'])
  })

  it('el resto, la primera pieza en la lista y todas en los chips', () => {
    expect(resumenMaterial('Multipresa, regleta de 20 mm')).toBe('Multipresa')
    expect(piezasMaterial('Barra y lastre (cinturón o mochila)')).toEqual(['Barra y lastre (cinturón o mochila)'])
  })

  it('ninguna ficha enseña «Ninguno»', () => {
    for (const f of Object.values(FICHAS)) {
      expect(resumenMaterial(f.material)).not.toMatch(/^ningun/i)
      for (const p of piezasMaterial(f.material)) expect(p).not.toMatch(/^ningun/i)
    }
  })
})
