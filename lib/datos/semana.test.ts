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
  it('los huecos de casa que el plan deja libres traen el descanso activo', () => {
    // Cuatro mañanas en casa (sin multipresa) en la base: el hombro va 2 veces y en días no seguidos (P-41); el resto,
    // libre.
    const mananas = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05'].map((f, i) => huecoFila(uuid(200 + i), f, '09:00'))
    const v = vistaSemana(datosVacios({ huecos: mananas }), LUNES, ANTES)
    const libres = v.huecos.filter((h) => h.estado.tipo === 'libre')
    expect(libres.length).toBeGreaterThan(0)
    for (const h of libres) expect(h.estado).toEqual({ tipo: 'libre', descansoActivo: true })
  })
  it('con una zona en rojo no hay plan de la semana', () => {
    const d = datosVacios({
      huecos: [LUN_M, MAR_T, JUE_T],
      chequeos: [{ fecha: '2026-11-01', sueno: 4, fatiga: 4, ganas: 4, molestias: [{ zona: 'hombro', dolor: 7 }] }],
    })
    const v = vistaSemana(d, LUNES, ANTES)
    expect(v.aviso).toBe(AVISO_ROJO)
    // El primero queda libre por el rojo, no por el plan: sin descanso activo.
    expect(v.huecos[0]?.estado).toEqual({ tipo: 'libre', descansoActivo: false })
    expect(v.huecos.slice(1).map((h) => h.estado.tipo)).toEqual(['sin-plan', 'sin-plan'])
  })
})

describe('un error del motor no tumba la vista', () => {
  // 70 kg + 50 kg de lastre con 1,5 años escalando: el motor lo rechaza por poco plausible, pero la evaluación se guarda.
  const d = datosVacios({
    huecos: [LUN_M],
    evaluaciones: [{ id: uuid(9), fecha: '2026-11-02', peso_corporal_kg: 70, lastre_kg: 50, resistencia_s: null, tecnica: null }],
  })
  it('vistaSemana deja el hueco sin plan y avisa', () => {
    let v: ReturnType<typeof vistaSemana> | undefined
    expect(() => {
      v = vistaSemana(d, LUNES, ANTES)
    }).not.toThrow()
    expect(v?.huecos[0]?.estado.tipo).toBe('sin-plan')
    expect(v?.aviso).toMatch(/^No se ha podido calcular el plan de la semana:/)
  })
  it('con datos que no dejan calcular la temporada tampoco lanza', () => {
    const rotos = datosVacios({
      huecos: [LUN_M],
      evaluaciones: [
        { id: uuid(1), fecha: '2026-11-02', peso_corporal_kg: 70, lastre_kg: 5, resistencia_s: null, tecnica: null },
        { id: uuid(2), fecha: '2026-11-02', peso_corporal_kg: 70, lastre_kg: 6, resistencia_s: null, tecnica: null },
      ],
    })
    let v: ReturnType<typeof vistaSemana> | undefined
    expect(() => {
      v = vistaSemana(rotos, LUNES, ANTES)
    }).not.toThrow()
    expect(v?.fase).toBeNull()
    expect(v?.aviso).toMatch(/^No se ha podido calcular el plan de la semana:/)
  })
  it('proximoHueco no lanza', () => {
    expect(() => proximoHueco(d, ANTES)).not.toThrow()
  })
})

describe('proximoHueco', () => {
  it('el primer hueco ni pasado ni ocupado de la semana actual', () => {
    const d = datosVacios({ huecos: [LUN_M, MAR_T] })
    expect(proximoHueco(d, { fecha: '2026-11-02', minutos: 11 * 60 })?.fila.id).toBe(uuid(102))
    expect(proximoHueco(d, { fecha: '2026-11-04', minutos: 0 })).toBeUndefined()
  })
})
