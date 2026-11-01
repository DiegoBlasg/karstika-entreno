import { describe, expect, it } from 'vitest'
import { sesionFila, uuid } from '../datos/_fabrica'
import type { FilaSesion } from '../datos/filas'
import { escaladasDelRegistro, escaladaSuelta, lugarDeSesion, PROYECTO_NUEVO, tipoDeSesion } from './formulario'
import type { Proyecto } from './nivel'

const fd = (campos: Record<string, string>): FormData => {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) f.set(k, v)
  return f
}
const bloque = sesionFila(uuid(1), '2026-11-10', { tipo: 'bloque-limite', intensidad: 'alta' })
const pegues = sesionFila(uuid(2), '2026-11-10', { tipo: 'pegues-proyecto', intensidad: 'alta' })
const enRoca: FilaSesion = {
  ...sesionFila(uuid(3), '2026-11-10', { tipo: 'via-cuerda-limite', intensidad: 'alta' }),
  propuesta: { sesion: sesionFila(uuid(3), '2026-11-10').sesion, bloques: [], explicaciones: [], contexto: { compania: 'con-gente', lugar: 'roca', minutosDisponibles: 120 } },
}
const abierto: Proyecto = { nombre: 'Ojo de Pez', tipo: 'via', lugar: 'roca', grado: '7a', pegues: 3, ultimo: '2026-11-01', encadenado: null }

describe('lugar y tipo de la sesión', () => {
  it('pegues en roca; si no, el sitio con que se generó (rocódromo por defecto); bloque en bloque y board', () => {
    expect(lugarDeSesion(pegues)).toBe('roca')
    expect(lugarDeSesion(enRoca)).toBe('roca')
    expect(lugarDeSesion(bloque)).toBe('rocodromo')
    expect(tipoDeSesion(bloque)).toBe('bloque')
    expect(tipoDeSesion(enRoca)).toBe('via')
  })
})

describe('escaladasDelRegistro', () => {
  it('sin «encadené» no hay encadenes; con él, las líneas con grado', () => {
    expect(escaladasDelRegistro(fd({ esc_tipo_0: 'bloque', esc_grado_0: '6B', esc_estilo_0: 'flash' }), bloque, [])).toEqual([])
    const xs = escaladasDelRegistro(fd({
      encadene: 'on',
      esc_tipo_0: 'bloque', esc_grado_0: '6B', esc_estilo_0: 'flash',
      esc_tipo_1: 'bloque', esc_grado_1: '', esc_estilo_1: 'encadenada',
      esc_tipo_2: 'via', esc_grado_2: '6b+', esc_estilo_2: 'encadenada',
    }), bloque, [])
    expect(xs.map((x) => [x.tipo, x.grado, x.estilo, x.lugar, x.sesion_id, x.fecha])).toEqual([
      ['bloque', '6B', 'flash', 'rocodromo', uuid(1), '2026-11-10'],
      ['via', '6b+', 'encadenada', 'rocodromo', uuid(1), '2026-11-10'],
    ])
  })
  it('rechaza un grado de la otra escala', () => {
    expect(() => escaladasDelRegistro(fd({ encadene: 'on', esc_tipo_0: 'via', esc_grado_0: '6B', esc_estilo_0: 'flash' }), bloque, [])).toThrow(/escala de vías/)
  })
  it('pegues a un proyecto abierto: una fila de pegues con su grado; si cayó, encadenada', () => {
    const [p] = escaladasDelRegistro(fd({ proy: 'ojo de pez', proy_pegues: '4' }), pegues, [abierto])
    expect(p).toMatchObject({ nombre: 'Ojo de Pez', proyecto: true, estilo: 'pegues', pegues: 4, grado: '7a', lugar: 'roca', tipo: 'via' })
    const [c] = escaladasDelRegistro(fd({ proy: 'Ojo de Pez', proy_pegues: '2', proy_cayo: 'on' }), pegues, [abierto])
    expect(c).toMatchObject({ estilo: 'encadenada', pegues: 2, grado: '7a' })
  })
  it('proyecto nuevo: nombre y grado obligatorios', () => {
    const [n] = escaladasDelRegistro(fd({ proy: PROYECTO_NUEVO, proy_nombre: 'La fisura', proy_grado: '6c+', proy_pegues: '1' }), pegues, [])
    expect(n).toMatchObject({ nombre: 'La fisura', grado: '6c+', estilo: 'pegues', proyecto: true })
    expect(() => escaladasDelRegistro(fd({ proy: PROYECTO_NUEVO, proy_grado: '6c+', proy_pegues: '1' }), pegues, [])).toThrow(/nombre/)
    expect(() => escaladasDelRegistro(fd({ proy: PROYECTO_NUEVO, proy_nombre: 'X', proy_pegues: '1' }), pegues, [])).toThrow(/grado/)
    expect(() => escaladasDelRegistro(fd({ proy: 'Otro', proy_pegues: '1' }), pegues, [abierto])).toThrow(/ya no está abierto/)
  })
  it('sin proyecto elegido, nada de proyecto; fuera de pegues-proyecto se ignora', () => {
    expect(escaladasDelRegistro(fd({ proy: '' }), pegues, [abierto])).toEqual([])
    expect(escaladasDelRegistro(fd({ proy: 'Ojo de Pez', proy_pegues: '2' }), enRoca, [abierto])).toEqual([])
  })
})

describe('escaladaSuelta', () => {
  const HOY = '2026-11-10'
  it('una vía a vista en roca', () => {
    expect(escaladaSuelta(fd({ fecha: '2026-11-08', tipo: 'via', lugar: 'roca', grado: '6a+', estilo: 'a-vista' }), HOY))
      .toMatchObject({ fecha: '2026-11-08', sesion_id: null, tipo: 'via', lugar: 'roca', grado: '6a+', estilo: 'a-vista', proyecto: false, pegues: 1, nombre: null })
  })
  it('pegues: siempre proyecto, con nombre; el grado es opcional', () => {
    expect(escaladaSuelta(fd({ fecha: HOY, tipo: 'via', lugar: 'roca', estilo: 'pegues', nombre: 'Ojo de pez', pegues: '3' }), HOY))
      .toMatchObject({ proyecto: true, grado: null, pegues: 3 })
    expect(() => escaladaSuelta(fd({ fecha: HOY, tipo: 'via', lugar: 'roca', estilo: 'pegues' }), HOY)).toThrow(/nombre/)
  })
  it('fechas: ni futuras ni de hace más de 30 días; encadene sin grado no vale', () => {
    expect(() => escaladaSuelta(fd({ fecha: '2026-11-11', tipo: 'via', lugar: 'roca', grado: '6a', estilo: 'flash' }), HOY)).toThrow(/futura/)
    expect(() => escaladaSuelta(fd({ fecha: '2026-10-10', tipo: 'via', lugar: 'roca', grado: '6a', estilo: 'flash' }), HOY)).toThrow(/30 días/)
    expect(() => escaladaSuelta(fd({ fecha: HOY, tipo: 'via', lugar: 'roca', estilo: 'flash' }), HOY)).toThrow(/grado/)
  })
})
