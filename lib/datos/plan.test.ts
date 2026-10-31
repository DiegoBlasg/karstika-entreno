import { describe, expect, it } from 'vitest'
import { lastreRepeaters, planificarTemporada } from '../../motor'
import { datosVacios, uuid } from './_fabrica'
import type { DatosAtleta } from './filas'
import { cambiosPorResultados, vistaAno } from './plan'

// Datos que el motor rechaza: un registro sin sesión y dos tests el mismo día.
const ROTOS: DatosAtleta = datosVacios({
  evaluaciones: [
    { id: uuid(1), fecha: '2026-11-02', peso_corporal_kg: 70, lastre_kg: 5, resistencia_s: null, tecnica: null },
    { id: uuid(2), fecha: '2026-11-02', peso_corporal_kg: 70, lastre_kg: 6, resistencia_s: null, tecnica: null },
  ],
  registros: [{ sesion_id: uuid(99), rpe: 5, duracion_min: 60, molestias: [], registrado_en: '2026-11-02 10:00:00+00' }],
})


describe('vistaAno', () => {
  const t = planificarTemporada('2026-11-02', '2027-10-04')
  it('una fila por semana más la semana objetivo, con la actual marcada', () => {
    const { semanas, aviso } = vistaAno(datosVacios(), '2026-12-09')
    expect(aviso).toBeUndefined()
    expect(semanas).toHaveLength(t.semanas.length + 1)
    expect(semanas.filter((s) => s.actual).map((s) => s.lunes)).toEqual(['2026-12-07'])
    expect(semanas[5]).toMatchObject({ lunes: '2026-12-07', ciclo: 1, faseId: 'fuerza', fase: 'Fuerza de dedos', actual: true })
    expect(semanas.at(-1)).toMatchObject({ lunes: '2027-10-04', fase: 'Semana objetivo', objetivo: true })
    expect(semanas.find((s) => s.lunes === '2027-01-18')).toMatchObject({ descarga: true, reevaluar: true })
  })
  it('fuera de temporada ninguna es la actual', () => {
    expect(vistaAno(datosVacios(), '2026-10-28').semanas.some((s) => s.actual)).toBe(false)
  })
  it('un error del motor no rompe la vista', () => {
    let r: ReturnType<typeof vistaAno> | undefined
    expect(() => {
      r = vistaAno(ROTOS, '2026-11-02')
    }).not.toThrow()
    expect(r!.semanas).toEqual([])
    expect(r!.aviso).toMatch(/^No se ha podido calcular el año:/)
  })
})

describe('cambiosPorResultados', () => {
  it('sin test: nada de test ni de carga; el ciclo 2 aún por decidir', () => {
    const c = cambiosPorResultados(datosVacios(), '2026-11-04')
    expect(c.ultimoTest).toBeNull()
    expect(c.repeaters).toBeNull()
    expect(c.sinSubida).toBe(false)
    expect(c.zonas).toEqual([])
    expect(c.descargasAdelantadas).toEqual([])
    expect(c.ciclo2).toMatchObject({ tipo: 'pendiente', fecha: expect.stringMatching(/^2027-/), limitante: expect.any(String) })
    expect(c.aviso).toBeUndefined()
  })

  it('con test vigente: fuerza relativa y lastre de los repeaters del motor', () => {
    const e = { id: uuid(1), fecha: '2026-11-02', peso_corporal_kg: 70, lastre_kg: 10, resistencia_s: null, tecnica: null }
    const c = cambiosPorResultados(datosVacios({ evaluaciones: [e] }), '2026-11-04')
    expect(c.ultimoTest).toMatchObject({ fecha: '2026-11-02', lastreKg: 10, vigente: true })
    expect(c.ultimoTest!.fuerzaRelativa).toBeCloseTo((80 / 70) * 100)
    const motor = { fecha: e.fecha, pesoCorporalKg: 70, lastreKg: 10 }
    expect(c.repeaters).toEqual({ lastreInicial: lastreRepeaters(motor, 0.7), lastreMaximo: lastreRepeaters(motor) })
  })

  it('con el test caducado: sale el test pero no la carga', () => {
    const e = { id: uuid(1), fecha: '2026-11-02', peso_corporal_kg: 70, lastre_kg: 10, resistencia_s: null, tecnica: null }
    const c = cambiosPorResultados(datosVacios({ evaluaciones: [e] }), '2027-02-01')
    expect(c.ultimoTest).toMatchObject({ vigente: false })
    expect(c.repeaters).toBeNull()
  })

  it('zonas que no están en verde', () => {
    const d = datosVacios({ chequeos: [{ fecha: '2026-11-03', sueno: 4, fatiga: 4, ganas: 4, molestias: [{ zona: 'hombro', dolor: 7 }] }] })
    expect(cambiosPorResultados(d, '2026-11-04').zonas).toEqual([{ zona: 'hombro', semaforo: 'rojo' }])
  })

  it('con el ciclo 2 empezado: el reparto fijado y su motivo', () => {
    const c = cambiosPorResultados(datosVacios(), '2027-05-05')
    expect(c.ciclo2).toMatchObject({ tipo: 'fijado', fuerza: expect.any(Number), resistencia: expect.any(Number) })
    if (c.ciclo2?.tipo === 'fijado') expect(c.ciclo2.explicacion.motivo.length).toBeGreaterThan(0)
  })

  it('un error del motor no rompe la vista', () => {
    let r: ReturnType<typeof cambiosPorResultados> | undefined
    expect(() => {
      r = cambiosPorResultados(ROTOS, '2026-11-04')
    }).not.toThrow()
    expect(r!.aviso).toMatch(/^No se ha podido calcular/)
  })
})
