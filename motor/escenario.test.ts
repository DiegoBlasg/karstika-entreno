import { describe, expect, it } from 'vitest'
import { perfilNovel, ses } from './_fabrica'
import { tiposPosibles, validarContexto, validarSesion } from './index'

// Semana del usuario: los martes va con amigos (vías con cuerda) y los jueves va solo (bloque y autoasegurada).
const martes = ses('martes', '2026-10-27', 19, { tipo: 'via-cuerda-limite' }) // termina 20:30
const contextoMartes = { compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120 } as const
const contextoJueves = { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 120 } as const

describe('escenario real: martes con gente y jueves solo', () => {
  it('el martes se pueden hacer vías con cuerda', () => {
    expect(tiposPosibles(contextoMartes)).toContain('via-cuerda-limite')
    expect(validarContexto(martes, contextoMartes)).toEqual([])
  })
  it('el jueves solo no se pueden hacer vías con cuerda, sí bloque, autoasegurada y board', () => {
    const t = tiposPosibles(contextoJueves)
    expect(t).not.toContain('via-cuerda-limite')
    for (const ok of ['bloque-limite', 'via-autoasegurada', 'board']) expect(t).toContain(ok)
    const jueves = ses('jueves', '2026-10-29', 19, { tipo: 'via-cuerda-limite' })
    expect(validarContexto(jueves, contextoJueves).map((v) => v.regla)).toEqual(['contexto.sin-cuerda'])
  })
  it('el miércoles después del martes no se puede forzar bloque al límite: falta un día completo de descanso', () => {
    const bloque = ses('miercoles', '2026-10-28', 19, { tipo: 'bloque-limite' })
    expect(validarSesion(bloque, [martes], perfilNovel).map((v) => v.regla)).toEqual(['seguridad.dedos-dia-descanso'])
  })
  it('ese miércoles, una sesión suave de técnica sí es posible', () => {
    const tecnica = ses('miercoles', '2026-10-28', 19, { tipo: 'tecnica', intensidad: 'suave' })
    expect(validarContexto(tecnica, contextoJueves)).toEqual([])
    expect(validarSesion(tecnica, [martes], perfilNovel)).toEqual([])
  })
  it('el jueves, con el miércoles de descanso, el bloque al límite ya es posible a cualquier hora', () => {
    for (const hora of [8, 18, 20.5]) {
      const bloque = ses('jueves', '2026-10-29', hora, { tipo: 'bloque-limite' })
      expect(validarSesion(bloque, [martes], perfilNovel)).toEqual([])
    }
  })
})
