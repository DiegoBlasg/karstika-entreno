import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import type { FilaEvaluacion, FilaRegistro } from './filas'
import { testDeVentana, ventanasReuniones, vistaVia } from './via'

const evaluacion = (n: number, fecha: string, lastre: number): FilaEvaluacion =>
  ({ id: uuid(100 + n), fecha, peso_corporal_kg: 70, lastre_kg: lastre, resistencia_s: null, tecnica: null })
const registro = (id: string): FilaRegistro => ({ sesion_id: id, rpe: 6, duracion_min: 60, molestias: [], registrado_en: '2026-12-01 20:00:00+00' })

describe('vistaVia', () => {
  it('8 largos; base sin reunión; fuerza con 8 chapas, dos descargas y la reunión del 18 de enero', () => {
    const v = vistaVia(datosVacios(), '2026-12-09')
    expect(v.aviso).toBeUndefined()
    expect(v.largos).toHaveLength(8)
    const [base, fuerza] = v.largos
    expect(base).toMatchObject({ numero: 1, faseId: 'base', estado: 'hecho', reuniones: [] })
    expect(base!.chapas).toHaveLength(4)
    expect(fuerza).toMatchObject({ numero: 2, faseId: 'fuerza', estado: 'actual', ciclo: 1 })
    expect(fuerza!.chapas.map((c) => c.estado)).toEqual(['hecho', 'actual', 'futuro', 'futuro', 'futuro', 'futuro', 'futuro', 'futuro'])
    expect(fuerza!.chapas.filter((c) => c.descarga).map((c) => c.lunes)).toEqual(['2026-12-21', '2027-01-18'])
    expect(fuerza!.reuniones).toEqual([{ lunes: '2027-01-18', estado: 'proxima', resultado: null }])
    expect(v.largos[2]!.reuniones).toMatchObject([{ lunes: '2027-03-01', estado: 'futura' }])
    expect(v.largos.slice(2).every((l) => l.estado === 'futuro')).toBe(true)
    expect(v.cima).toEqual(expect.objectContaining({ lunes: '2027-10-04', actual: false, grado: '7a' }))
  })

  it('la reunión hecha lleva el último test de su semana y la siguiente pasa a ser la próxima', () => {
    const evaluaciones = [evaluacion(1, '2026-10-20', 5), evaluacion(2, '2027-01-19', 8), evaluacion(3, '2027-01-21', 10)]
    const v = vistaVia(datosVacios({ evaluaciones }), '2027-01-27')
    const fuerza = v.largos[1]!
    expect(fuerza.estado).toBe('hecho')
    expect(fuerza.reuniones[0]?.estado).toBe('hecha')
    expect(fuerza.reuniones[0]?.resultado).toMatchObject({ fecha: '2027-01-21', lastreKg: 10 })
    expect(fuerza.reuniones[0]?.resultado?.fuerzaRelativa).toBeCloseTo(114.29, 2)
    expect(v.largos[2]!.reuniones[0]?.estado).toBe('proxima')
    expect(v.tests.map((t) => t.fecha)).toEqual(['2026-10-20', '2027-01-19', '2027-01-21'])
  })

  it('una semana de test que pasó sin resultado queda «sin-hacer»', () => {
    const v = vistaVia(datosVacios(), '2027-01-27')
    expect(v.largos[1]!.reuniones[0]?.estado).toBe('sin-hacer')
    expect(v.largos[2]!.reuniones[0]?.estado).toBe('proxima')
  })

  it('un largo con test a mitad de fase lleva todas sus reuniones, en orden', () => {
    // Sin caídas ni tests, el diagnóstico sigue el orden de la evidencia (fuerza de dedos primero): la fuerza del ciclo 2
    // dura 10 semanas, con test en la 5 y en la 10.
    const v = vistaVia(datosVacios(), '2027-05-26')
    const fuerza2 = v.largos[5]!
    expect(fuerza2).toMatchObject({ faseId: 'fuerza', ciclo: 2, estado: 'actual' })
    expect(fuerza2.chapas).toHaveLength(10)
    expect(fuerza2.reuniones.map((r) => [r.lunes, r.estado])).toEqual([['2027-05-17', 'sin-hacer'], ['2027-06-21', 'proxima']])
    expect(v.largos[6]!.reuniones.map((r) => r.estado)).toEqual(['futura'])
    // El rendimiento final de 10 semanas solo tiene el test de la mitad (la última semana es de afinado, sin test).
    expect(v.largos[7]!.reuniones.map((r) => r.lunes)).toEqual(['2027-08-23'])
    expect(v.largos.flatMap((l) => l.reuniones)).toHaveLength(7)
  })

  it('un test 4 días antes de su semana cuenta para su reunión', () => {
    const v = vistaVia(datosVacios({ evaluaciones: [evaluacion(1, '2027-01-14', 8)] }), '2027-01-20')
    expect(v.largos[1]!.reuniones[0]).toMatchObject({ estado: 'hecha', resultado: { fecha: '2027-01-14' } })
    expect(v.largos[2]!.reuniones[0]?.estado).toBe('proxima')
  })

  it('un test 3 días después de su semana cuenta para su reunión', () => {
    const v = vistaVia(datosVacios({ evaluaciones: [evaluacion(1, '2027-01-27', 8)] }), '2027-01-28')
    expect(v.largos[1]!.reuniones[0]).toMatchObject({ estado: 'hecha', resultado: { fecha: '2027-01-27' } })
  })

  it('un test entre dos reuniones, pasado el margen, cuenta para la siguiente', () => {
    const v = vistaVia(datosVacios({ evaluaciones: [evaluacion(1, '2027-02-10', 8)] }), '2027-02-12')
    expect(v.largos[1]!.reuniones[0]).toMatchObject({ estado: 'sin-hacer', resultado: null })
    expect(v.largos[2]!.reuniones[0]).toMatchObject({ lunes: '2027-03-01', estado: 'hecha', resultado: { fecha: '2027-02-10' } })
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

describe('ventanasReuniones', () => {
  it('cada ventana va del final de la anterior al domingo de su semana + 6 días, sin pisar la siguiente', () => {
    expect(ventanasReuniones(['2027-01-18', '2027-02-08', '2027-02-15'], '2026-11-02')).toEqual([
      { lunes: '2027-01-18', desde: '2026-11-02', hasta: '2027-01-30' },
      { lunes: '2027-02-08', desde: '2027-01-31', hasta: '2027-02-14' }, // el margen se corta antes del lunes siguiente
      { lunes: '2027-02-15', desde: '2027-02-15', hasta: '2027-02-27' },
    ])
    expect(ventanasReuniones([], '2026-11-02')).toEqual([])
  })

  it('testDeVentana toma el último test de la ventana hecho hasta hoy', () => {
    const v = { lunes: '2027-01-18', desde: '2026-11-02', hasta: '2027-01-30' }
    const tests = [{ fecha: '2027-01-29' }, { fecha: '2026-10-30' }, { fecha: '2027-01-14' }, { fecha: '2027-01-31' }]
    expect(testDeVentana(v, tests, '2027-02-05')).toEqual({ fecha: '2027-01-29' })
    expect(testDeVentana(v, tests, '2027-01-20')).toEqual({ fecha: '2027-01-14' })
    expect(testDeVentana(v, tests, '2027-01-10')).toBeNull()
  })
})
