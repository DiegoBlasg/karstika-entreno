import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import type { FilaRegistro } from './filas'
import { progresoLargo, textoReunion, tituloLargo } from './largo'

const registro = (id: string): FilaRegistro => ({ sesion_id: id, rpe: 6, duracion_min: 60, molestias: [], registrado_en: '2026-12-01 20:00:00+00' })

describe('progresoLargo', () => {
  it('fuera de temporada devuelve null', () => {
    expect(progresoLargo(datosVacios(), '2026-10-20')).toBeNull()
  })

  it('primer miércoles de base: largo 1 de 8 y el primer test en la fuerza', () => {
    expect(progresoLargo(datosVacios(), '2026-11-04')).toEqual({
      largo: 1, totalLargos: 8, ciclo: 1, faseId: 'base', fase: 'Base técnica y adaptación', semanaDeFase: 1, semanasDeFase: 4,
      descarga: false, sesionesHechas: 0, proximaReunion: { lunes: '2027-01-18', enSemanas: 11 }, enCima: false,
    })
  })

  it('en fuerza cuenta solo las registradas del largo, sin descansos ni futuras', () => {
    const sesiones = [
      sesionFila(uuid(1), '2026-11-28'),                       // antes del largo
      sesionFila(uuid(2), '2026-11-30'),                       // primer día del largo
      sesionFila(uuid(3), '2026-12-02'),
      sesionFila(uuid(4), '2026-12-03'),                       // sin registrar
      sesionFila(uuid(5), '2026-12-05', { tipo: 'descanso' }), // descanso
      sesionFila(uuid(6), '2026-12-10'),                       // después de hoy
    ]
    const registros = [uuid(1), uuid(2), uuid(3), uuid(5), uuid(6)].map(registro)
    const p = progresoLargo(datosVacios({ sesiones, registros }), '2026-12-09')
    expect(p).toMatchObject({ largo: 2, faseId: 'fuerza', semanaDeFase: 2, semanasDeFase: 8, sesionesHechas: 2 })
    expect(p?.proximaReunion).toEqual({ lunes: '2027-01-18', enSemanas: 6 })
  })

  it('la semana del test tiene la reunión «esta semana»', () => {
    expect(progresoLargo(datosVacios(), '2027-01-20')?.proximaReunion).toEqual({ lunes: '2027-01-18', enSemanas: 0 })
  })

  it('la semana objetivo es la cima, sin más reuniones', () => {
    expect(progresoLargo(datosVacios(), '2027-10-06')).toMatchObject({ enCima: true, proximaReunion: null, largo: 8, totalLargos: 8 })
  })
})

describe('textos', () => {
  const base = progresoLargo(datosVacios(), '2026-11-04')!
  it('reunión', () => {
    expect(textoReunion({ ...base, proximaReunion: { lunes: '2027-01-18', enSemanas: 0 } })).toBe('Test esta semana')
    expect(textoReunion({ ...base, proximaReunion: { lunes: '2027-01-18', enSemanas: 1 } })).toBe('Test la semana que viene')
    expect(textoReunion({ ...base, proximaReunion: { lunes: '2027-01-18', enSemanas: 11 } })).toBe('Test en 11 semanas')
    expect(textoReunion({ ...base, proximaReunion: null })).toBe('No quedan tests en la temporada')
    expect(textoReunion({ ...base, enCima: true, proximaReunion: null })).toBe('Semana objetivo: a por la cima')
  })
  it('título', () => {
    expect(tituloLargo(base)).toBe('Base técnica y adaptación')
    expect(tituloLargo({ ...base, descarga: true })).toBe('Base técnica y adaptación · descarga')
    expect(tituloLargo({ ...base, enCima: true })).toBe('Semana objetivo')
  })
})
