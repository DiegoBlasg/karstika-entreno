import { describe, expect, it } from 'vitest'
import { contexto, entero, ErrorFormulario, fecha, hora, intentos, molestias, numero, numeroOpcional } from './formulario'

const fd = (campos: Record<string, string>): FormData => {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) f.set(k, v)
  return f
}
const sinMolestias = { dolor_dedos: '0', dolor_muneca: '0', dolor_codo: '0', dolor_hombro: '0', dolor_otra: '0' }

describe('formulario', () => {
  it('números con coma o punto y rango', () => {
    expect(numero(fd({ p: '70,5' }), 'p', 'El peso', 30, 200)).toBe(70.5)
    expect(() => numero(fd({ p: '20' }), 'p', 'El peso', 30, 200)).toThrow('El peso: debe ser un número entre 30 y 200.')
    expect(() => numero(fd({}), 'p', 'El peso', 30, 200)).toThrow(ErrorFormulario)
    expect(numeroOpcional(fd({ p: '' }), 'p', 'La técnica', 1, 7)).toBeNull()
    expect(() => entero(fd({ r: '7.5' }), 'r', 'El RPE', 0, 10)).toThrow('El RPE: debe ser un número entero.')
  })
  it('fechas y horas', () => {
    expect(fecha(fd({ f: '2026-11-03' }), 'f', 'La fecha')).toBe('2026-11-03')
    expect(() => fecha(fd({ f: '2026-02-30' }), 'f', 'La fecha')).toThrow('La fecha: fecha no válida.')
    expect(hora(fd({ h: '19:30' }), 'h', 'La hora')).toBe(19.5)
    expect(() => hora(fd({ h: '25:00' }), 'h', 'La hora')).toThrow('La hora: hora no válida.')
  })
  it('contexto', () => {
    expect(contexto(fd({ compania: 'con-gente', lugar: 'rocodromo', minutos: '120' }))).toEqual({
      compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120,
    })
    expect(() => contexto(fd({ compania: 'perro', lugar: 'rocodromo', minutos: '120' }))).toThrow('Compañía: opción no válida.')
  })
  it('molestias: solo las zonas con dolor o alarma', () => {
    expect(molestias(fd(sinMolestias))).toEqual([])
    expect(molestias(fd({ ...sinMolestias, dolor_dedos: '3', alarma_codo: 'on' }))).toEqual([
      { zona: 'dedos', dolor: 3 },
      { zona: 'codo', dolor: 0, alarma: true },
    ])
    expect(() => molestias(fd({ ...sinMolestias, dolor_hombro: '11' }))).toThrow('Dolor en Hombro: debe ser un número entre 0 y 10.')
  })
  it('intentos al límite', () => {
    expect(intentos(fd({ intento_0: 'encadenado', intento_1: '', intento_2: 'bombeo' }))).toEqual([
      { encadenado: true },
      { encadenado: false, motivoCaida: 'bombeo' },
    ])
    expect(() => intentos(fd({ intento_0: 'lluvia' }))).toThrow('Intento 1: opción no válida.')
  })
})
