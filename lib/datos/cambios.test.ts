import { describe, expect, it } from 'vitest'
import type { SesionPlan } from '../../motor'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import { conChequeo, conRegistro, conSesion, filaSesionAceptada, filaSesionLibre, sinSesion } from './cambios'

const plan: SesionPlan = {
  sesion: { id: 'propuesta-tecnica', tipo: 'tecnica', intensidad: 'suave', fecha: '2026-11-03', horaInicio: 19, duracionMin: 60 },
  bloques: [],
  explicaciones: [],
}
const registro = (id: string) => ({ sesion_id: id, rpe: 5, duracion_min: 60, molestias: [], registrado_en: 'x' })

describe('cambios', () => {
  it('aceptar una propuesta le pone un id propio sin tocar el resto', () => {
    const f = filaSesionAceptada(plan, uuid(1))
    expect(f).toEqual({ id: uuid(1), fecha: '2026-11-03', sesion: { ...plan.sesion, id: uuid(1) }, propuesta: { ...plan, sesion: { ...plan.sesion, id: uuid(1) } }, origen: 'propuesta' })
    expect(plan.sesion.id).toBe('propuesta-tecnica')
  })
  it('sesión libre', () => {
    expect(filaSesionLibre({ id: uuid(2), tipo: 'bloque-limite', intensidad: 'alta', fecha: '2026-11-03', horaInicio: 18, duracionMin: 90 })).toEqual({
      id: uuid(2),
      fecha: '2026-11-03',
      sesion: { id: uuid(2), tipo: 'bloque-limite', intensidad: 'alta', fecha: '2026-11-03', horaInicio: 18, duracionMin: 90 },
      propuesta: null,
      origen: 'libre',
    })
  })
  it('un chequeo por día: el nuevo sustituye al del mismo día', () => {
    const c = (fecha: string, sueno: number) => ({ fecha, sueno, fatiga: 3, ganas: 3, molestias: [] })
    const d = conChequeo(conChequeo(datosVacios(), c('2026-11-03', 2)), c('2026-11-03', 4))
    expect(d.chequeos).toEqual([c('2026-11-03', 4)])
    expect(conChequeo(d, c('2026-11-02', 3)).chequeos.map((x) => x.fecha)).toEqual(['2026-11-02', '2026-11-03'])
  })
  it('añadir y quitar sesiones', () => {
    const d = conSesion(datosVacios(), sesionFila(uuid(1), '2026-11-03'))
    expect(() => conSesion(d, sesionFila(uuid(1), '2026-11-04'))).toThrow(`La sesión ${uuid(1)} ya existe`)
    const conTodo = conRegistro(d, registro(uuid(1)), [{ id: uuid(7), sesion_id: uuid(1), fecha: '2026-11-03', encadenado: true, motivo_caida: null }])
    const sin = sinSesion(conTodo, uuid(1))
    expect([sin.sesiones, sin.registros, sin.intentos]).toEqual([[], [], []])
  })
  it('registrar: la sesión tiene que existir y solo se registra una vez', () => {
    expect(() => conRegistro(datosVacios(), registro(uuid(1)), [])).toThrow('Esa sesión ya no existe.')
    const d = conRegistro(conSesion(datosVacios(), sesionFila(uuid(1), '2026-11-03')), registro(uuid(1)), [])
    expect(() => conRegistro(d, registro(uuid(1)), [])).toThrow('Esa sesión ya está registrada.')
  })
})
