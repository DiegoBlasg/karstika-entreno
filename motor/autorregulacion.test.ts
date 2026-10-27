import { describe, expect, it } from 'vitest'
import { ses } from './_fabrica'
import { estadoAtleta, objetivoRpe, restriccionesDe } from './autorregulacion'
import type { Chequeo, Molestia, RegistroSesion, Seguimiento } from './autorregulacion-tipos'
import { diaNumero, fechaDesdeDia } from './tiempo'
import type { Sesion } from './tipos'

const HOY = '2026-11-20'
const hace = (n: number): string => fechaDesdeDia(diaNumero(HOY) - n)
const seg = (extra: Partial<Seguimiento> = {}): Seguimiento => ({ registros: [], chequeos: [], altas: [], ...extra })
const suave = (id: string, fecha: string, h = 18): Sesion => ses(id, fecha, h, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 60 })
const alta = (id: string, fecha: string, h = 18): Sesion => ses(id, fecha, h, { tipo: 'bloque-limite', intensidad: 'alta', duracionMin: 60 })
const reg = (s: Sesion, rpe: number, molestias: Molestia[] = [], duracionMin = s.duracionMin): RegistroSesion => ({
  sesionId: s.id, fecha: s.fecha, rpe, duracionMin, molestias,
})
const chq = (fecha: string, valor: number, molestias: Molestia[] = []): Chequeo => ({ fecha, sueno: valor, fatiga: valor, ganas: valor, molestias })
const dedos = (dolor: number, alarma?: boolean): Molestia => ({ zona: 'dedos', dolor, ...(alarma !== undefined ? { alarma } : {}) })

describe('semáforo de dolor (P-43, P-44)', () => {
  const zonaDedos = (dolor: number, alarma?: boolean) => {
    const s = suave('a', hace(1))
    return estadoAtleta([s], seg({ registros: [reg(s, 4, [dedos(dolor, alarma)])] }), HOY).zonas.dedos
  }
  it('0-1 verde, 2-3 ámbar, 4 o más rojo', () => {
    expect([0, 1, 2, 3, 4, 10].map((d) => zonaDedos(d))).toEqual(['verde', 'verde', 'ambar', 'ambar', 'rojo', 'rojo'])
  })
  it('una señal de alarma es rojo aunque el dolor sea 0', () => {
    expect(zonaDedos(0, true)).toBe('rojo')
  })
  it('sin datos todo es verde y no hay explicaciones', () => {
    const e = estadoAtleta([], seg(), HOY)
    expect(Object.values(e.zonas).every((z) => z === 'verde')).toBe(true)
    expect(e.explicaciones).toEqual([])
  })
  it('el chequeo de un día va antes que sus registros (se hace al pedir la sesión), y lo futuro no cuenta', () => {
    const s = suave('a', HOY, 10)
    expect(estadoAtleta([s], seg({ registros: [reg(s, 4, [dedos(3)])], chequeos: [chq(HOY, 4, [dedos(0)])] }), HOY).zonas.dedos).toBe('ambar')
    expect(estadoAtleta([s], seg({ registros: [reg(s, 4, [dedos(0)])], chequeos: [chq(HOY, 4, [dedos(3)])] }), HOY).zonas.dedos).toBe('verde')
    const futura = suave('f', '2026-11-25')
    expect(estadoAtleta([futura], seg({ registros: [reg(futura, 4, [dedos(6)])] }), HOY).zonas.dedos).toBe('verde')
  })
  it('una zona no listada en un registro cuenta como dolor 0', () => {
    const a = suave('a', hace(3))
    const b = suave('b', hace(1))
    const e = estadoAtleta([a, b], seg({ registros: [reg(a, 4, [dedos(3)]), reg(b, 4, [{ zona: 'codo', dolor: 1 }])] }), HOY)
    expect(e.zonas.dedos).toBe('verde')
  })
})

describe('molestia persistente y alta (P-45, P-46)', () => {
  it('ámbar en 2 registros seguidos de la misma zona pasa a rojo', () => {
    const a = suave('a', hace(3))
    const b = suave('b', hace(1))
    const e = estadoAtleta([a, b], seg({ registros: [reg(a, 4, [dedos(2)]), reg(b, 4, [dedos(3)])] }), HOY)
    expect(e.zonas.dedos).toBe('rojo')
    expect(e.explicaciones[0]!.motivo).toMatch(/P-45/)
    expect(e.explicaciones[0]!.motivo).toMatch(/no diagnostica/)
  })
  it('un chequeo en ámbar entre dos registros en ámbar no corta la racha de P-45', () => {
    const jueves = suave('j', hace(3), 19)
    const sabado = suave('s', hace(1), 11)
    const e = estadoAtleta(
      [jueves, sabado],
      seg({ registros: [reg(jueves, 4, [dedos(2)]), reg(sabado, 4, [dedos(2)])], chequeos: [chq(hace(1), 4, [dedos(2)])] }),
      HOY,
    )
    expect(e.zonas.dedos).toBe('rojo')
  })
  it('ámbar, verde y ámbar no escala', () => {
    const [a, b, c] = [suave('a', hace(5)), suave('b', hace(3)), suave('c', hace(1))]
    const e = estadoAtleta([a, b, c], seg({ registros: [reg(a, 4, [dedos(2)]), reg(b, 4), reg(c, 4, [dedos(2)])] }), HOY)
    expect(e.zonas.dedos).toBe('ambar')
  })
  it('un ámbar de chequeos sigue ámbar a los 7 días y pasa a rojo a los 8', () => {
    const chequeos = (n: number) => [chq(hace(n), 4, [dedos(2)])]
    expect(estadoAtleta([], seg({ chequeos: chequeos(7) }), HOY).zonas.dedos).toBe('ambar')
    expect(estadoAtleta([], seg({ chequeos: chequeos(8) }), HOY).zonas.dedos).toBe('rojo')
  })
  it('el rojo se queda aunque el dolor baje, hasta un alta posterior (la del mismo día no basta)', () => {
    const a = suave('a', hace(10))
    const base = { registros: [reg(a, 4, [dedos(5)])], chequeos: [chq(hace(2), 4, [dedos(0)])] }
    expect(estadoAtleta([a], seg(base), HOY).zonas.dedos).toBe('rojo')
    expect(estadoAtleta([a], seg({ ...base, altas: [{ zona: 'dedos', fecha: hace(10) }] }), HOY).zonas.dedos).toBe('rojo')
    expect(estadoAtleta([a], seg({ ...base, altas: [{ zona: 'codo', fecha: hace(5) }] }), HOY).zonas.dedos).toBe('rojo')
    expect(estadoAtleta([a], seg({ ...base, altas: [{ zona: 'dedos', fecha: hace(5) }] }), HOY).zonas.dedos).toBe('verde')
  })
  it('un dolor nuevo tras el alta vuelve a contar', () => {
    const a = suave('a', hace(10))
    const e = estadoAtleta(
      [a],
      seg({ registros: [reg(a, 4, [dedos(5)])], altas: [{ zona: 'dedos', fecha: hace(5) }], chequeos: [chq(hace(1), 4, [dedos(4)])] }),
      HOY,
    )
    expect(e.zonas.dedos).toBe('rojo')
  })
})

describe('RPE objetivo y freno (P-11, P-63)', () => {
  it('8 en carga alta, 5 en suave, sin objetivo en test y descanso', () => {
    expect(objetivoRpe(alta('a', HOY))).toBe(8)
    expect(objetivoRpe(suave('a', HOY))).toBe(5)
    expect(objetivoRpe(ses('t', HOY, 18, { tipo: 'evaluacion-dedos', intensidad: 'alta' }))).toBeUndefined()
    expect(objetivoRpe(ses('d', HOY, 18, { tipo: 'descanso', intensidad: 'suave' }))).toBeUndefined()
  })
  it('por encima = RPE × minutos reales mayor que el máximo × minutos previstos (480 sí vale, 481 no)', () => {
    const s = alta('a', hace(1))
    expect(estadoAtleta([s], seg({ registros: [reg(s, 8)] }), HOY).sinSubida).toBe(false)
    expect(estadoAtleta([s], seg({ registros: [reg(s, 8, [], 61)] }), HOY).sinSubida).toBe(true)
    expect(estadoAtleta([s], seg({ registros: [reg(s, 8, [], 61)] }), HOY).sesionesNoValidas).toEqual(['a'])
  })
  it('una sola sesión por encima frena pero no adelanta la descarga', () => {
    const s = alta('a', hace(1))
    const e = estadoAtleta([s], seg({ registros: [reg(s, 9)] }), HOY)
    expect(e.sinSubida).toBe(true)
    expect(e.descargaAdelantada).toBeUndefined()
    expect(e.explicaciones.map((x) => x.regla)).toEqual(['autorregulacion.freno'])
  })
  it('una sesión sin registro o con dolor 2 en dedos o muñeca no vale para progresar', () => {
    const [a, b, c] = [suave('a', hace(5)), suave('b', hace(3)), suave('c', hace(1))]
    const e = estadoAtleta(
      [a, b, c],
      seg({ registros: [reg(b, 4, [{ zona: 'muneca', dolor: 2 }]), reg(c, 4, [{ zona: 'codo', dolor: 3 }])] }),
      HOY,
    )
    expect(e.sesionesNoValidas).toEqual(['a', 'b'])
  })
  it('el ámbar en cualquier zona también frena la subida', () => {
    expect(estadoAtleta([], seg({ chequeos: [chq(HOY, 4, [{ zona: 'otra', dolor: 2 }])] }), HOY).sinSubida).toBe(true)
  })
})

describe('descarga adelantada (P-50, P-65)', () => {
  it('2 sesiones seguidas por encima: descarga de 7 días desde el día siguiente a la segunda', () => {
    const a = alta('a', '2026-11-10')
    const b = alta('b', '2026-11-12')
    const s = seg({ registros: [reg(a, 9), reg(b, 9)] })
    expect(estadoAtleta([a, b], s, '2026-11-12').descargaAdelantada).toBeUndefined()
    expect(estadoAtleta([a, b], s, '2026-11-13').descargaAdelantada).toEqual({ desde: '2026-11-13', hasta: '2026-11-19', motivo: 'rpe' })
    expect(estadoAtleta([a, b], s, '2026-11-19').descargaAdelantada).toBeDefined()
    expect(estadoAtleta([a, b], s, '2026-11-20').descargaAdelantada).toBeUndefined()
  })
  it('una sesión dentro del objetivo en medio corta la racha; el test no cuenta', () => {
    const a = alta('a', '2026-11-08')
    const t = ses('t', '2026-11-10', 18, { tipo: 'evaluacion-dedos', intensidad: 'alta', duracionMin: 60 })
    const m = suave('m', '2026-11-11')
    const b = alta('b', '2026-11-12')
    expect(estadoAtleta([a, m, b], seg({ registros: [reg(a, 9), reg(m, 3), reg(b, 9)] }), '2026-11-13').descargaAdelantada).toBeUndefined()
    expect(estadoAtleta([a, t, b], seg({ registros: [reg(a, 9), reg(t, 10), reg(b, 9)] }), '2026-11-13').descargaAdelantada?.motivo).toBe('rpe')
  })
  it('3 chequeos bajos dentro de 7 días adelantan la descarga desde el tercero; con el primero hace 7 días, no', () => {
    const dentro = seg({ chequeos: [chq(hace(6), 2), chq(hace(3), 1), chq(HOY, 2)] })
    expect(estadoAtleta([], dentro, HOY).descargaAdelantada).toEqual({ desde: HOY, hasta: fechaDesdeDia(diaNumero(HOY) + 6), motivo: 'bienestar' })
    const fuera = seg({ chequeos: [chq(hace(7), 2), chq(hace(3), 1), chq(HOY, 2)] })
    expect(estadoAtleta([], fuera, HOY).descargaAdelantada).toBeUndefined()
    const unoBien = seg({ chequeos: [chq(hace(6), 2), chq(hace(3), 3), chq(HOY, 2)] })
    expect(estadoAtleta([], unoBien, HOY).descargaAdelantada).toBeUndefined()
  })
  it('chequeo de hoy bajo: media 2 o menos (2,33 no lo es)', () => {
    expect(estadoAtleta([], seg({ chequeos: [chq(HOY, 2)] }), HOY).chequeoBajoHoy).toBe(true)
    expect(estadoAtleta([], seg({ chequeos: [{ fecha: HOY, sueno: 2, fatiga: 2, ganas: 3, molestias: [] }] }), HOY).chequeoBajoHoy).toBe(false)
    expect(estadoAtleta([], seg({ chequeos: [chq(hace(1), 1)] }), HOY).chequeoBajoHoy).toBe(false)
  })
})

describe('retorno tras una molestia (P-46)', () => {
  it('da la fecha de inicio de cada episodio de molestia en dedos o muñeca, de registro o de chequeo', () => {
    const a = suave('a', hace(9))
    const s = seg({
      registros: [reg(a, 4, [dedos(2)])],
      chequeos: [chq(hace(8), 4, [dedos(2)]), chq(hace(6), 4), chq(hace(4), 4, [{ zona: 'muneca', dolor: 3 }]), chq(hace(1), 4)],
    })
    expect(estadoAtleta([a], s, HOY).molestiasP46).toEqual([hace(9), hace(4)])
    expect(estadoAtleta([], seg({ chequeos: [chq(hace(4), 4, [{ zona: 'codo', dolor: 3 }])] }), HOY).molestiasP46).toEqual([])
  })
})

describe('sesiones válidas: RPE por encima del máximo e incompletas (P-11, P-63)', () => {
  it('un RPE por encima del máximo es por encima aunque la sesión fuera corta; menos del 90 % no está completada', () => {
    const s = alta('a', hace(1))
    expect(estadoAtleta([s], seg({ registros: [reg(s, 10, [], 40)] }), HOY).sinSubida).toBe(true)
    const e = estadoAtleta([s], seg({ registros: [reg(s, 6, [], 53)] }), HOY)
    expect(e.sinSubida).toBe(false)
    expect(e.sesionesNoValidas).toEqual(['a'])
    expect(estadoAtleta([s], seg({ registros: [reg(s, 6, [], 54)] }), HOY).sesionesNoValidas).toEqual([])
  })
  it('las sesiones sin registro se listan aparte para poder explicarlo', () => {
    expect(estadoAtleta([suave('a', hace(1))], seg(), HOY).sesionesSinRegistro).toEqual(['a'])
  })
})

describe('alta y ámbar persistente', () => {
  it('tras un alta con la zona aún en ámbar, la cuenta de 7 días vuelve a empezar desde el alta', () => {
    const base = { chequeos: [chq(hace(20), 4, [dedos(2)])], altas: [{ zona: 'dedos' as const, fecha: hace(10) }] }
    expect(estadoAtleta([], seg(base), fechaDesdeDia(diaNumero(HOY) - 3)).zonas.dedos).toBe('ambar')
    expect(estadoAtleta([], seg(base), HOY).zonas.dedos).toBe('rojo')
  })
})

describe('restricciones (P-64)', () => {
  const con = (molestias: Molestia[], valor = 4) => restriccionesDe(estadoAtleta([], seg({ chequeos: [chq(HOY, valor, molestias)] }), HOY))
  it('ámbar en dedos, muñeca, codo u hombro: sin carga alta ni dominadas', () => {
    for (const zona of ['dedos', 'muneca', 'codo', 'hombro'] as const) {
      expect(con([{ zona, dolor: 2 }]), zona).toMatchObject({ sinCargaAlta: true, sinDominadas: true, soloHombro: false, soloDescanso: false })
    }
    expect(con([{ zona: 'hombro', dolor: 2 }]).hombroSinCarga).toBe(true)
    expect(con([{ zona: 'codo', dolor: 2 }]).hombroSinCarga).toBe(true)
    expect(con([{ zona: 'muneca', dolor: 2 }]).hombroSinCarga).toBe(false)
  })
  it('ámbar en otra: solo sin sesiones al límite', () => {
    expect(con([{ zona: 'otra', dolor: 3 }])).toEqual({
      sinCargaAlta: false, sinLimite: true, soloHombro: false, soloDescanso: false, hombroSinCarga: false, sinDominadas: false,
    })
  })
  it('rojo en dedos, muñeca o codo: solo hombro sin carga; rojo en hombro u otra: solo descanso', () => {
    expect(con([{ zona: 'codo', dolor: 5 }])).toMatchObject({ soloHombro: true, hombroSinCarga: true, soloDescanso: false })
    expect(con([{ zona: 'hombro', dolor: 5 }])).toMatchObject({ soloHombro: false, soloDescanso: true })
    expect(con([{ zona: 'otra', dolor: 5 }])).toMatchObject({ soloDescanso: true, sinDominadas: true })
    expect(con([dedos(5), { zona: 'otra', dolor: 6 }])).toMatchObject({ soloHombro: false, soloDescanso: true })
  })
  it('chequeo de hoy bajo: sin carga alta ni dominadas', () => {
    expect(con([], 1)).toMatchObject({ sinCargaAlta: true, sinDominadas: true, soloHombro: false })
  })
})

describe('validación del seguimiento', () => {
  const s = suave('a', hace(1))
  const lanza = (x: Partial<Seguimiento>, re: RegExp) => expect(() => estadoAtleta([s], seg(x), HOY)).toThrow(re)
  it('rechaza datos fuera de rango o incoherentes', () => {
    lanza({ registros: [reg(s, 11)] }, /RPE/)
    lanza({ registros: [reg(s, 4, [], 0)] }, /duracionMin/)
    lanza({ registros: [reg(s, 4, [dedos(2.5)])] }, /entero de 0 a 10/)
    lanza({ registros: [reg(s, 4, [dedos(2), dedos(3)])] }, /dos veces/)
    lanza({ registros: [reg(s, 4, [{ zona: 'rodilla' as never, dolor: 2 }])] }, /zona desconocida/)
    lanza({ registros: [{ ...reg(s, 4), sesionId: 'x' }] }, /no está en el historial/)
    lanza({ registros: [{ ...reg(s, 4), fecha: hace(2) }] }, /no es la de la sesión/)
    lanza({ registros: [reg(s, 4), reg(s, 5)] }, /dos registros/)
    lanza({ chequeos: [chq(HOY, 6)] }, /entero de 1 a 5/)
    lanza({ chequeos: [chq(HOY, 3), chq(HOY, 4)] }, /mismo día/)
    lanza({ chequeos: [chq('2026-02-30', 3)] }, /no existe/)
    lanza({ altas: [{ zona: 'pie' as never, fecha: HOY }] }, /zona desconocida/)
  })
  it('es determinista y no muta sus entradas', () => {
    const datos = seg({ registros: [reg(s, 9, [dedos(2)])], chequeos: [chq(HOY, 2)] })
    const antes = structuredClone(datos)
    expect(estadoAtleta([s], datos, HOY)).toEqual(estadoAtleta([s], datos, HOY))
    expect(datos).toEqual(antes)
  })
})
