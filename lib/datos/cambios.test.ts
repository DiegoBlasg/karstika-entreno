import { describe, expect, it } from 'vitest'
import { validarSesion, type SesionPlan } from '../../motor'
import { datosVacios, PERFIL, sesionFila, uuid } from './_fabrica'
import { perfilMotor } from './mapeo'
import { conAlta, conChequeo, conRegistro, conRegistroCorregido, conSesion, filaSesionAceptada, datosSinReemplazada, filaSesionLibre, sinSesion } from './cambios'

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
  it('sesión libre con el detalle de la regleta; vacío no se guarda', () => {
    const base = { id: uuid(3), tipo: 'multipresa-resistencia', intensidad: 'alta', fecha: '2026-11-07', horaInicio: 10, duracionMin: 45 } as const
    expect(filaSesionLibre({ ...base, detalle: { regletaMm: 20, agarre: 'semiarqueado' } }).sesion).toEqual({
      ...base, detalle: { regletaMm: 20, agarre: 'semiarqueado' },
    })
    expect(filaSesionLibre({ ...base, detalle: { regletaMm: 22 } }).sesion.detalle).toEqual({ regletaMm: 22 })
    expect('detalle' in filaSesionLibre({ ...base, detalle: {} }).sesion).toBe(false)
    expect('detalle' in filaSesionLibre(base).sesion).toBe(false)
  })
  it('con el canto apuntado, la multipresa libre de un novel ya no da el aviso de la regleta', () => {
    const base = { id: uuid(3), tipo: 'multipresa-resistencia', intensidad: 'alta', fecha: '2026-11-07', horaInicio: 10, duracionMin: 45 } as const
    const reglas = (detalle?: { regletaMm?: number }) =>
      validarSesion(filaSesionLibre({ ...base, ...(detalle ? { detalle } : {}) }).sesion, [], perfilMotor(PERFIL)).map((v) => v.regla)
    expect(reglas()).toContain('seguridad.regleta')
    expect(reglas({ regletaMm: 20 })).not.toContain('seguridad.regleta')
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
  it('conAlta añade el alta sin tocar los datos originales', () => {
    const d = datosVacios()
    const nuevo = conAlta(d, { id: uuid(9), zona: 'hombro', fecha: '2026-11-04' })
    expect(nuevo.altas).toEqual([{ id: uuid(9), zona: 'hombro', fecha: '2026-11-04' }])
    expect(d.altas).toEqual([])
  })
  it('corregir un registro sustituye el registro y los intentos de esa sesión, nada más', () => {
    const intento = (n: number, sesion: string, encadenado: boolean) => ({
      id: uuid(n), sesion_id: sesion, fecha: '2026-11-03', encadenado, motivo_caida: encadenado ? null : ('bombeo' as const),
    })
    let d = conSesion(conSesion(datosVacios(), sesionFila(uuid(1), '2026-11-03')), sesionFila(uuid(2), '2026-11-03', { horaInicio: 10 }))
    d = conRegistro(d, { ...registro(uuid(1)), registrado_en: 'antes' }, [intento(10, uuid(1), true), intento(11, uuid(1), false)])
    d = conRegistro(d, registro(uuid(2)), [intento(12, uuid(2), true)])
    const nuevo = { sesion_id: uuid(1), rpe: 8, duracion_min: 75, molestias: [{ zona: 'dedos' as const, dolor: 2 }], registrado_en: 'ahora' }
    const c = conRegistroCorregido(d, nuevo, [intento(13, uuid(1), false)])
    expect(c.registros.find((r) => r.sesion_id === uuid(1))).toEqual({ ...nuevo, registrado_en: 'antes' })
    expect(c.registros.find((r) => r.sesion_id === uuid(2))).toEqual(registro(uuid(2)))
    expect(c.intentos.map((i) => i.id).sort()).toEqual([uuid(12), uuid(13)])
    expect(d.registros.find((r) => r.sesion_id === uuid(1))?.rpe).toBe(5) // no muta
    expect(conRegistroCorregido(d, nuevo, []).intentos.map((i) => i.id)).toEqual([uuid(12)])
  })
  it('corregir: la sesión tiene que estar registrada y los intentos ser suyos', () => {
    const d = conSesion(datosVacios(), sesionFila(uuid(1), '2026-11-03'))
    expect(() => conRegistroCorregido(d, registro(uuid(1)), [])).toThrow('Esa sesión no está registrada.')
    const r = conRegistro(d, registro(uuid(1)), [])
    const ajeno = { id: uuid(5), sesion_id: uuid(2), fecha: '2026-11-03', encadenado: true, motivo_caida: null }
    expect(() => conRegistroCorregido(r, registro(uuid(1)), [ajeno])).toThrow('Los intentos tienen que ser de la misma sesión.')
  })
})

describe('datosSinReemplazada', () => {
  const HOY = '2026-11-05'
  it('quita la sesión de hoy sin registrar', () => {
    const d = datosVacios({ sesiones: [sesionFila(uuid(1), HOY), sesionFila(uuid(2), HOY, { horaInicio: 9 })] })
    expect(datosSinReemplazada(d, uuid(1), HOY, HOY).sesiones.map((s) => s.id)).toEqual([uuid(2)])
  })
  it('rechaza la que no existe, la de otro día y la registrada', () => {
    const d = datosVacios({
      sesiones: [sesionFila(uuid(1), HOY), sesionFila(uuid(2), '2026-11-06')],
      registros: [{ sesion_id: uuid(1), rpe: 5, duracion_min: 60, molestias: [], registrado_en: 'x' }],
    })
    expect(() => datosSinReemplazada(d, uuid(9), HOY, HOY)).toThrow('La sesión que querías cambiar ya no existe.')
    expect(() => datosSinReemplazada(d, uuid(2), HOY, HOY)).toThrow('Solo puedes cambiar sesiones de hoy.')
    expect(() => datosSinReemplazada(d, uuid(1), HOY, HOY)).toThrow('Esa sesión ya está registrada: no se puede cambiar.')
  })
  it('rechaza una sesión nueva que no es de hoy', () => {
    const d = datosVacios({ sesiones: [sesionFila(uuid(1), HOY)] })
    expect(() => datosSinReemplazada(d, uuid(1), HOY, '2026-11-06')).toThrow('La sesión que la sustituye también tiene que ser de hoy.')
    expect(datosSinReemplazada(d, uuid(1), HOY, HOY).sesiones).toEqual([])
  })
})
