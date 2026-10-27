import { describe, expect, it } from 'vitest'
import { peticion } from './_fabrica'
import { FASE_FUERZA, FASE_RESISTENCIA } from './fases'
import { proponerSesion } from './propuesta'
import type { Hueco, Peticion } from './propuesta-tipos'
import { esCargaAlta, esIntensaDedos, validarSesion } from './seguridad'
import { validarHuecos } from './semana'
import { diaNumero, fechaDesdeDia } from './tiempo'
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
    expect(r.principal!.explicaciones[0]!.motivo).toMatch(/el martes por la tarde, vía con cuerda al límite/)
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

describe('plan semanal: correcciones de la revisión (P-67)', () => {
  it('prueba todas las opciones de carga alta: en resistencia cubre 4x4, multipresa y vía', () => {
    const r = proponerSesion(lunes({
      fase: FASE_RESISTENCIA, horaInicio: 19, contexto: AMIGOS,
      huecos: [{ fecha: '2026-11-10', horaInicio: 9, contexto: CASA }, { fecha: '2026-11-12', horaInicio: 19, contexto: AMIGOS }],
    }))
    const tipos = [r.principal!.sesion.tipo, ...r.semana!.map((e) => e.sesion?.tipo)]
    expect(new Set(tipos)).toEqual(new Set(['resistencia-4x4', 'multipresa-resistencia-fuerza', 'via-cuerda-limite']))
  })
  it('los ids semana-* están reservados en el historial', () => {
    const h: Sesion = { id: 'semana-1', tipo: 'tecnica', intensidad: 'suave', fecha: '2026-11-08', horaInicio: 19, duracionMin: 60 }
    expect(() => proponerSesion(lunes({ historial: [h], huecos: SEMANA }))).toThrow(/reservado/)
  })
  it('las alternativas avisan de que el resto de la semana puede cambiar', () => {
    const r = proponerSesion(lunes({ huecos: SEMANA }))
    expect(r.alternativas.length).toBeGreaterThan(0)
    for (const a of r.alternativas) expect(a.explicaciones[0]!.regla).toBe('plan.semana-alternativa')
  })
  it('con un año de historial y 8 huecos sigue siendo rápido', () => {
    const historial: Sesion[] = []
    for (let d = 0; d < 364; d += 2) {
      historial.push({ id: `h${d}`, tipo: 'tecnica', intensidad: 'suave', fecha: fechaDesdeDia(diaNumero('2025-11-09') + d), horaInicio: 19, duracionMin: 60 })
    }
    const ocho: Hueco[] = [
      { fecha: '2026-11-09', horaInicio: 19, contexto: AMIGOS },
      { fecha: '2026-11-10', horaInicio: 9, contexto: CASA }, { fecha: '2026-11-10', horaInicio: 19, contexto: AMIGOS },
      { fecha: '2026-11-11', horaInicio: 9, contexto: CASA }, { fecha: '2026-11-11', horaInicio: 19, contexto: SOLO },
      { fecha: '2026-11-12', horaInicio: 9, contexto: CASA }, { fecha: '2026-11-12', horaInicio: 19, contexto: AMIGOS },
      { fecha: '2026-11-13', horaInicio: 9, contexto: CASA },
    ]
    const t0 = performance.now()
    proponerSesion(lunes({ historial, huecos: ocho }))
    // Presupuesto holgado para máquinas lentas; en local tarda bastante menos (ver el informe del tramo).
    expect(performance.now() - t0).toBeLessThan(1500)
  })
})

describe('cupos por semana natural y hombro', () => {
  it('una vía al límite del miércoles pasado no quita la del martes con amigos', () => {
    const via: Sesion = { id: 'v', tipo: 'via-cuerda-limite', intensidad: 'alta', fecha: '2026-11-04', horaInicio: 19, duracionMin: 100 }
    const r = proponerSesion(lunes({ fecha: '2026-11-10', horaInicio: 19, contexto: AMIGOS, historial: [via] }))
    expect(r.principal?.sesion.tipo).toBe('via-cuerda-limite')
  })
  it('el hombro, como mucho 2 veces por semana y nunca dos el mismo día', () => {
    const hombro = (id: string, fecha: string, hora: number): Sesion => ({ id, tipo: 'hombro', intensidad: 'suave', fecha, horaInicio: hora, duracionMin: 40 })
    const opciones = (p: Peticion) => {
      const r = proponerSesion(p)
      return [r.principal, ...r.alternativas].filter((o) => o !== null).map((o) => [o!.sesion.tipo, ...(o!.sesion.incluye ?? [])])
    }
    const mismoDia = opciones(lunes({ horaInicio: 19, contexto: SOLO, historial: [hombro('h1', '2026-11-09', 9)] }))
    expect(mismoDia.flat()).not.toContain('hombro')
    const tope = opciones(lunes({ fecha: '2026-11-11', historial: [hombro('h1', '2026-11-09', 9), hombro('h2', '2026-11-10', 9)] }))
    expect(tope.flat()).not.toContain('hombro')
  })
})
