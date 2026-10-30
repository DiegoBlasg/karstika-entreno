import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import type { FilaEvaluacion, FilaRegistro } from './filas'
import { vistaVia } from './via'

const evaluacion = (n: number, fecha: string, lastre: number): FilaEvaluacion =>
  ({ id: uuid(100 + n), fecha, peso_corporal_kg: 70, lastre_kg: lastre, resistencia_s: null, tecnica: null })
const registro = (id: string): FilaRegistro => ({ sesion_id: id, rpe: 6, duracion_min: 60, molestias: [], registrado_en: '2026-12-01 20:00:00+00' })

describe('vistaVia', () => {
  it('8 largos; base sin reunión; fuerza con 8 chapas, dos descargas y la reunión del 18 de enero', () => {
    const v = vistaVia(datosVacios(), '2026-12-09')
    expect(v.aviso).toBeUndefined()
    expect(v.largos).toHaveLength(8)
    const [base, fuerza] = v.largos
    expect(base).toMatchObject({ numero: 1, faseId: 'base', estado: 'hecho', reunion: null })
    expect(base!.chapas).toHaveLength(4)
    expect(fuerza).toMatchObject({ numero: 2, faseId: 'fuerza', estado: 'actual', ciclo: 1 })
    expect(fuerza!.chapas.map((c) => c.estado)).toEqual(['hecho', 'actual', 'futuro', 'futuro', 'futuro', 'futuro', 'futuro', 'futuro'])
    expect(fuerza!.chapas.filter((c) => c.descarga).map((c) => c.lunes)).toEqual(['2026-12-21', '2027-01-18'])
    expect(fuerza!.reunion).toEqual({ lunes: '2027-01-18', estado: 'proxima', resultado: null })
    expect(v.largos[2]!.reunion).toMatchObject({ lunes: '2027-03-01', estado: 'futura' })
    expect(v.largos.slice(2).every((l) => l.estado === 'futuro')).toBe(true)
    expect(v.cima).toEqual(expect.objectContaining({ lunes: '2027-10-04', actual: false, grado: '7a' }))
  })

  it('la reunión hecha lleva el último test de su semana y la siguiente pasa a ser la próxima', () => {
    const evaluaciones = [evaluacion(1, '2026-10-20', 5), evaluacion(2, '2027-01-19', 8), evaluacion(3, '2027-01-21', 10)]
    const v = vistaVia(datosVacios({ evaluaciones }), '2027-01-27')
    const fuerza = v.largos[1]!
    expect(fuerza.estado).toBe('hecho')
    expect(fuerza.reunion?.estado).toBe('hecha')
    expect(fuerza.reunion?.resultado).toMatchObject({ fecha: '2027-01-21', lastreKg: 10 })
    expect(fuerza.reunion?.resultado?.fuerzaRelativa).toBeCloseTo(114.29, 2)
    expect(v.largos[2]!.reunion?.estado).toBe('proxima')
    expect(v.tests.map((t) => t.fecha)).toEqual(['2026-10-20', '2027-01-19', '2027-01-21'])
  })

  it('una semana de test que pasó sin resultado queda «sin-hacer»', () => {
    const v = vistaVia(datosVacios(), '2027-01-27')
    expect(v.largos[1]!.reunion?.estado).toBe('sin-hacer')
    expect(v.largos[2]!.reunion?.estado).toBe('proxima')
  })

  it('cuenta en cada chapa las sesiones registradas de esa semana, sin descansos ni futuras', () => {
    const sesiones = [
      sesionFila(uuid(1), '2026-11-30'),
      sesionFila(uuid(2), '2026-12-02'),
      sesionFila(uuid(3), '2026-12-03'),                       // sin registrar
      sesionFila(uuid(4), '2026-12-07', { tipo: 'descanso' }),
      sesionFila(uuid(5), '2026-12-08'),
      sesionFila(uuid(6), '2026-12-10'),                       // después de hoy
    ]
    const registros = [uuid(1), uuid(2), uuid(4), uuid(5), uuid(6)].map(registro)
    const fuerza = vistaVia(datosVacios({ sesiones, registros }), '2026-12-09').largos[1]!
    expect(fuerza.chapas[0]!.sesionesHechas).toBe(2)
    expect(fuerza.chapas[1]!.sesionesHechas).toBe(1)
    expect(fuerza.sesionesHechas).toBe(3)
  })

  it('en la semana objetivo todo está hecho y la cima es la actual', () => {
    const v = vistaVia(datosVacios(), '2027-10-06')
    expect(v.largos.every((l) => l.estado === 'hecho')).toBe(true)
    expect(v.cima.actual).toBe(true)
  })

  it('si la temporada no se puede calcular avisa y no rompe', () => {
    const d = datosVacios()
    const v = vistaVia({ ...d, perfil: { ...d.perfil, objetivo_temporada: 'no-es-fecha' } }, '2026-12-09')
    expect(v.largos).toEqual([])
    expect(v.aviso).toMatch(/^No se ha podido calcular la temporada/)
  })
})
