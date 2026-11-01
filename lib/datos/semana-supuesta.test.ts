import { describe, expect, it } from 'vitest'
import { datosVacios, PERFIL, sesionFila, uuid } from './_fabrica'
import { filaSesionAceptada } from './cambios'
import type { DatosAtleta, FilaRegistro, FilaSesion } from './filas'
import { diasObjetivo, habitos, lineaSemanaSupuesta, ratosSupuestos, semanaSupuesta } from './semana-supuesta'

type Ctx = { compania: 'solo' | 'con-gente'; lugar: 'casa' | 'rocodromo' | 'roca'; minutosDisponibles: number }
const CASA: Ctx = { compania: 'solo', lugar: 'casa', minutosDisponibles: 60 }
const GENTE: Ctx = { compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120 }
const registro = (id: string): FilaRegistro => ({ sesion_id: id, rpe: 6, duracion_min: 60, molestias: [], registrado_en: 'x' })
let n = 0
// Una sesión generada y registrada con su contexto.
const hecha = (fecha: string, hora: number, contexto: Ctx): { s: FilaSesion; r: FilaRegistro } => {
  const id = uuid(1000 + n++)
  const base = sesionFila(id, fecha, { horaInicio: hora })
  return { s: filaSesionAceptada({ sesion: base.sesion, bloques: [], explicaciones: [] }, id, contexto), r: registro(id) }
}
const con = (dias: DatosAtleta['perfil']['dias_semana'], hechas: { s: FilaSesion; r: FilaRegistro }[] = [], extra: FilaSesion[] = []): DatosAtleta =>
  datosVacios({ perfil: { ...PERFIL, dias_semana: dias }, sesiones: [...hechas.map((h) => h.s), ...extra], registros: hechas.map((h) => h.r) })
const dia = (lunes: string, k: number): string =>
  new Date(Date.UTC(+lunes.slice(0, 4), +lunes.slice(5, 7) - 1, +lunes.slice(8) + k)).toISOString().slice(0, 10)

// Lunes 2026-11-30. Historial de 3 semanas: martes mañana en casa y martes tarde con gente; jueves tarde solo en casa.
const SEMANAS = ['2026-11-09', '2026-11-16', '2026-11-23']
const historial = SEMANAS.flatMap((l) => [hecha(dia(l, 1), 9, CASA), hecha(dia(l, 1), 18, GENTE), hecha(dia(l, 3), 18, CASA)])
const LUNES = { fecha: '2026-11-30', horaInicio: 9, contexto: CASA }
const MARTES_MANANA = { fecha: '2026-12-01', horaInicio: 9, contexto: CASA }

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
  it('ratos habituales (día y franja) con su contexto; media con al menos 3 semanas', () => {
    const h = habitos(con('3-4', historial), '2026-11-30')
    expect(h.porRato.get('1-tarde')).toEqual({ veces: 3, contexto: GENTE })
    expect(h.porRato.get('1-manana')).toEqual({ veces: 3, contexto: CASA })
    expect(h.porRato.get('3-tarde')?.veces).toBe(3)
    expect(h.mediaDias).toBe(2)
  })
  it('un rato que solo aparece una semana no es habitual', () => {
    const una = [hecha('2026-11-20', 18, GENTE)] // un viernes suelto
    expect(habitos(con('3-4', [...historial, ...una]), '2026-11-30').porRato.has('4-tarde')).toBe(false)
  })
})

describe('ratosSupuestos / semanaSupuesta', () => {
  it('sin respuesta en Yo, nada y sin huecos para el motor', () => {
    expect(ratosSupuestos(con(null, historial), LUNES)).toEqual([])
    expect(semanaSupuesta(con(null, historial), LUNES)).toBeUndefined()
  })
  it('sin historial: el mínimo del rango, repartido, con el contexto de lo que se genera', () => {
    const ratos = ratosSupuestos(con('3-4'), LUNES)
    expect(ratos.map((x) => x.fecha)).toEqual(['2026-12-01', '2026-12-03'])
    expect(ratos.every((x) => !x.aprendido && x.franja === 'manana' && x.contexto.lugar === 'casa')).toBe(true)
  })
  it('con historial: los días habituales, con todas sus franjas habituales y su contexto', () => {
    const huecos = semanaSupuesta(con('3-4', historial), LUNES)!
    expect(huecos.map((h) => [h.fecha, h.horaInicio, h.contexto.compania])).toEqual([
      ['2026-12-01', 9, 'solo'], ['2026-12-01', 18, 'con-gente'], ['2026-12-03', 18, 'solo'],
    ])
    expect(huecos[1]!.contexto).toMatchObject({ lugar: 'rocodromo', minutosDisponibles: 120, multipresaEnCasa: false })
  })
  it('al generar la mañana, cuenta con la tarde habitual de ese mismo día si cabe y está libre', () => {
    const ratos = ratosSupuestos(con('3-4', historial), MARTES_MANANA)
    expect(ratos[0]).toMatchObject({ fecha: '2026-12-01', franja: 'tarde', aprendido: true })
    // Si la mañana dura tanto que pisaría la tarde, no se cuenta con ella.
    expect(ratosSupuestos(con('3-4', historial), { ...MARTES_MANANA, contexto: { ...CASA, minutosDisponibles: 600 } })[0]?.fecha).not.toBe('2026-12-01')
    // Con la tarde ya ocupada, tampoco.
    const tarde = sesionFila(uuid(1), '2026-12-01', { horaInicio: 18 })
    expect(ratosSupuestos(con('3-4', historial, [tarde]), MARTES_MANANA).some((x) => x.fecha === '2026-12-01')).toBe(false)
  })
  it('los días que ya tienen sesión cuentan y no se suponen; con el objetivo cubierto, huecos vacíos (último rato)', () => {
    const martes = sesionFila(uuid(1), '2026-12-01', { horaInicio: 18 })
    expect(ratosSupuestos(con('3-4', historial, [martes]), LUNES).map((x) => x.fecha)).toEqual(['2026-12-03'])
    expect(semanaSupuesta(con('2', historial, [martes]), LUNES)).toEqual([])
  })
  it('todos los días: hasta el domingo, sin pasar de 8', () => {
    expect(ratosSupuestos(con('todos'), LUNES)).toHaveLength(6)
  })
})

describe('lineaSemanaSupuesta', () => {
  it('invita a contestar, dice lo aprendido o lo repartido', () => {
    expect(lineaSemanaSupuesta(con(null), '2026-11-30', CASA, 9)).toMatch(/^Dime en Yo cuántos días/)
    expect(lineaSemanaSupuesta(con('3-4', historial), '2026-11-30', CASA, 9))
      .toBe('Para repartir la carga, la app cuenta con que entrenarás también el martes por la mañana, el martes por la tarde y el jueves por la tarde (lo que sueles hacer).')
    expect(lineaSemanaSupuesta(con('3-4'), '2026-11-30', CASA, 9)).toMatch(/aún no sé qué días sueles entrenar\)\.$/)
  })
})
