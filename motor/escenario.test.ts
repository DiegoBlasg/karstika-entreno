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
  it('un jueves a las 18:00 tras el martes: solo hay 45,5 h, así que no se puede forzar bloque al límite', () => {
    const bloque = ses('jueves', '2026-10-29', 18, { tipo: 'bloque-limite' })
    expect(validarSesion(bloque, [martes], perfilNovel).map((v) => v.regla)).toEqual(['seguridad.dedos-48h'])
  })
  it('ese mismo jueves, una sesión suave de técnica sí es posible', () => {
    const tecnica = ses('jueves', '2026-10-29', 18, { tipo: 'tecnica', intensidad: 'suave' })
    expect(validarContexto(tecnica, contextoJueves)).toEqual([])
    expect(validarSesion(tecnica, [martes], perfilNovel)).toEqual([])
  })
  it('pasadas 48 h desde el final del martes (jueves 20:30) el bloque al límite ya es posible', () => {
    const bloque = ses('jueves', '2026-10-29', 20.5, { tipo: 'bloque-limite' })
    expect(validarSesion(bloque, [martes], perfilNovel)).toEqual([])
  })
})
