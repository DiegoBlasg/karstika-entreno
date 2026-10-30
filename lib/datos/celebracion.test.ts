import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import { resumenRegistro, resumenReunion, textoEsfuerzo } from './celebracion'
import type { FilaEvaluacion, FilaRegistro } from './filas'

const registro = (id: string, rpe = 4): FilaRegistro => ({ sesion_id: id, rpe, duracion_min: 60, molestias: [], registrado_en: '2026-11-03 20:00:00+00' })

// Temporada de prueba: empieza el lunes 2026-11-02 (base). Objetivos de RPE (P-63): suave 5, alta 8.
describe('resumenRegistro', () => {
  it('sesión inexistente o sin registrar → null', () => {
    const d = datosVacios({ sesiones: [sesionFila(uuid(1), '2026-11-03')] })
    expect(resumenRegistro(d, uuid(9))).toBeNull()
    expect(resumenRegistro(d, uuid(1))).toBeNull()
  })

  it('devuelve la sesión, el registro y el largo de la fecha de la sesión', () => {
    const d = datosVacios({ sesiones: [sesionFila(uuid(1), '2026-11-03')], registros: [registro(uuid(1), 4)] })
    const r = resumenRegistro(d, uuid(1))!
    expect(r.sesion.id).toBe(uuid(1))
    expect(r.registro.rpe).toBe(4)
    expect(r.largo).toMatchObject({ largo: 1, faseId: 'base', semanaDeFase: 1, sesionesHechas: 1 })
  })

  describe('esfuerzo', () => {
    const con = (extra: Parameters<typeof sesionFila>[2], rpe: number) =>
      resumenRegistro(datosVacios({ sesiones: [sesionFila(uuid(1), '2026-11-03', extra)], registros: [registro(uuid(1), rpe)] }), uuid(1))!.esfuerzo

    it('lo previsto: entre objetivo − 2 y el objetivo', () => {
      const e = con({ tipo: 'tecnica', intensidad: 'suave' }, 4)
      expect(e).toEqual({ rpe: 4, objetivo: 5, valoracion: 'previsto' })
      expect(textoEsfuerzo(e)).toBe('Esfuerzo 4/10: lo previsto. La carga sigue su curso.')
      expect(con({ tipo: 'tecnica', intensidad: 'suave' }, 3).valoracion).toBe('previsto')
      expect(con({ tipo: 'multipresa-resistencia', intensidad: 'alta' }, 8).valoracion).toBe('previsto')
      expect(con({ tipo: 'multipresa-resistencia', intensidad: 'alta' }, 6).valoracion).toBe('previsto')
    })

    it('más duro: por encima del objetivo', () => {
      const e = con({ tipo: 'tecnica', intensidad: 'suave' }, 7)
      expect(e).toEqual({ rpe: 7, objetivo: 5, valoracion: 'mas-duro' })
      expect(textoEsfuerzo(e)).toBe('Esfuerzo 7/10: más duro de lo previsto (máximo 5). El entrenador no subirá la carga en la próxima.')
      expect(con({ tipo: 'multipresa-resistencia', intensidad: 'alta' }, 9).valoracion).toBe('mas-duro')
    })

    it('más suave: más de 2 por debajo del objetivo', () => {
      const e = con({ tipo: 'multipresa-resistencia', intensidad: 'alta' }, 5)
      expect(e).toEqual({ rpe: 5, objetivo: 8, valoracion: 'mas-suave' })
      expect(textoEsfuerzo(e)).toBe('Esfuerzo 5/10: más suave de lo previsto.')
      expect(con({ tipo: 'tecnica', intensidad: 'suave' }, 2).valoracion).toBe('mas-suave')
    })

    it('sin objetivo (test de dedos)', () => {
      const e = con({ tipo: 'evaluacion-dedos', intensidad: 'alta' }, 9)
      expect(e).toEqual({ rpe: 9, objetivo: null, valoracion: 'sin-objetivo' })
      expect(textoEsfuerzo(e)).toBe('Esfuerzo 9/10.')
    })
  })

  describe('siguiente', () => {
    it('la primera sin registrar posterior: el mismo día más tarde cuenta; anteriores y registradas no', () => {
      const d = datosVacios({
        sesiones: [
          sesionFila(uuid(1), '2026-11-03', { horaInicio: 18 }),  // la registrada ahora
          sesionFila(uuid(2), '2026-11-02'),                      // anterior, sin registrar
          sesionFila(uuid(3), '2026-11-03', { horaInicio: 12 }),  // mismo día, antes
          sesionFila(uuid(4), '2026-11-04'),                      // posterior pero registrada
          sesionFila(uuid(5), '2026-11-06'),                      // más tarde
          sesionFila(uuid(6), '2026-11-03', { horaInicio: 20 }),  // mismo día, más tarde: la siguiente
        ],
        registros: [registro(uuid(1)), registro(uuid(4))],
      })
      expect(resumenRegistro(d, uuid(1))!.siguiente?.id).toBe(uuid(6))
    })

    it('null si no queda ninguna', () => {
      const d = datosVacios({ sesiones: [sesionFila(uuid(1), '2026-11-03')], registros: [registro(uuid(1))] })
      expect(resumenRegistro(d, uuid(1))!.siguiente).toBeNull()
    })
  })

  describe('logrosNuevos', () => {
    it('«Primera semana cumplida» cuando este registro completa la primera semana', () => {
      const sesiones = [sesionFila(uuid(1), '2026-11-03'), sesionFila(uuid(2), '2026-11-05')]
      const antes = datosVacios({ sesiones, registros: [registro(uuid(1))] })
      expect(resumenRegistro(antes, uuid(1))!.logrosNuevos).toEqual([])
      const despues = datosVacios({ sesiones, registros: [registro(uuid(1)), registro(uuid(2))] })
      expect(resumenRegistro(despues, uuid(2))!.logrosNuevos.map((l) => l.titulo)).toEqual(['Primera semana cumplida'])
    })

    it('no repite logros de otra semana', () => {
      const sesiones = [sesionFila(uuid(1), '2026-11-03'), sesionFila(uuid(2), '2026-11-10')]
      const d = datosVacios({ sesiones, registros: [registro(uuid(1)), registro(uuid(2))] })
      expect(resumenRegistro(d, uuid(2))!.logrosNuevos.map((l) => l.titulo)).toEqual([])
    })
  })

  describe('conTest', () => {
    const ev = (fecha: string): FilaEvaluacion => ({ id: uuid(100), fecha, peso_corporal_kg: 70, lastre_kg: 10, resistencia_s: null, tecnica: null })
    const sesiones = [sesionFila(uuid(1), '2026-11-03', { tipo: 'evaluacion-dedos', intensidad: 'alta' })]

    it('el id de la evaluación de ese día si la sesión es el test de dedos', () => {
      const d = datosVacios({ sesiones, registros: [registro(uuid(1), 9)], evaluaciones: [ev('2026-11-03')] })
      expect(resumenRegistro(d, uuid(1))!.conTest).toBe(uuid(100))
    })

    it('null sin evaluación de ese día o si no es un test', () => {
      expect(resumenRegistro(datosVacios({ sesiones, registros: [registro(uuid(1), 9)], evaluaciones: [ev('2026-11-04')] }), uuid(1))!.conTest).toBeNull()
      const otra = datosVacios({ sesiones: [sesionFila(uuid(1), '2026-11-03')], registros: [registro(uuid(1))], evaluaciones: [ev('2026-11-03')] })
      expect(resumenRegistro(otra, uuid(1))!.conTest).toBeNull()
    })
  })
})

describe('resumenReunion', () => {
  const ev = (n: number, fecha: string, lastre: number, peso = 70): FilaEvaluacion =>
    ({ id: uuid(200 + n), fecha, peso_corporal_kg: peso, lastre_kg: lastre, resistencia_s: null, tecnica: null })
  const hoy = '2027-02-01'

  it('id inexistente → null', () => {
    expect(resumenReunion(datosVacios({ evaluaciones: [ev(1, '2026-11-10', 10)] }), uuid(999), hoy)).toBeNull()
  })

  it('primer test → primera, sin anterior ni diferencia', () => {
    const r = resumenReunion(datosVacios({ evaluaciones: [ev(1, '2026-11-10', 10)] }), uuid(201), hoy)!
    expect(r.mejora).toBe('primera')
    expect(r.anterior).toBeNull()
    expect(r.diferencia).toBeNull()
    expect(r.test).toMatchObject({ id: uuid(201), fecha: '2026-11-10', lastreKg: 10 })
    expect(r.logrosNuevos.map((l) => l.id)).not.toContain('record-fuerza')
  })

  it('segundo test mejor → sube, con la diferencia exacta y el récord de fuerza', () => {
    const d = datosVacios({ evaluaciones: [ev(1, '2026-11-10', 10), ev(2, '2026-12-10', 15)] })
    const r = resumenReunion(d, uuid(202), hoy)!
    expect(r.mejora).toBe('sube')
    expect(r.anterior).toMatchObject({ fecha: '2026-11-10', lastreKg: 10 })
    expect(r.diferencia).toBeCloseTo((85 / 70 - 80 / 70) * 100, 5)
    expect(r.logrosNuevos.map((l) => l.id)).toContain('record-fuerza')
  })

  it('el récord sigue siendo de ese test aunque haya otros después', () => {
    const d = datosVacios({ evaluaciones: [ev(1, '2026-11-10', 10), ev(2, '2026-12-10', 15), ev(3, '2027-01-10', 12)] })
    expect(resumenReunion(d, uuid(202), hoy)!.logrosNuevos.map((l) => l.id)).toContain('record-fuerza')
    const ultimo = resumenReunion(d, uuid(203), hoy)!
    expect(ultimo.mejora).toBe('baja')
    expect(ultimo.anterior).toMatchObject({ lastreKg: 15 })
  })

  it('peor → baja, sin récord', () => {
    const d = datosVacios({ evaluaciones: [ev(1, '2026-11-10', 15), ev(2, '2026-12-10', 10)] })
    const r = resumenReunion(d, uuid(202), hoy)!
    expect(r.mejora).toBe('baja')
    expect(r.diferencia!).toBeLessThan(-1)
    expect(r.logrosNuevos.map((l) => l.id)).not.toContain('record-fuerza')
  })

  it('casi igual (menos de 1 punto) → igual', () => {
    const d = datosVacios({ evaluaciones: [ev(1, '2026-11-10', 10), ev(2, '2026-12-10', 10.5)] })
    expect(resumenReunion(d, uuid(202), hoy)!.mejora).toBe('igual')
  })

  it('un test de la semana de test de 2027-01-18: es esa reunión y el siguiente largo es Resistencia de fuerza', () => {
    const d = datosVacios({ evaluaciones: [ev(1, '2027-01-20', 10)] })
    const r = resumenReunion(d, uuid(201), hoy)!
    expect(r.reunion).toEqual({ numero: 1, lunes: '2027-01-18', fase: 'Fuerza de dedos' })
    expect(r.siguienteLargo).toMatchObject({ numero: 3, fase: 'Resistencia de fuerza' })
    expect(r.siguienteLargo!.semanas).toBeGreaterThan(0)
    expect(r.siguienteLargo!.objetivo).not.toBe('')
  })

  it('un test que no es de ninguna reunión: reunion null', () => {
    const r = resumenReunion(datosVacios({ evaluaciones: [ev(1, '2026-11-10', 10)] }), uuid(201), hoy)!
    expect(r.reunion).toBeNull()
  })

  it('repeaters con el último test vigente', () => {
    const r = resumenReunion(datosVacios({ evaluaciones: [ev(1, '2027-01-20', 10)] }), uuid(201), '2027-01-21')!
    expect(r.repeaters!.lastreMaximo).toBeGreaterThan(r.repeaters!.lastreInicial)
  })
})
