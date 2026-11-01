import { describe, expect, it } from 'vitest'
import { datosVacios, PERFIL, sesionFila, uuid } from './_fabrica'
import { filaSesionAceptada } from './cambios'
import type { DatosAtleta, FilaRegistro, FilaSesion } from './filas'
import { diasObjetivo, diasSupuestos, habitos, lineaSemanaSupuesta, semanaSupuesta } from './semana-supuesta'

const CTX = { compania: 'solo' as const, lugar: 'casa' as const, minutosDisponibles: 60 }
const registro = (id: string): FilaRegistro => ({ sesion_id: id, rpe: 6, duracion_min: 60, molestias: [], registrado_en: 'x' })
let n = 0
// Una sesión generada y registrada con su contexto.
const hecha = (fecha: string, hora: number, contexto: typeof CTX | { compania: 'con-gente'; lugar: 'rocodromo'; minutosDisponibles: number }): { s: FilaSesion; r: FilaRegistro } => {
  const id = uuid(1000 + n++)
  const base = sesionFila(id, fecha, { horaInicio: hora })
  return { s: filaSesionAceptada({ sesion: base.sesion, bloques: [], explicaciones: [] }, id, contexto), r: registro(id) }
}
const con = (dias: DatosAtleta['perfil']['dias_semana'], hechas: { s: FilaSesion; r: FilaRegistro }[] = [], extra: FilaSesion[] = []): DatosAtleta =>
  datosVacios({ perfil: { ...PERFIL, dias_semana: dias }, sesiones: [...hechas.map((h) => h.s), ...extra], registros: hechas.map((h) => h.r) })

// Lunes 2026-11-30 (semana 5). Historial: 3 semanas anteriores con martes tarde (con gente, 120) y jueves tarde.
const GENTE = { compania: 'con-gente' as const, lugar: 'rocodromo' as const, minutosDisponibles: 120 }
const historial = ['2026-11-09', '2026-11-16', '2026-11-23'].flatMap((lunes) => {
  const d = (k: number) => new Date(Date.UTC(+lunes.slice(0, 4), +lunes.slice(5, 7) - 1, +lunes.slice(8) + k)).toISOString().slice(0, 10)
  return [hecha(d(1), 18, GENTE), hecha(d(3), 18, { ...CTX, lugar: 'casa' })]
})
const LUNES = { fecha: '2026-11-30', horaInicio: 9, contexto: CTX }

describe('diasObjetivo', () => {
  it('fijo, rango con media dentro del rango o el mínimo sin historial', () => {
    expect(diasObjetivo('1', null)).toBe(1)
    expect(diasObjetivo('2', 5)).toBe(2)
    expect(diasObjetivo('todos', null)).toBe(7)
    expect(diasObjetivo('3-4', null)).toBe(3)
    expect(diasObjetivo('3-4', 3.6)).toBe(4)
    expect(diasObjetivo('3-4', 2)).toBe(3)
    expect(diasObjetivo('5-6', 9)).toBe(6)
  })
})

describe('habitos', () => {
  it('días frecuentes con su franja y contexto; media con al menos 3 semanas', () => {
    const h = habitos(con('3-4', historial), '2026-11-30')
    expect(h.porDia.get(1)).toEqual({ veces: 3, franja: 'tarde', contexto: GENTE })
    expect(h.porDia.get(3)?.veces).toBe(3)
    expect(h.mediaDias).toBe(2)
    expect(habitos(con('3-4', historial.slice(0, 4)), '2026-11-30').mediaDias).toBeNull()
  })
})

describe('diasSupuestos / semanaSupuesta', () => {
  it('sin respuesta en Yo, nada', () => {
    expect(semanaSupuesta(con(null, historial), LUNES)).toEqual([])
  })
  it('sin historial: el mínimo del rango, repartido, con el contexto de lo que se genera', () => {
    const dias = diasSupuestos(con('3-4'), LUNES)
    // 3 días: el lunes que se genera y dos más, uno sí y uno no desde el martes.
    expect(dias.map((x) => x.fecha)).toEqual(['2026-12-01', '2026-12-03'])
    expect(dias.every((x) => !x.aprendido && x.franja === 'manana' && x.contexto.lugar === 'casa')).toBe(true)
  })
  it('con historial: los días que sueles entrenar, con su franja y contexto', () => {
    const huecos = semanaSupuesta(con('3-4', historial), LUNES)
    // Media 2 → objetivo 3 (mínimo del rango): el lunes y los dos más frecuentes, martes y jueves.
    expect(huecos.map((h) => [h.fecha, h.horaInicio, h.contexto.compania])).toEqual([['2026-12-01', 18, 'con-gente'], ['2026-12-03', 18, 'solo']])
    expect(huecos[0]!.contexto).toMatchObject({ lugar: 'rocodromo', minutosDisponibles: 120, multipresaEnCasa: false })
  })
  it('los días que ya tienen sesión cuentan y no se suponen; con el objetivo cubierto, nada', () => {
    const martes = sesionFila(uuid(1), '2026-12-01', { horaInicio: 18 })
    const dias = diasSupuestos(con('3-4', historial, [martes]), LUNES)
    expect(dias.map((x) => x.fecha)).toEqual(['2026-12-03'])
    expect(diasSupuestos(con('2', historial, [martes]), LUNES)).toEqual([])
  })
  it('todos los días: hasta el domingo, sin pasar de 8', () => {
    expect(diasSupuestos(con('todos'), LUNES)).toHaveLength(6)
  })
})

describe('lineaSemanaSupuesta', () => {
  it('invita a contestar, dice lo aprendido o lo repartido', () => {
    expect(lineaSemanaSupuesta(con(null), '2026-11-30', CTX, 9)).toMatch(/^Dime en Yo cuántos días/)
    expect(lineaSemanaSupuesta(con('3-4', historial), '2026-11-30', CTX, 9))
      .toBe('Para repartir la carga, la app cuenta con que entrenarás también el martes por la tarde y el jueves por la tarde (lo que sueles hacer).')
    expect(lineaSemanaSupuesta(con('3-4'), '2026-11-30', CTX, 9)).toMatch(/aún no sé qué días sueles entrenar\)\.$/)
  })
})
