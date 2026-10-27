import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import { conAlta } from './cambios'
import { vistaHoy } from './hoy'

describe('vistaHoy', () => {
  it('separa las de hoy, las pasadas sin registrar y las próximas', () => {
    const d = datosVacios({
      sesiones: [sesionFila(uuid(4), '2026-11-05'), sesionFila(uuid(1), '2026-11-01'), sesionFila(uuid(2), '2026-11-02'), sesionFila(uuid(3), '2026-11-03')],
      registros: [{ sesion_id: uuid(2), rpe: 4, duracion_min: 60, molestias: [], registrado_en: 'x' }],
    })
    const v = vistaHoy(d, '2026-11-03')
    expect(v.hoy.map((t) => t.fila.id)).toEqual([uuid(3)])
    expect(v.pendientes.map((t) => t.fila.id)).toEqual([uuid(1)])
    expect(v.proximas.map((t) => t.fila.id)).toEqual([uuid(4)])
    expect(vistaHoy(d, '2026-11-02').hoy[0]?.registro?.rpe).toBe(4)
  })
  it('zonas en rojo y en ámbar según el semáforo del motor', () => {
    const conDolor = (zona: 'hombro' | 'dedos', dolor: number) =>
      datosVacios({ chequeos: [{ fecha: '2026-11-03', sueno: 4, fatiga: 4, ganas: 4, molestias: [{ zona, dolor }] }] })
    expect(vistaHoy(conDolor('hombro', 6), '2026-11-03')).toMatchObject({ zonasRojo: ['hombro'], zonasAmbar: [] })
    expect(vistaHoy(conDolor('dedos', 2), '2026-11-03')).toMatchObject({ zonasRojo: [], zonasAmbar: ['dedos'] })
  })
  it('un alta del mismo día del dolor no levanta el rojo; la del día siguiente sí', () => {
    const d = datosVacios({ chequeos: [{ fecha: '2026-11-03', sueno: 4, fatiga: 4, ganas: 4, molestias: [{ zona: 'hombro', dolor: 6 }] }] })
    const mismoDia = conAlta(d, { id: uuid(1), zona: 'hombro', fecha: '2026-11-03' })
    expect(vistaHoy(mismoDia, '2026-11-03').zonasRojo).toEqual(['hombro'])
    const diaSiguiente = conAlta(d, { id: uuid(2), zona: 'hombro', fecha: '2026-11-04' })
    expect(vistaHoy(diaSiguiente, '2026-11-04').zonasRojo).toEqual([])
  })
})
