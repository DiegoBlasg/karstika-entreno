import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import { franja, franjasLibres, inicialGenerar, vistaAgenda } from './agenda'
import { filaSesionAceptada } from './cambios'

describe('agenda', () => {
  it('franja: antes de las 14, mañana; si no, tarde', () => {
    expect(franja(9)).toBe('manana')
    expect(franja(13.9)).toBe('manana')
    expect(franja(14)).toBe('tarde')
    expect(franja(18)).toBe('tarde')
  })
  it('7 días con sus sesiones por hora; se puede generar desde hoy y dentro de la temporada', () => {
    const d = datosVacios({ sesiones: [sesionFila(uuid(2), '2026-11-04', { horaInicio: 18 }), sesionFila(uuid(1), '2026-11-04', { horaInicio: 9 })] })
    const v = vistaAgenda(d, '2026-11-02', '2026-11-03')
    expect(v.dias.map((x) => x.fecha)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'])
    expect(v.dias[2]!.tarjetas.map((t) => t.fila.id)).toEqual([uuid(1), uuid(2)])
    // El 4 tiene mañana y tarde ocupadas: ya no se genera.
    expect(v.dias.map((x) => x.generable)).toEqual([false, true, false, true, true, true, true])
    expect(v.fase?.nombre).toBeTruthy()
    // Antes del inicio de la temporada (2026-11-02) no se genera.
    expect(vistaAgenda(d, '2026-10-26', '2026-10-27').dias.every((x) => !x.generable)).toBe(true)
  })
  it('valores iniciales: los de la última generada ese día de la semana; si no, por defecto', () => {
    expect(inicialGenerar(datosVacios(), '2026-11-05')).toEqual({ compania: 'solo', lugar: 'rocodromo', minutos: 90, franja: 'tarde' })
    const s = sesionFila(uuid(1), '2026-10-29', { horaInicio: 9 })
    const fila = filaSesionAceptada({ sesion: s.sesion, bloques: [], explicaciones: [] }, uuid(1),
      { compania: 'con-gente', lugar: 'casa', minutosDisponibles: 45 })
    expect(inicialGenerar(datosVacios({ sesiones: [fila] }), '2026-11-05')).toEqual({ compania: 'con-gente', lugar: 'casa', minutos: 45, franja: 'manana' })
    // Otro día de la semana: por defecto.
    expect(inicialGenerar(datosVacios({ sesiones: [fila] }), '2026-11-06').lugar).toBe('rocodromo')
  })
  it('si la franja habitual ya está ocupada, propone la otra; con las dos ocupadas no se genera', () => {
    const tarde = sesionFila(uuid(5), '2026-11-05', { horaInicio: 18 })
    expect(franjasLibres(datosVacios({ sesiones: [tarde] }), '2026-11-05')).toEqual(['manana'])
    expect(inicialGenerar(datosVacios({ sesiones: [tarde] }), '2026-11-05').franja).toBe('manana')
    const ambas = datosVacios({ sesiones: [tarde, sesionFila(uuid(6), '2026-11-05', { horaInicio: 9 })] })
    expect(vistaAgenda(ambas, '2026-11-02', '2026-11-03').dias[3]!.generable).toBe(false)
  })
})
