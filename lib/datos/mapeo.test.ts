import { describe, expect, it } from 'vitest'
import { datosVacios, PERFIL, sesionFila, uuid } from './_fabrica'
import {
  consejosMostradosMotor, evaluacionesMotor, evaluacionMotor, evaluacionParaFecha, historialMotor, intentosMotor, perfilMotor, seguimientoMotor,
} from './mapeo'

describe('mapeo filas → motor', () => {
  it('perfil', () => {
    expect(perfilMotor({ ...PERFIL, lesiones: ['polea A2 (2025)'] })).toEqual({ pesoKg: 70, anosEscalando: 1.5, lesiones: ['polea A2 (2025)'] })
  })
  it('evaluación: los nulos no se pasan', () => {
    const base = { id: uuid(1), fecha: '2026-11-04', peso_corporal_kg: 70, lastre_kg: 10, resistencia_s: null, tecnica: null }
    expect(evaluacionMotor(base)).toEqual({ fecha: '2026-11-04', pesoCorporalKg: 70, lastreKg: 10 })
    expect(evaluacionMotor({ ...base, resistencia_s: 95, tecnica: 4 })).toEqual({
      fecha: '2026-11-04', pesoCorporalKg: 70, lastreKg: 10, resistenciaS: 95, tecnica: 4,
    })
  })
  it('evaluaciones en orden y la vigente para una fecha es la última no posterior', () => {
    const ev = (n: number, fecha: string) => ({ id: uuid(n), fecha, peso_corporal_kg: 70, lastre_kg: n, resistencia_s: null, tecnica: null })
    const lista = evaluacionesMotor([ev(2, '2026-12-20'), ev(1, '2026-11-04')])
    expect(lista.map((e) => e.fecha)).toEqual(['2026-11-04', '2026-12-20'])
    expect(evaluacionParaFecha(lista, '2026-11-03')).toBeUndefined()
    expect(evaluacionParaFecha(lista, '2026-11-04')?.lastreKg).toBe(1)
    expect(evaluacionParaFecha(lista, '2027-01-10')?.lastreKg).toBe(2)
  })
  it('historial ordenado por fecha y hora, con el id y la fecha de la fila', () => {
    const tarde = sesionFila(uuid(1), '2026-11-03', { horaInicio: 19 })
    const manana = sesionFila(uuid(2), '2026-11-03', { horaInicio: 9 })
    const antes = sesionFila(uuid(3), '2026-11-01')
    expect(historialMotor([tarde, manana, antes]).map((s) => s.id)).toEqual([uuid(3), uuid(2), uuid(1)])
    const rara = { ...tarde, sesion: { ...tarde.sesion, id: 'otro' } }
    expect(historialMotor([rara])[0]!.id).toBe(uuid(1))
  })
  it('seguimiento: cada registro lleva la fecha de su sesión', () => {
    const d = datosVacios({
      sesiones: [sesionFila(uuid(1), '2026-11-03')],
      registros: [{ sesion_id: uuid(1), rpe: 6, duracion_min: 55, molestias: [{ zona: 'dedos', dolor: 2 }], registrado_en: 'x' }],
      chequeos: [{ fecha: '2026-11-03', sueno: 4, fatiga: 3, ganas: 5, molestias: [] }],
      altas: [{ id: uuid(9), zona: 'hombro', fecha: '2026-11-04' }],
    })
    expect(seguimientoMotor(d)).toEqual({
      registros: [{ sesionId: uuid(1), fecha: '2026-11-03', rpe: 6, duracionMin: 55, molestias: [{ zona: 'dedos', dolor: 2 }] }],
      chequeos: [{ fecha: '2026-11-03', sueno: 4, fatiga: 3, ganas: 5, molestias: [] }],
      altas: [{ zona: 'hombro', fecha: '2026-11-04' }],
    })
  })
  it('un registro de una sesión que no existe es un error', () => {
    const d = datosVacios({ registros: [{ sesion_id: uuid(1), rpe: 6, duracion_min: 55, molestias: [], registrado_en: 'x' }] })
    expect(() => seguimientoMotor(d)).toThrow(`El registro de la sesión ${uuid(1)} no tiene sesión`)
  })
  it('intentos y consejos', () => {
    expect(intentosMotor([
      { id: uuid(1), sesion_id: uuid(5), fecha: '2026-11-03', encadenado: true, motivo_caida: null },
      { id: uuid(2), sesion_id: uuid(5), fecha: '2026-11-03', encadenado: false, motivo_caida: 'bombeo' },
    ])).toEqual([{ fecha: '2026-11-03', encadenado: true }, { fecha: '2026-11-03', encadenado: false, motivoCaida: 'bombeo' }])
    expect(consejosMostradosMotor([{ consejo_id: 'sueno', fecha: '2026-11-03' }])).toEqual([{ id: 'sueno', fecha: '2026-11-03' }])
  })
})
