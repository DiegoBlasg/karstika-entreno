import { describe, expect, it } from 'vitest'
import { pasosArranque } from './arranque'
import { datosVacios, huecoFila, sesionFila, uuid } from './_fabrica'
import type { FilaEvaluacion, FilaRegistro } from './filas'

const evaluacion: FilaEvaluacion = { id: uuid(1), fecha: '2026-11-09', peso_corporal_kg: 70, lastre_kg: 10, resistencia_s: null, tecnica: null }
const registro = (id: string): FilaRegistro => ({ sesion_id: id, rpe: 6, duracion_min: 60, molestias: [], registrado_en: '2026-11-10 20:00:00+00' })

describe('pasosArranque', () => {
  it('sin nada: ningún paso hecho', () => {
    expect(pasosArranque(datosVacios())).toEqual({ huecos: false, sesion: false, test: false, completo: false })
  })
  it('un hueco declarado marca el paso de huecos', () => {
    expect(pasosArranque(datosVacios({ huecos: [huecoFila(uuid(2), '2026-11-10', '19:00')] }))).toMatchObject({ huecos: true, sesion: false })
  })
  it('una sesión sin registro no cuenta; con registro, sí', () => {
    const s = sesionFila(uuid(3), '2026-11-10')
    expect(pasosArranque(datosVacios({ sesiones: [s] })).sesion).toBe(false)
    expect(pasosArranque(datosVacios({ sesiones: [s], registros: [registro(s.id)] })).sesion).toBe(true)
  })
  it('una evaluación marca el paso del test', () => {
    expect(pasosArranque(datosVacios({ evaluaciones: [evaluacion] })).test).toBe(true)
  })
  it('con los tres pasos, completo', () => {
    const s = sesionFila(uuid(3), '2026-11-10')
    const p = pasosArranque(datosVacios({ huecos: [huecoFila(uuid(2), '2026-11-10', '19:00')], sesiones: [s], registros: [registro(s.id)], evaluaciones: [evaluacion] }))
    expect(p).toEqual({ huecos: true, sesion: true, test: true, completo: true })
  })
})
