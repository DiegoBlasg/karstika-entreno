import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import type { FilaEvaluacion, FilaIntento, FilaRegistro } from './filas'
import { constancia, logros, resumenEscalada } from './progreso'

const registro = (id: string): FilaRegistro => ({ sesion_id: id, rpe: 6, duracion_min: 60, molestias: [], registrado_en: '2026-11-03 20:00:00+00' })
const evaluacion = (n: number, fecha: string, lastre: number): FilaEvaluacion =>
  ({ id: uuid(100 + n), fecha, peso_corporal_kg: 70, lastre_kg: lastre, resistencia_s: null, tecnica: null })
const intento = (n: number, fecha: string, encadenado: boolean, motivo: FilaIntento['motivo_caida'] = null): FilaIntento =>
  ({ id: uuid(200 + n), sesion_id: uuid(1), fecha, encadenado, motivo_caida: motivo })

// Temporada de prueba: empieza el lunes 2026-11-02; base 4 semanas; fuerza desde 2026-11-30 (descarga 2026-12-21).
describe('constancia', () => {
  it('cumplida, no cumplida, neutra y actual', () => {
    const sesiones = [
      sesionFila(uuid(1), '2026-11-03'), sesionFila(uuid(2), '2026-11-05'),     // semana 1: todas registradas
      sesionFila(uuid(3), '2026-11-10'), sesionFila(uuid(4), '2026-11-12'),     // semana 2: una sin registrar
      sesionFila(uuid(5), '2026-11-17', { tipo: 'descanso' }),                  // semana 3: solo descanso → neutra
      sesionFila(uuid(6), '2026-11-24'),                                        // semana 4: cumplida
    ]
    const registros = [uuid(1), uuid(2), uuid(3), uuid(6)].map(registro)
    const c = constancia(datosVacios({ sesiones, registros }), '2026-12-02')
    expect(c.semanas.map((s) => [s.lunes, s.estado])).toEqual([
      ['2026-11-02', 'cumplida'], ['2026-11-09', 'no-cumplida'], ['2026-11-16', 'neutra'], ['2026-11-23', 'cumplida'], ['2026-11-30', 'actual'],
    ])
    expect(c).toMatchObject({ cumplidas: 2, conSesiones: 3, rachaActual: 1, mejorRacha: 1 })
  })

  it('la neutra no corta la racha y la descarga cuenta igual', () => {
    const sesiones = [
      sesionFila(uuid(1), '2026-11-30'), sesionFila(uuid(2), '2026-12-07'),
      sesionFila(uuid(3), '2026-12-21'),                                        // semana de descarga
    ]                                                                           // 2026-12-14: sin sesiones (neutra)
    const registros = [uuid(1), uuid(2), uuid(3)].map(registro)
    const c = constancia(datosVacios({ sesiones, registros }), '2026-12-30')
    expect(c.semanas.find((s) => s.lunes === '2026-12-21')).toEqual({ lunes: '2026-12-21', estado: 'cumplida', descarga: true })
    expect(c.rachaActual).toBe(3)
  })

  it('antes de la temporada no hay semanas', () => {
    expect(constancia(datosVacios(), '2026-10-20')).toEqual({ semanas: [], cumplidas: 0, conSesiones: 0, rachaActual: 0, mejorRacha: 0 })
  })
})

describe('resumenEscalada', () => {
  it('grado del perfil, encadenes y última caída hasta hoy', () => {
    const intentos = [intento(1, '2026-11-10', false, 'bombeo'), intento(2, '2026-11-12', true), intento(3, '2026-11-14', false, 'cabeza'), intento(4, '2026-11-20', true)]
    expect(resumenEscalada(datosVacios({ intentos }), '2026-11-15')).toEqual({ gradoActual: '6b', gradoObjetivo: '7a', encadenes: 1, ultimaCaida: 'cabeza' })
  })
})

describe('logros', () => {
  it('sin datos: ninguno conseguido; uno por largo y la cima al final', () => {
    const l = logros(datosVacios(), '2026-11-04')
    expect(l.map((x) => x.id)).toEqual(['primera-semana', 'cuatro-seguidas', 'primer-encadene', 'record-fuerza', 'largo-1', 'largo-2', 'largo-3', 'largo-4', 'largo-5', 'largo-6', 'largo-7', 'largo-8', 'cima'])
    expect(l.every((x) => !x.conseguido && x.fecha === null)).toBe(true)
    expect(l.find((x) => x.id === 'largo-2')?.titulo).toBe('Largo 2 · Fuerza de dedos')
  })

  it('récord, encadene, primera semana y largo completado con su fecha', () => {
    const sesiones = [sesionFila(uuid(1), '2026-11-03')]
    const registros = [registro(uuid(1))]
    const evaluaciones = [evaluacion(1, '2026-10-30', 8), evaluacion(2, '2026-11-25', 7), evaluacion(3, '2026-11-27', 10)]
    const intentos = [intento(1, '2026-11-04', true)]
    const l = logros(datosVacios({ sesiones, registros, evaluaciones, intentos }), '2026-12-02')
    const por = (id: string) => l.find((x) => x.id === id)!
    expect(por('primera-semana')).toMatchObject({ conseguido: true, fecha: '2026-11-08' })
    expect(por('primer-encadene')).toMatchObject({ conseguido: true, fecha: '2026-11-04' })
    expect(por('record-fuerza')).toMatchObject({ conseguido: true, fecha: '2026-11-27' })
    expect(por('largo-1')).toMatchObject({ conseguido: true, fecha: '2026-11-29' })
    expect(por('largo-2').conseguido).toBe(false)
    expect(por('cuatro-seguidas').conseguido).toBe(false)
  })

  it('un solo test no es récord', () => {
    const l = logros(datosVacios({ evaluaciones: [evaluacion(1, '2026-11-05', 10)] }), '2026-11-10')
    expect(l.find((x) => x.id === 'record-fuerza')?.conseguido).toBe(false)
  })
})
