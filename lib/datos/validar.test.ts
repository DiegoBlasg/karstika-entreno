import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import { validarDatos } from './validar'

const ev = (n: number, fecha: string) => ({ id: uuid(n), fecha, peso_corporal_kg: 70, lastre_kg: 10, resistencia_s: null, tecnica: null })

describe('validarDatos', () => {
  it('acepta datos coherentes', () => {
    expect(() => validarDatos(datosVacios({
      sesiones: [sesionFila(uuid(1), '2026-11-03')],
      registros: [{ sesion_id: uuid(1), rpe: 5, duracion_min: 60, molestias: [], registrado_en: 'x' }],
      evaluaciones: [ev(2, '2026-11-04')],
      intentos: [{ id: uuid(3), sesion_id: uuid(1), fecha: '2026-11-03', encadenado: false, motivo_caida: 'bombeo' }],
    }))).not.toThrow()
  })
  it('rechaza un RPE fuera de rango (lo dice el motor)', () => {
    expect(() => validarDatos(datosVacios({
      sesiones: [sesionFila(uuid(1), '2026-11-03')],
      registros: [{ sesion_id: uuid(1), rpe: 11, duracion_min: 60, molestias: [], registrado_en: 'x' }],
    }))).toThrow('el RPE debe estar entre 0 y 10')
  })
  it('rechaza dos evaluaciones el mismo día', () => {
    expect(() => validarDatos(datosVacios({ evaluaciones: [ev(1, '2026-11-04'), ev(2, '2026-11-04')] }))).toThrow('Hay dos evaluaciones el mismo día')
  })
  it('rechaza un intento sin sesión o con otra fecha', () => {
    const intento = { id: uuid(3), sesion_id: uuid(1), fecha: '2026-11-04', encadenado: true, motivo_caida: null }
    expect(() => validarDatos(datosVacios({ intentos: [intento] }))).toThrow(`El intento ${uuid(3)} no tiene sesión`)
    expect(() => validarDatos(datosVacios({ sesiones: [sesionFila(uuid(1), '2026-11-03')], intentos: [intento] }))).toThrow(
      `El intento ${uuid(3)} no tiene la fecha de su sesión`,
    )
  })
})
