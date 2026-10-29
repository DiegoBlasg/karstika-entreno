import { describe, expect, it } from 'vitest'
import { lastreRepeaters, planificarTemporada } from '../../motor'
import { datosVacios, huecoFila, sesionFila, uuid } from './_fabrica'
import { sumarDias } from '../fecha'
import type { DatosAtleta } from './filas'
import { cambiosPorResultados, PATRON_HABITUAL, proximosDias, vistaAno } from './plan'

// Temporada del perfil de prueba: 2026-11-02 → semana objetivo 2027-10-04. Lunes 2 de noviembre a las 00:00.
const AHORA = { fecha: '2026-11-02', minutos: 0 }

// Datos que el motor rechaza: un registro sin sesión y dos tests el mismo día.
const ROTOS: DatosAtleta = datosVacios({
  evaluaciones: [
    { id: uuid(1), fecha: '2026-11-02', peso_corporal_kg: 70, lastre_kg: 5, resistencia_s: null, tecnica: null },
    { id: uuid(2), fecha: '2026-11-02', peso_corporal_kg: 70, lastre_kg: 6, resistencia_s: null, tecnica: null },
  ],
  registros: [{ sesion_id: uuid(99), rpe: 5, duracion_min: 60, molestias: [], registrado_en: '2026-11-02 10:00:00+00' }],
})

const tipos = (s: { huecos: { sesion?: { tipo: string } }[] }): string[] => s.huecos.flatMap((h) => (h.sesion ? [h.sesion.tipo] : []))

describe('proximosDias', () => {
  it('sin huecos declarados: esta semana y la siguiente con el patrón habitual, orientativas', () => {
    const { semanas } = proximosDias(datosVacios(), AHORA)
    expect(semanas.map((s) => s.lunes)).toEqual(['2026-11-02', '2026-11-09'])
    for (const s of semanas) {
      expect(s.orientativo).toBe(true)
      expect(s.huecos).toHaveLength(PATRON_HABITUAL.length)
      for (const h of s.huecos) expect(h.hueco.id).toMatch(/^patron-\d{4}-\d{2}-\d{2}-\d+$/)
    }
    expect(semanas[0]!.huecos.some((h) => h.estado === 'planeada')).toBe(true)
    expect(semanas[0]!.huecos[0]).toMatchObject({ hueco: { fecha: '2026-11-02', inicio_min: 540, lugar: 'casa', compania: 'solo', minutos: 60 } })
  })

  it('con huecos declarados en una semana se usan esos y la otra sigue con el patrón', () => {
    const d = datosVacios({ huecos: [huecoFila(uuid(101), '2026-11-03', '19:00', { lugar: 'rocodromo', minutos: 90 })] })
    const { semanas } = proximosDias(d, AHORA)
    expect(semanas[0]!.orientativo).toBe(false)
    expect(semanas[0]!.huecos.map((h) => h.hueco.id)).toEqual([uuid(101)])
    expect(['planeada', 'libre']).toContain(semanas[0]!.huecos[0]!.estado)
    expect(semanas[1]!.orientativo).toBe(true)
  })

  it('la semana siguiente tiene en cuenta lo planeado en esta: el test de dedos no sale en las dos', () => {
    // 4 semanas de base con 3 sesiones cada una: el test máximo ya se puede hacer (P-32).
    const sesiones = [0, 1, 2, 3].flatMap((w) => [0, 2, 4].map((dd, i) => sesionFila(uuid(10 + w * 3 + i), sumarDias('2026-11-02', 7 * w + dd))))
    const d = datosVacios({ sesiones })
    // Calculada sola, la semana del 14 de diciembre trae el test.
    expect(tipos(proximosDias(d, { fecha: '2026-12-14', minutos: 0 }).semanas[0]!)).toContain('evaluacion-dedos')
    // Como semana siguiente a la del 7, que ya lo tiene planeado, no.
    const { semanas } = proximosDias(d, { fecha: '2026-12-07', minutos: 0 })
    expect(semanas[1]!.lunes).toBe('2026-12-14')
    expect(tipos(semanas[0]!)).toContain('evaluacion-dedos')
    expect(tipos(semanas[1]!)).not.toContain('evaluacion-dedos')
  })

  it('no toca los datos ni deja sesiones inventadas', () => {
    const d = datosVacios()
    const antes = JSON.stringify(d)
    proximosDias(d, AHORA)
    expect(JSON.stringify(d)).toBe(antes)
  })

  it('una sesión ya aceptada en un hueco del patrón sale como aceptada', () => {
    const d = datosVacios({ sesiones: [sesionFila(uuid(1), '2026-11-03', { horaInicio: 19, duracionMin: 120 })] })
    const martes = proximosDias(d, AHORA).semanas[0]!.huecos.find((h) => h.hueco.fecha === '2026-11-03' && h.hueco.inicio_min === 19 * 60)
    expect(martes).toMatchObject({ estado: 'aceptada', sesion: { tipo: 'tecnica' }, registrada: false })
  })

  it('los huecos pasados de esta semana salen como pasados', () => {
    const { semanas } = proximosDias(datosVacios(), { fecha: '2026-11-03', minutos: 12 * 60 })
    const lunes = semanas[0]!.huecos.filter((h) => h.hueco.fecha === '2026-11-02')
    expect(lunes.map((h) => h.estado)).toEqual(['pasado', 'pasado'])
  })

  it('fuera de temporada: aviso y sin plan', () => {
    const { semanas } = proximosDias(datosVacios(), { fecha: '2026-10-26', minutos: 0 })
    expect(semanas[0]!.aviso).toBe('La temporada empieza el lunes, 2 de noviembre.')
    expect(semanas[0]!.huecos.every((h) => h.estado === 'sin-plan')).toBe(true)
  })

  it('un error del motor no rompe la vista', () => {
    let r: ReturnType<typeof proximosDias> | undefined
    expect(() => {
      r = proximosDias(ROTOS, AHORA)
    }).not.toThrow()
    expect(r!.semanas).toHaveLength(2)
    for (const s of r!.semanas) expect(s.aviso).toMatch(/^No se ha podido calcular el plan de la semana:/)
  })
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
