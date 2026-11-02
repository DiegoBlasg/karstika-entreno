import { describe, expect, it } from 'vitest'
import { uuid } from '../datos/_fabrica'
import type { FilaEscalada } from '../datos/filas'
import { claveNombre, gradosReferencia, pistaLectura, proyectos, proyectosAbiertos, ventanaGrados, vistaNivel } from './nivel'

let n = 0
const esc = (fecha: string, grado: string | null, extra: Partial<FilaEscalada> = {}): FilaEscalada => ({
  id: uuid(500 + n++), fecha, sesion_id: null, tipo: 'via', lugar: 'roca', grado, estilo: 'encadenada', pegues: 1, nombre: null, proyecto: false, ...extra,
})
const perfil = { grado_actual: '6b', grado_objetivo: '7a' }
const HOY = '2026-11-10'

describe('vistaNivel', () => {
  it('sin escaladas: el grado del perfil y lo que falta desde él', () => {
    const v = vistaNivel([], perfil, HOY)
    expect(v.vias).toEqual([])
    expect(v.objetivo).toEqual({ grado: '7a', actual: '6b', desde: 'perfil', escalones: ['6b+', '6c', '6c+', '7a'] })
    expect(v.bloque).toBeNull()
  })
  it('por lugar, roca primero: máximo encadenado y a vista, en 90 días y de siempre', () => {
    const v = vistaNivel([
      esc('2026-06-01', '6c', { lugar: 'roca' }),                     // de siempre, fuera de los 90 días
      esc('2026-10-01', '6b', { lugar: 'roca' }),
      esc('2026-10-05', '6a+', { lugar: 'roca', estilo: 'a-vista' }),
      esc('2026-10-06', '6b', { lugar: 'rocodromo', estilo: 'flash' }),
      esc('2026-10-07', '6c+', { lugar: 'rocodromo' }),
    ], perfil, HOY)
    expect(v.vias).toEqual([
      { lugar: 'roca', encadenado: '6b', encadenadoSiempre: '6c', aVista: '6a+', aVistaSiempre: '6a+' },
      { lugar: 'rocodromo', encadenado: '6c+', encadenadoSiempre: '6c+', aVista: '6b', aVistaSiempre: '6b' },
    ])
    expect(v.objetivo).toEqual({ grado: '7a', actual: '6c', desde: 'roca', escalones: ['6c+', '7a'] })
  })
  it('sin vías en roca, el mayor entre el rocódromo y el perfil; ya en el objetivo, no falta nada', () => {
    expect(vistaNivel([esc('2026-10-07', '6c', { lugar: 'rocodromo' })], perfil, HOY).objetivo).toMatchObject({ desde: 'rocodromo', escalones: ['6c+', '7a'] })
    // Una vía fácil de rocódromo no baja el grado que diste en el perfil.
    expect(vistaNivel([esc('2026-10-07', '5c', { lugar: 'rocodromo' })], perfil, HOY).objetivo).toMatchObject({ desde: 'perfil', actual: '6b' })
    expect(vistaNivel([esc('2026-10-07', '7a+')], perfil, HOY).objetivo.escalones).toEqual([])
  })
  it('el grado del perfil se lee aunque tenga mayúsculas o espacios', () => {
    expect(vistaNivel([], { grado_actual: ' 6B ', grado_objetivo: '7A' }, HOY).objetivo).toMatchObject({ actual: '6b', grado: '7a', escalones: ['6b+', '6c', '6c+', '7a'] })
  })
  it('los días de pegues no son encadenes; los bloques van aparte; lo futuro no cuenta', () => {
    const v = vistaNivel([
      esc('2026-10-01', '7a', { estilo: 'pegues', proyecto: true, nombre: 'Ojo de pez' }),
      esc('2026-10-02', '6B+', { tipo: 'bloque', lugar: 'rocodromo' }),
      esc('2026-12-01', '7b'),
    ], perfil, HOY)
    expect(v.vias).toEqual([])
    expect(v.bloque).toBe('6B+')
  })
  it('un grado del perfil fuera de la escala no da distancia', () => {
    expect(vistaNivel([], { grado_actual: 'V3', grado_objetivo: '7a' }, HOY).objetivo.escalones).toBeNull()
  })
})

describe('proyectos', () => {
  it('se agrupan por nombre (sin mayúsculas ni espacios de más), tipo y lugar; suman pegues y pasan a encadenado', () => {
    const xs = [
      esc('2026-10-01', '7a', { estilo: 'pegues', proyecto: true, nombre: 'Ojo de Pez', pegues: 3 }),
      esc('2026-10-08', null, { estilo: 'pegues', proyecto: true, nombre: ' ojo  de pez ', pegues: 2 }),
      esc('2026-10-15', '7a', { estilo: 'encadenada', proyecto: true, nombre: 'Ojo de pez', pegues: 1 }),
      esc('2026-10-20', '6c+', { estilo: 'pegues', proyecto: true, nombre: 'La fisura', pegues: 4 }),
    ]
    const ps = proyectos(xs, HOY)
    expect(ps).toHaveLength(2)
    expect(ps.find((p) => claveNombre(p.nombre) === 'ojo de pez')).toMatchObject({ grado: '7a', pegues: 6, ultimo: '2026-10-15', encadenado: '2026-10-15' })
    const v = vistaNivel(xs, perfil, HOY)
    expect(v.abiertos.map((p) => p.nombre)).toEqual(['La fisura'])
    expect(v.encadenados.map((p) => p.encadenado)).toEqual(['2026-10-15'])
    expect(v.objetivo).toMatchObject({ actual: '7a', escalones: [] })
  })
})

describe('proyectos: un proyecto se cierra al encadenarlo', () => {
  it('el mismo nombre después del encadene abre otro proyecto', () => {
    const ps = proyectos([
      esc('2026-05-01', '7a', { estilo: 'encadenada', proyecto: true, nombre: 'Ojo de pez' }),
      esc('2026-10-01', '7a+', { estilo: 'pegues', proyecto: true, nombre: 'Ojo de pez', pegues: 2 }),
    ], HOY)
    expect(ps.map((p) => [p.encadenado, p.pegues])).toEqual([[null, 2], ['2026-05-01', 1]])
    expect(ps[0]!.clave).toBe('ojo de pez|via|roca')
  })
  it('mismo nombre en bloque o en rocódromo son proyectos distintos; los abiertos, el más reciente primero', () => {
    const ps = proyectos([
      esc('2026-10-01', null, { estilo: 'pegues', proyecto: true, nombre: 'Rojo' }),
      esc('2026-10-05', null, { estilo: 'pegues', proyecto: true, nombre: 'Rojo', tipo: 'bloque', lugar: 'rocodromo' }),
    ], HOY)
    expect(ps.map((p) => p.clave)).toEqual(['rojo|bloque|rocodromo', 'rojo|via|roca'])
  })
})

describe('dejar un proyecto', () => {
  it('lo cierra: no sale como abierto, no es un encadene y sus pegues no suman el día que lo dejas', () => {
    const xs = [
      esc('2026-10-01', '7a', { estilo: 'pegues', proyecto: true, nombre: 'Ojo de pez', pegues: 3 }),
      esc('2026-10-05', null, { estilo: 'abandonado', proyecto: true, nombre: 'Ojo de pez' }),
    ]
    const [p] = proyectos(xs, HOY)
    expect(p).toMatchObject({ abandonado: '2026-10-05', encadenado: null, pegues: 3 })
    expect(proyectosAbiertos(xs, HOY)).toEqual([])
    const v = vistaNivel(xs, perfil, HOY)
    expect(v.abiertos).toEqual([])
    expect(v.encadenados).toEqual([])
    expect(v.vias).toEqual([])
  })
  it('el mismo nombre después abre otro proyecto', () => {
    const xs = [
      esc('2026-10-05', null, { estilo: 'abandonado', proyecto: true, nombre: 'Ojo de pez' }),
      esc('2026-10-08', null, { estilo: 'pegues', proyecto: true, nombre: 'Ojo de pez', pegues: 2 }),
    ]
    expect(proyectosAbiertos(xs, HOY).map((p) => p.pegues)).toEqual([2])
  })
})

describe('botones de grado', () => {
  it('6 grados: 3 por debajo y 2 por encima de la referencia', () => {
    expect(ventanaGrados('via', '6b')).toEqual(['5c+', '6a', '6a+', '6b', '6b+', '6c'])
    expect(ventanaGrados('bloque', '6A')).toEqual(['4+', '5', '5+', '6A', '6A+', '6B'])
  })
  it('en los bordes de la escala se desplaza para seguir dando 6', () => {
    expect(ventanaGrados('via', '4a')).toEqual(['4a', '4b', '4c', '5a', '5a+', '5b'])
    expect(ventanaGrados('via', '9a')).toHaveLength(6)
    expect(ventanaGrados('via', '9a').at(-1)).toBe('9a')
  })
  it('la referencia: tu nivel en vía y tu mejor bloque, o 6b y 6A', () => {
    expect(gradosReferencia([], { grado_actual: 'V3', grado_objetivo: '7a' }, HOY)).toEqual({ via: '6b', bloque: '6A' })
    expect(gradosReferencia([esc('2026-10-01', '6c'), esc('2026-10-02', '6B+', { tipo: 'bloque', lugar: 'rocodromo' })], perfil, HOY)).toEqual({ via: '6c', bloque: '6B+' })
  })
})

describe('pistaLectura (P-75)', () => {
  it('sale con 4 escalones o más entre a vista y trabajado, y no con 3', () => {
    expect(pistaLectura([esc('2026-10-01', '6a', { estilo: 'a-vista' }), esc('2026-10-02', '6c')], HOY)).toEqual({ lugar: 'roca', aVista: '6a', trabajado: '6c' })
    expect(pistaLectura([esc('2026-10-01', '6a', { estilo: 'a-vista' }), esc('2026-10-02', '6b+')], HOY)).toBeNull()
  })
  it('necesita los dos estilos en el mismo lugar y en los últimos 90 días', () => {
    expect(pistaLectura([esc('2026-10-02', '6c')], HOY)).toBeNull()
    expect(pistaLectura([esc('2026-10-01', '6a', { estilo: 'flash', lugar: 'rocodromo' }), esc('2026-10-02', '6c')], HOY)).toBeNull()
    expect(pistaLectura([esc('2026-06-01', '6a', { estilo: 'a-vista' }), esc('2026-10-02', '6c')], HOY)).toBeNull()
  })
})
