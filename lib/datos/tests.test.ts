import { describe, expect, it } from 'vitest'
import { datosVacios, uuid } from './_fabrica'
import type { FilaEvaluacion, FilaPruebaCasa } from './filas'
import { vistaTests } from './tests'

const ev = (n: number, fecha: string, extra: Partial<FilaEvaluacion> = {}): FilaEvaluacion =>
  ({ id: uuid(100 + n), fecha, peso_corporal_kg: 70, lastre_kg: 0, resistencia_s: null, tecnica: null, ...extra })
const casa = (n: number, fecha: string, dominadas: number | null, cadera: number | null): FilaPruebaCasa =>
  ({ id: uuid(300 + n), fecha, dominadas, cadera_cm: cadera })
const fila = (v: ReturnType<typeof vistaTests>, id: string) => v.filas.find((f) => f.id === id)

describe('vistaTests', () => {
  it('sin tests no hay filas', () => {
    expect(vistaTests(datosVacios(), '2026-11-10')).toEqual({ filas: [], antiguos73: [] })
  })
  it('una fila por prueba con datos, en orden fijo, con su último valor', () => {
    const v = vistaTests(datosVacios({
      evaluaciones: [ev(1, '2026-11-01', { lastre_kg: 7, colgado_30_s: 40, power_slap_cm: 50 })],
      pruebasCasa: [casa(1, '2026-11-03', 8, null)],
    }), '2026-11-10')
    expect(v.filas.map((f) => f.id)).toEqual(['fuerza', 'colgado', 'power-slap', 'dominadas'])
    expect(fila(v, 'fuerza')).toMatchObject({ ultimo: expect.closeTo(110, 5), fecha: '2026-11-01', cambio: null, real: null })
    expect(fila(v, 'dominadas')).toMatchObject({ ultimo: 8, fecha: '2026-11-03' })
  })
  it('fuerza: cambio real desde un 10 % sobre el anterior; por debajo, dentro del margen', () => {
    const margen = vistaTests(datosVacios({ evaluaciones: [ev(1, '2026-10-01', { lastre_kg: 0 }), ev(2, '2026-11-01', { lastre_kg: 6 })] }), '2026-11-10')
    expect(fila(margen, 'fuerza')).toMatchObject({ ultimo: expect.closeTo(108.57, 1), real: null })
    const real = vistaTests(datosVacios({ evaluaciones: [ev(1, '2026-10-01', { lastre_kg: 0 }), ev(2, '2026-11-01', { lastre_kg: 7 })] }), '2026-11-10')
    expect(fila(real, 'fuerza')).toMatchObject({ ultimo: expect.closeTo(110, 5), cambio: expect.closeTo(10, 5), real: 'mejora' })
  })
  it('colgado: 25 %; power slap: 10 cm; dominadas: 2; cadera: 3 cm y menos es mejor', () => {
    const v = vistaTests(datosVacios({
      evaluaciones: [ev(1, '2026-10-01', { colgado_30_s: 40, power_slap_cm: 50 }), ev(2, '2026-11-01', { colgado_30_s: 49, power_slap_cm: 40 })],
      pruebasCasa: [casa(1, '2026-10-03', 6, 60), casa(2, '2026-11-03', 7, 56)],
    }), '2026-11-10')
    expect(fila(v, 'colgado')).toMatchObject({ cambio: 9, real: null })
    expect(fila(v, 'power-slap')).toMatchObject({ cambio: -10, real: 'empeora' })
    expect(fila(v, 'dominadas')).toMatchObject({ cambio: 1, real: null })
    expect(fila(v, 'cadera')).toMatchObject({ cambio: -4, real: 'mejora' })
  })
  it('power slap: también cuenta un 15 % aunque no llegue a 10 cm', () => {
    const v = vistaTests(datosVacios({ evaluaciones: [ev(1, '2026-10-01', { power_slap_cm: 40 }), ev(2, '2026-11-01', { power_slap_cm: 47 })] }), '2026-11-10')
    expect(fila(v, 'power-slap')).toMatchObject({ cambio: 7, cambioPct: expect.closeTo(17.5, 5), real: 'mejora', umbral: '10 cm o 15 %' })
  })
  it('el colgado se compara solo con los del mismo protocolo (con o sin descarga)', () => {
    const v = vistaTests(datosVacios({
      evaluaciones: [
        ev(1, '2026-09-01', { colgado_30_s: 40 }), ev(2, '2026-10-01', { colgado_30_s: 8, colgado_con_descarga: true }), ev(3, '2026-11-01', { colgado_30_s: 42 }),
      ],
    }), '2026-11-10')
    expect(fila(v, 'colgado')).toMatchObject({ ultimo: 42, cambio: 2, medidas: 2 })
    expect(fila(v, 'colgado')?.conDescarga).toBeUndefined()
  })
  it('tres medidas seguidas en la misma dirección cuentan como cambio real aunque cada paso sea pequeño', () => {
    const v = vistaTests(datosVacios({ pruebasCasa: [casa(1, '2026-09-01', 5, null), casa(2, '2026-10-01', 6, null), casa(3, '2026-11-01', 7, null)] }), '2026-11-10')
    expect(fila(v, 'dominadas')).toMatchObject({ cambio: 1, real: 'mejora', medidas: 3 })
  })
  it('los 7:3 antiguos van aparte y no hacen fila; lo futuro no cuenta', () => {
    const v = vistaTests(datosVacios({
      evaluaciones: [ev(1, '2026-10-01', { resistencia_s: 95 }), ev(2, '2026-12-01', { colgado_30_s: 40 })],
    }), '2026-11-10')
    expect(v.filas.map((f) => f.id)).toEqual(['fuerza'])
    expect(v.antiguos73).toEqual([{ fecha: '2026-10-01', segundos: 95 }])
  })
})
