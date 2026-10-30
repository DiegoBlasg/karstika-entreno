import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import { resumenRegistro, textoEsfuerzo } from './celebracion'
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
