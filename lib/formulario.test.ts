import { describe, expect, it } from 'vitest'
import {
  contexto, detalleRegleta, entero, ErrorFormulario, fecha, hora, inicialEntrenar, intentos, leerEntradaPeticion, molestias, numero, numeroOpcional, opcionOpcional,
} from './formulario'

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
  it('opción opcional', () => {
    expect(opcionOpcional(fd({ a: '' }), 'a', 'El agarre', ['abierto'])).toBeNull()
    expect(opcionOpcional(fd({}), 'a', 'El agarre', ['abierto'])).toBeNull()
    expect(opcionOpcional(fd({ a: 'abierto' }), 'a', 'El agarre', ['abierto'])).toBe('abierto')
    expect(() => opcionOpcional(fd({ a: 'pinza' }), 'a', 'El agarre', ['abierto'])).toThrow('El agarre: opción no válida.')
  })
  it('detalle de regleta: canto y agarre opcionales', () => {
    expect(detalleRegleta(fd({}))).toEqual({})
    expect(detalleRegleta(fd({ regleta_mm: '', agarre: '' }))).toEqual({})
    expect(detalleRegleta(fd({ regleta_mm: '20' }))).toEqual({ regletaMm: 20 })
    expect(detalleRegleta(fd({ regleta_mm: '18,5', agarre: 'semiarqueado' }))).toEqual({ regletaMm: 18.5, agarre: 'semiarqueado' })
    expect(() => detalleRegleta(fd({ regleta_mm: '0' }))).toThrow('La regleta: debe ser un número entre 1 y 100.')
    expect(() => detalleRegleta(fd({ agarre: 'pinza' }))).toThrow('El agarre: opción no válida.')
  })
  describe('leerEntradaPeticion', () => {
    const buena = { fecha: '2026-11-03', horaInicio: 19.5, contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 60 } }
    const con = (cambios: Record<string, unknown>, ctx: Record<string, unknown> = {}) => ({ ...buena, ...cambios, contexto: { ...buena.contexto, ...ctx } })
    it('acepta una petición bien formada y devuelve solo los campos conocidos', () => {
      expect(leerEntradaPeticion({ ...buena, sobra: 1 })).toEqual(buena)
      expect(leerEntradaPeticion(con({ horaInicio: 0 }, { minutosDisponibles: 10 }))).toMatchObject({ horaInicio: 0 })
      expect(leerEntradaPeticion(con({}, { minutosDisponibles: 600, compania: 'con-gente', lugar: 'roca' }))).toMatchObject({
        contexto: { minutosDisponibles: 600, compania: 'con-gente', lugar: 'roca' },
      })
    })
    it('rechaza lo que no es un objeto', () => {
      for (const v of [null, 'x', 3, [], undefined]) expect(() => leerEntradaPeticion(v)).toThrow(ErrorFormulario)
      expect(() => leerEntradaPeticion({ ...buena, contexto: null })).toThrow('El contexto: no es válido.')
    })
    it('fecha', () => {
      expect(() => leerEntradaPeticion(con({ fecha: '2026-02-30' }))).toThrow('El día: fecha no válida.')
      expect(() => leerEntradaPeticion(con({ fecha: '3/11/2026' }))).toThrow('El día: fecha no válida.')
      expect(() => leerEntradaPeticion(con({ fecha: 20261103 }))).toThrow('El día: fecha no válida.')
    })
    it('hora en [0, 24)', () => {
      for (const h of [24, -0.5, Number.NaN, Number.POSITIVE_INFINITY, '19']) {
        expect(() => leerEntradaPeticion(con({ horaInicio: h }))).toThrow('La hora: hora no válida.')
      }
    })
    it('contexto con las mismas opciones y rangos que el formulario', () => {
      expect(() => leerEntradaPeticion(con({}, { compania: 'perro' }))).toThrow('Compañía: opción no válida.')
      expect(() => leerEntradaPeticion(con({}, { lugar: 'playa' }))).toThrow('Lugar: opción no válida.')
      for (const m of [9, 601, 5000, 60.5, '60']) {
        expect(() => leerEntradaPeticion(con({}, { minutosDisponibles: m }))).toThrow('Minutos disponibles')
      }
    })
  })
})

describe('inicialEntrenar', () => {
  it('reemplaza: solo un uuid', () => {
    expect(inicialEntrenar({ reemplaza: '00000000-0000-4000-8000-000000000001' }).reemplaza).toBe('00000000-0000-4000-8000-000000000001')
    expect(inicialEntrenar({ reemplaza: 'x; drop' }).reemplaza).toBeUndefined()
  })
  it('toma los parámetros válidos', () => {
    expect(inicialEntrenar({ fecha: '2026-11-03', hora: '19:00', compania: 'con-gente', lugar: 'rocodromo', minutos: '120' })).toEqual({
      fecha: '2026-11-03', hora: '19:00', compania: 'con-gente', lugar: 'rocodromo', minutos: 120,
    })
  })
  it('ignora los que no valen, uno a uno', () => {
    expect(inicialEntrenar({ fecha: '2026-02-30', hora: '25:00', compania: 'pareja', lugar: ['casa', 'roca'], minutos: '5' })).toEqual({})
    expect(inicialEntrenar({ minutos: '90.5', lugar: 'casa' })).toEqual({ lugar: 'casa' })
    expect(inicialEntrenar({})).toEqual({})
  })
})
