import { describe, expect, it } from 'vitest'
import { peticion } from './_fabrica'
import { FASE_FUERZA } from './fases'
import { proponerSesion } from './propuesta'
import type { Hueco, Peticion } from './propuesta-tipos'
import { esCargaAlta, esIntensaDedos, validarSesion } from './seguridad'
import { validarHuecos } from './semana'
import type { Contexto, Sesion } from './tipos'

const CASA: Contexto = { compania: 'solo', lugar: 'casa', minutosDisponibles: 60 }
const AMIGOS: Contexto = { compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120 }
const SOLO: Contexto = { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 90 }
const EVALUACION = { fecha: '2026-11-03', pesoCorporalKg: 70, lastreKg: 10 }

// Lunes 2026-11-09 por la mañana en casa, en la fuerza con test vigente.
const lunes = (extra: Partial<Peticion> = {}): Peticion =>
  peticion({ fecha: '2026-11-09', horaInicio: 9, contexto: CASA, fase: FASE_FUERZA, evaluacion: EVALUACION, ...extra })
const SEMANA: Hueco[] = [
  { fecha: '2026-11-10', horaInicio: 19, contexto: AMIGOS },
  { fecha: '2026-11-11', horaInicio: 9, contexto: CASA },
  { fecha: '2026-11-12', horaInicio: 19, contexto: SOLO },
]

describe('validarHuecos (P-67)', () => {
  const error = (huecos: Hueco[]) => () => validarHuecos(lunes({ huecos }))
  it('acepta la semana de ejemplo', () => {
    expect(error(SEMANA)).not.toThrow()
  })
  it('rechaza huecos anteriores, después del domingo, solapados o de más', () => {
    expect(error([{ fecha: '2026-11-08', horaInicio: 19, contexto: SOLO }])).toThrow('tiene que ser posterior')
    expect(error([{ fecha: '2026-11-09', horaInicio: 9, contexto: SOLO }])).toThrow('tiene que ser posterior')
    expect(error([{ fecha: '2026-11-16', horaInicio: 9, contexto: CASA }])).toThrow('hasta el domingo de esta semana (2026-11-15)')
    expect(error([{ fecha: '2026-11-09', horaInicio: 9.5, contexto: CASA }])).toThrow('se solapa')
    expect(error([
      { fecha: '2026-11-10', horaInicio: 9, contexto: CASA },
      { fecha: '2026-11-10', horaInicio: 9.5, contexto: CASA },
    ])).toThrow('se solapa')
    expect(error([
      { fecha: '2026-11-09', horaInicio: 13, contexto: CASA },
      { fecha: '2026-11-09', horaInicio: 19, contexto: SOLO },
    ])).toThrow('como mucho 2 por día')
    expect(error([{ fecha: '2026-11-10', horaInicio: 19, contexto: { ...SOLO, minutosDisponibles: -5 } }])).toThrow()
    const nueve = Array.from({ length: 9 }, (_, i) => ({ fecha: `2026-11-1${Math.floor(i / 2)}`, horaInicio: i % 2 ? 19 : 9, contexto: CASA }))
    expect(() => validarHuecos(lunes({ huecos: nueve }))).toThrow('Como mucho 8 huecos')
  })
})

describe('proponerSesion con huecos (P-67)', () => {
  it('sin huecos o con huecos vacíos, igual que siempre', () => {
    expect(proponerSesion(lunes({ huecos: [] }))).toEqual(proponerSesion(lunes()))
  })
  it('el lunes no pone multipresa intensa si eso le quita al martes la vía al límite', () => {
    const sinPlan = proponerSesion(lunes())
    expect(sinPlan.principal && esIntensaDedos(sinPlan.principal.sesion)).toBe(true)
    const r = proponerSesion(lunes({ huecos: SEMANA }))
    expect(r.principal).not.toBeNull()
    expect(esIntensaDedos(r.principal!.sesion)).toBe(false)
    expect(r.semana?.map((e) => e.sesion?.tipo ?? null)[0]).toBe('via-cuerda-limite')
    expect(r.principal!.explicaciones[0]!.regla).toBe('plan.semana')
    expect(r.principal!.explicaciones[0]!.motivo).toMatch(/el martes por la tarde, via-cuerda-limite/)
  })
  it('es determinista y el plan entero respeta las reglas de seguridad', () => {
    const p = lunes({ huecos: SEMANA })
    const r = proponerSesion(p)
    expect(proponerSesion(p)).toEqual(r)
    const plan: Sesion[] = [
      { ...r.principal!.sesion, id: 'hoy' },
      ...r.semana!.flatMap((e) => (e.sesion ? [e.sesion] : [])),
    ]
    for (const s of plan) {
      expect(validarSesion(s, plan.filter((x) => x.id !== s.id), p.perfil), s.id).toEqual([])
    }
    const porDia = new Map<string, number>()
    for (const s of plan.filter(esCargaAlta)) porDia.set(s.fecha, (porDia.get(s.fecha) ?? 0) + 1)
    expect([...porDia.values()].every((n) => n <= 1)).toBe(true)
  })
})
