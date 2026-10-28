import { describe, expect, it } from 'vitest'
import { datosVacios, huecoFila, sesionFila, uuid } from './_fabrica'
import { AVISO_ROJO, proximoHueco, vistaSemana } from './semana'

const LUNES = '2026-11-02'
const LUN_M = huecoFila(uuid(101), '2026-11-02', '09:00')
const MAR_T = huecoFila(uuid(102), '2026-11-03', '19:00', { compania: 'con-gente', lugar: 'rocodromo', minutos: 120 })
const JUE_T = huecoFila(uuid(103), '2026-11-05', '19:00', { lugar: 'rocodromo', minutos: 90 })
const ANTES = { fecha: '2026-11-01', minutos: 12 * 60 }

describe('vistaSemana', () => {
  it('semana vacía: sin huecos ni aviso, con la fase', () => {
    const v = vistaSemana(datosVacios(), LUNES, ANTES)
    expect(v).toMatchObject({ lunes: LUNES, domingo: '2026-11-08', huecos: [], fase: { nombre: expect.any(String), descarga: false } })
    expect(v.aviso).toBeUndefined()
  })
  it('planea cada hueco pendiente: el primero con la propuesta y el resto con el plan', () => {
    const v = vistaSemana(datosVacios({ huecos: [JUE_T, LUN_M, MAR_T] }), LUNES, ANTES)
    expect(v.huecos.map((h) => h.fila.id)).toEqual([uuid(101), uuid(102), uuid(103)])
    for (const h of v.huecos) expect(['planeado', 'libre']).toContain(h.estado.tipo)
    expect(v.huecos.some((h) => h.estado.tipo === 'planeado')).toBe(true)
    expect(v.aviso).toBeUndefined()
  })
  it('pasado y ocupado', () => {
    const sesion = sesionFila(uuid(1), '2026-11-03', { horaInicio: 19, duracionMin: 120 })
    const d = datosVacios({ huecos: [LUN_M, MAR_T, JUE_T], sesiones: [sesion] })
    const v = vistaSemana(d, LUNES, { fecha: '2026-11-02', minutos: 10 * 60 }) // lunes a las 10:00: el de las 9 ya acabó
    expect(v.huecos.map((h) => h.estado.tipo)).toEqual(['pasado', 'ocupado', expect.stringMatching(/planeado|libre/)])
    expect(v.huecos[1]?.estado).toMatchObject({ tipo: 'ocupado', registrada: false })
  })
  it('sin huecos pendientes: aviso', () => {
    const v = vistaSemana(datosVacios({ huecos: [LUN_M] }), LUNES, { fecha: '2026-11-09', minutos: 0 })
    expect(v.huecos[0]?.estado.tipo).toBe('pasado')
    expect(v.aviso).toBe('No te quedan huecos pendientes esta semana.')
  })
  it('fuera de temporada: aviso y sin plan', () => {
    const v = vistaSemana(datosVacios({ huecos: [huecoFila(uuid(1), '2026-10-29', '19:00')] }), '2026-10-26', { fecha: '2026-10-26', minutos: 0 })
    expect(v.aviso).toBe('La temporada empieza el lunes, 2 de noviembre.')
    expect(v.huecos[0]?.estado.tipo).toBe('sin-plan')
    expect(v.fase).toBeNull()
  })
  it('con una zona en rojo no hay plan de la semana', () => {
    const d = datosVacios({
      huecos: [LUN_M, MAR_T, JUE_T],
      chequeos: [{ fecha: '2026-11-01', sueno: 4, fatiga: 4, ganas: 4, molestias: [{ zona: 'hombro', dolor: 7 }] }],
    })
    const v = vistaSemana(d, LUNES, ANTES)
    expect(v.aviso).toBe(AVISO_ROJO)
    expect(v.huecos.slice(1).map((h) => h.estado.tipo)).toEqual(['sin-plan', 'sin-plan'])
  })
})

describe('proximoHueco', () => {
  it('el primer hueco ni pasado ni ocupado de la semana actual', () => {
    const d = datosVacios({ huecos: [LUN_M, MAR_T] })
    expect(proximoHueco(d, { fecha: '2026-11-02', minutos: 11 * 60 })?.fila.id).toBe(uuid(102))
    expect(proximoHueco(d, { fecha: '2026-11-04', minutos: 0 })).toBeUndefined()
  })
})
