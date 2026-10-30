import { describe, expect, it } from 'vitest'
import { PESTANAS, pestanaActiva } from './pestanas'

describe('pestañas', () => {
  it('son cinco y en este orden', () => {
    expect(PESTANAS.map((p) => [p.id, p.href, p.etiqueta])).toEqual([
      ['hoy', '/', 'Hoy'], ['via', '/via', 'Vía'], ['semana', '/semana', 'Semana'], ['progreso', '/progreso', 'Progreso'], ['yo', '/perfil', 'Yo'],
    ])
  })
  it.each([
    ['/', 'hoy'], ['/via', 'via'], ['/semana', 'semana'], ['/semana?lunes=2026-11-02', 'semana'], ['/entrenar', 'semana'],
    ['/progreso', 'progreso'], ['/perfil', 'yo'], ['/biblioteca', 'yo'], ['/biblioteca/hombro-a', 'yo'], ['/fuentes/x', 'yo'],
  ])('%s → %s', (ruta, id) => {
    expect(pestanaActiva(ruta)).toBe(id)
  })
  it('rutas que solo empiezan igual no cuentan', () => {
    expect(pestanaActiva('/viajes')).toBeNull()
    expect(pestanaActiva('/semanal')).toBeNull()
    expect(pestanaActiva('/muestrario')).toBeNull()
  })
})
