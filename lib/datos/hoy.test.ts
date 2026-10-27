import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import { conAlta } from './cambios'
import { corregible, testsSinResultado, vistaHoy } from './hoy'

describe('vistaHoy', () => {
  it('separa las de hoy, las pasadas sin registrar y las próximas', () => {
    const d = datosVacios({
      sesiones: [sesionFila(uuid(4), '2026-11-05'), sesionFila(uuid(1), '2026-11-01'), sesionFila(uuid(2), '2026-11-02'), sesionFila(uuid(3), '2026-11-03')],
      registros: [{ sesion_id: uuid(2), rpe: 4, duracion_min: 60, molestias: [], registrado_en: 'x' }],
    })
    const v = vistaHoy(d, '2026-11-03')
    expect(v.hoy.map((t) => t.fila.id)).toEqual([uuid(3)])
    expect(v.pendientes.map((t) => t.fila.id)).toEqual([uuid(1)])
    expect(v.proximas.map((t) => t.fila.id)).toEqual([uuid(4)])
    expect(vistaHoy(d, '2026-11-02').hoy[0]?.registro?.rpe).toBe(4)
  })
  it('zonas en rojo y en ámbar según el semáforo del motor', () => {
    const conDolor = (zona: 'hombro' | 'dedos', dolor: number) =>
      datosVacios({ chequeos: [{ fecha: '2026-11-03', sueno: 4, fatiga: 4, ganas: 4, molestias: [{ zona, dolor }] }] })
    expect(vistaHoy(conDolor('hombro', 6), '2026-11-03')).toMatchObject({ zonasRojo: ['hombro'], zonasAmbar: [] })
    expect(vistaHoy(conDolor('dedos', 2), '2026-11-03')).toMatchObject({ zonasRojo: [], zonasAmbar: ['dedos'] })
  })
  it('un alta del mismo día del dolor no levanta el rojo; la del día siguiente sí', () => {
    const d = datosVacios({ chequeos: [{ fecha: '2026-11-03', sueno: 4, fatiga: 4, ganas: 4, molestias: [{ zona: 'hombro', dolor: 6 }] }] })
    const mismoDia = conAlta(d, { id: uuid(1), zona: 'hombro', fecha: '2026-11-03' })
    expect(vistaHoy(mismoDia, '2026-11-03').zonasRojo).toEqual(['hombro'])
    const diaSiguiente = conAlta(d, { id: uuid(2), zona: 'hombro', fecha: '2026-11-04' })
    expect(vistaHoy(diaSiguiente, '2026-11-04').zonasRojo).toEqual([])
  })
  it('recientes: registradas en los 7 días anteriores a hoy, con sus intentos', () => {
    const fechas = ['2026-11-02', '2026-11-03', '2026-11-08', '2026-11-09', '2026-11-10']
    const d = datosVacios({
      sesiones: fechas.map((f, i) => sesionFila(uuid(i + 1), f)),
      registros: [1, 2, 3, 5].map((n) => ({ sesion_id: uuid(n), rpe: 4, duracion_min: 60, molestias: [], registrado_en: 'x' })),
      intentos: [{ id: uuid(20), sesion_id: uuid(3), fecha: '2026-11-08', encadenado: true, motivo_caida: null }],
    })
    const v = vistaHoy(d, '2026-11-10')
    // 02-nov queda fuera (hoy-8), 03-nov es hoy-7 y entra; 09-nov no está registrada; 10-nov es hoy.
    expect(v.recientes.map((t) => t.fila.fecha)).toEqual(['2026-11-03', '2026-11-08'])
    expect(v.recientes[1]?.intentos.map((i) => i.id)).toEqual([uuid(20)])
    expect(v.recientes[0]?.intentos).toEqual([])
    expect(v.pendientes.map((t) => t.fila.fecha)).toEqual(['2026-11-09'])
    expect(v.hoy[0]?.registro).toBeDefined()
  })
  it('corregible: de hoy-7 a hoy, ambos incluidos', () => {
    expect(corregible('2026-11-10', '2026-11-10')).toBe(true)
    expect(corregible('2026-11-03', '2026-11-10')).toBe(true)
    expect(corregible('2026-11-02', '2026-11-10')).toBe(false)
    expect(corregible('2026-11-11', '2026-11-10')).toBe(false)
    expect(corregible('2026-10-28', '2026-11-03')).toBe(true) // cruza de mes
  })
  it('tests de dedos registrados sin resultado en Evaluación', () => {
    const test = (n: number, fecha: string) => sesionFila(uuid(n), fecha, { tipo: 'evaluacion-dedos', intensidad: 'alta' })
    const reg = (n: number) => ({ sesion_id: uuid(n), rpe: 7, duracion_min: 60, molestias: [], registrado_en: 'x' })
    const d = datosVacios({
      sesiones: [test(1, '2026-11-03'), test(2, '2026-12-01'), test(3, '2026-12-08'), sesionFila(uuid(4), '2026-12-02'), test(5, '2026-12-15')],
      registros: [reg(1), reg(2), reg(4), reg(5)], // la del 08-dic no está registrada
      evaluaciones: [{ id: uuid(9), fecha: '2026-11-03', peso_corporal_kg: 70, lastre_kg: 10, resistencia_s: null, tecnica: null }],
    })
    expect(testsSinResultado(d, '2026-12-10')).toEqual(['2026-12-01']) // la del 15-dic es futura
    expect(testsSinResultado(d, '2026-12-15')).toEqual(['2026-12-01', '2026-12-15'])
    expect(testsSinResultado(datosVacios(), '2026-12-15')).toEqual([])
  })
})
