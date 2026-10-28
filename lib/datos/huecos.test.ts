import { describe, expect, it } from 'vitest'
import { datosVacios, huecoFila, sesionFila, uuid } from './_fabrica'
import { entradaDeHueco, huecoMotor, huecosPosteriores, MAX_HUECOS_SEMANA, sesionEnHueco, validarHuecoNuevo } from './huecos'
import type { EntradaPeticion } from './peticion'

// Semana del lunes 2026-11-02 al domingo 2026-11-08.
const LUN_M = huecoFila(uuid(101), '2026-11-02', '09:00')
const LUN_T = huecoFila(uuid(102), '2026-11-02', '19:00', { lugar: 'rocodromo', minutos: 90 })
const MAR_T = huecoFila(uuid(103), '2026-11-03', '19:00', { lugar: 'rocodromo', compania: 'con-gente', minutos: 120 })
const JUE_T = huecoFila(uuid(104), '2026-11-05', '19:00', { lugar: 'rocodromo', minutos: 90 })
const OTRA_SEMANA = huecoFila(uuid(105), '2026-11-09', '09:00')

describe('huecoMotor y entradaDeHueco', () => {
  it('pasan los minutos a horas y copian el contexto', () => {
    expect(huecoMotor(LUN_T)).toEqual({ fecha: '2026-11-02', horaInicio: 19, contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 90 } })
    expect(entradaDeHueco(huecoFila(uuid(1), '2026-11-02', '09:30'))).toEqual({
      fecha: '2026-11-02', horaInicio: 9.5, contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 60 },
    })
  })
})

describe('sesionEnHueco', () => {
  it('una sesión que se solapa con el hueco lo ocupa; una que acaba justo al empezar, no', () => {
    const solapa = sesionFila(uuid(1), '2026-11-02', { horaInicio: 19.5, duracionMin: 60 })
    const antes = sesionFila(uuid(2), '2026-11-02', { horaInicio: 18, duracionMin: 60 })
    expect(sesionEnHueco(datosVacios({ sesiones: [solapa] }), LUN_T)?.id).toBe(uuid(1))
    expect(sesionEnHueco(datosVacios({ sesiones: [antes] }), LUN_T)).toBeUndefined()
  })
})

describe('huecosPosteriores', () => {
  const d = datosVacios({ huecos: [JUE_T, LUN_M, MAR_T, LUN_T, OTRA_SEMANA] })
  it('sin huecos declarados en la semana devuelve undefined', () => {
    expect(huecosPosteriores(datosVacios({ huecos: [OTRA_SEMANA] }), entradaDeHueco(LUN_M))).toBeUndefined()
  })
  it('desde un hueco: los de después en la misma semana, en orden', () => {
    expect(huecosPosteriores(d, entradaDeHueco(LUN_M))?.map((h) => `${h.fecha} ${h.horaInicio}`)).toEqual([
      '2026-11-02 19', '2026-11-03 19', '2026-11-05 19',
    ])
  })
  it('el último hueco de la semana: lista vacía', () => {
    expect(huecosPosteriores(d, entradaDeHueco(JUE_T))).toEqual([])
  })
  it('quita los ocupados por una sesión y los que se solapan con la sesión pedida', () => {
    const ocupado = datosVacios({ huecos: d.huecos, sesiones: [sesionFila(uuid(1), '2026-11-03', { horaInicio: 19, duracionMin: 120 })] })
    expect(huecosPosteriores(ocupado, entradaDeHueco(LUN_M))?.map((h) => h.fecha)).toEqual(['2026-11-02', '2026-11-05'])
    const larga: EntradaPeticion = { fecha: '2026-11-02', horaInicio: 18, contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 120 } }
    expect(huecosPosteriores(d, larga)?.map((h) => h.fecha)).toEqual(['2026-11-03', '2026-11-05'])
  })
  it('una sesión improvisada no supera los topes del motor (8 huecos, 2 por día contando la pedida)', () => {
    const dias = ['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']
    const muchos = dias.flatMap((f, i) => [huecoFila(uuid(200 + 2 * i), f, '09:00'), huecoFila(uuid(201 + 2 * i), f, '19:00')])
    const mismoDia = [huecoFila(uuid(300), '2026-11-02', '12:00'), huecoFila(uuid(301), '2026-11-02', '19:00')]
    const improvisada: EntradaPeticion = { fecha: '2026-11-02', horaInicio: 8, contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 60 } }
    const r = huecosPosteriores(datosVacios({ huecos: [...muchos, ...mismoDia] }), improvisada)!
    expect(r.length).toBe(8)
    expect(r.filter((h) => h.fecha === '2026-11-02').length).toBe(1)
  })
})

describe('validarHuecoNuevo', () => {
  const HOY = '2026-11-02'
  it('acepta un hueco válido', () => {
    expect(() => validarHuecoNuevo(datosVacios(), LUN_T, HOY)).not.toThrow()
  })
  it('rechaza días pasados y fuera de esta semana o la siguiente', () => {
    expect(() => validarHuecoNuevo(datosVacios(), huecoFila(uuid(1), '2026-11-01', '09:00'), HOY)).toThrow('No puedes añadir huecos en días pasados.')
    expect(() => validarHuecoNuevo(datosVacios(), huecoFila(uuid(1), '2026-11-16', '09:00'), HOY)).toThrow('Solo puedes declarar huecos de esta semana y de la siguiente.')
  })
  it('rechaza el 10.º de la semana, el 3.º del día y los solapes', () => {
    const nueve = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'].flatMap((f, i) => [
      huecoFila(uuid(10 + 2 * i), f, '09:00'), huecoFila(uuid(11 + 2 * i), f, '19:00'),
    ]).concat(huecoFila(uuid(30), '2026-11-06', '09:00'))
    expect(nueve.length).toBe(MAX_HUECOS_SEMANA)
    expect(() => validarHuecoNuevo(datosVacios({ huecos: nueve }), huecoFila(uuid(1), '2026-11-07', '09:00'), HOY)).toThrow('Como mucho 9 huecos por semana.')
    const dos = datosVacios({ huecos: [LUN_M, LUN_T] })
    expect(() => validarHuecoNuevo(dos, huecoFila(uuid(1), '2026-11-02', '14:00'), HOY)).toThrow('Como mucho 2 huecos por día.')
    const uno = datosVacios({ huecos: [LUN_T] })
    expect(() => validarHuecoNuevo(uno, huecoFila(uuid(1), '2026-11-02', '20:00'), HOY)).toThrow('Se solapa con otro hueco de ese día.')
    expect(() => validarHuecoNuevo(uno, huecoFila(uuid(1), '2026-11-02', '20:30'), HOY)).not.toThrow() // 19:00 + 90 min = 20:30
  })
  it('rechaza horas y minutos fuera de rango', () => {
    expect(() => validarHuecoNuevo(datosVacios(), huecoFila(uuid(1), HOY, '23:30', { minutos: 60 }), HOY)).toThrow('El hueco no puede pasar de la medianoche.')
    expect(() => validarHuecoNuevo(datosVacios(), huecoFila(uuid(1), HOY, '09:00', { minutos: 5 }), HOY)).toThrow('Minutos disponibles: entre 10 y 600.')
  })
})
