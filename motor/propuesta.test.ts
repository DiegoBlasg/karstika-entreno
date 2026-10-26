import { describe, expect, it } from 'vitest'
import { perfilExperto, peticion, ses } from './_fabrica'
import { validarContexto } from './contexto'
import { FASE_BASE, FASE_FUERZA } from './fases'
import { proponerSesion } from './propuesta'
import type { EvaluacionDedos, Propuesta } from './propuesta-tipos'
import { validarSesion } from './seguridad'

const tipos = (r: Propuesta) => [r.principal, ...r.alternativas].map((x) => x?.sesion.tipo)
const evaluacionReciente: EvaluacionDedos = { fecha: '2026-10-20', pesoCorporalKg: 70, lastreKg: 40 }
// Sesión antigua de ARC: fija el inicio de la base (más de 28 días) sin penalizar a la técnica por repetir tipo.
const antigua = ses('antigua', '2026-09-01', 18, { tipo: 'arc', intensidad: 'suave', duracionMin: 50 })

describe('proponerSesion: primera semana (fase base, historial vacío, martes con gente)', () => {
  const r = proponerSesion(peticion())

  it('propone vía al límite, luego bloque al límite y técnica; nunca el test ni multipresa', () => {
    expect(tipos(r)).toEqual(['via-cuerda-limite', 'bloque-limite', 'tecnica'])
    expect(r.descanso).toBeUndefined()
    expect(r.proximaVentanaIntensa).toBeUndefined()
  })
  it('la principal se completa con hombro hasta llenar el tiempo (100 + 15 = 115 de 120 min)', () => {
    expect(r.principal!.sesion.duracionMin).toBe(115)
    expect(r.principal!.sesion.incluye).toEqual(['hombro'])
    expect(r.principal!.bloques.at(-1)!.nombre).toMatch(/hombro/)
  })
  it('las alternativas también se completan, con el hombro siempre al final', () => {
    const bloque = r.alternativas[0]!
    expect(bloque.sesion.incluye).toEqual(['tecnica', 'arc', 'hombro'])
    expect(bloque.sesion.duracionMin).toBe(110) // 50 + 30 + 15 + 15
    expect(bloque.bloques.at(-1)!.nombre).toMatch(/hombro/)
    const tecnica = r.alternativas[1]!
    expect(tecnica.sesion.incluye).toEqual(['arc', 'hombro'])
    expect(tecnica.sesion.duracionMin).toBe(75) // 45 + 15 + 15
  })
  it('la principal explica la elección con la fase y los complementos', () => {
    const e = r.principal!.explicaciones[0]!
    expect(e.regla).toBe('generador.eleccion')
    expect(e.parametros).toEqual(['P-30'])
    expect(e.motivo).toMatch(/Base técnica y adaptación/)
    expect(e.motivo).toMatch(/1 sesión\(es\) de via-cuerda-limite/)
    expect(e.motivo).toMatch(/Se completa con hombro/)
  })
  it('las explicaciones son la de la elección y una por bloque', () => {
    expect(r.principal!.explicaciones).toHaveLength(r.principal!.bloques.length + 1)
  })
})

describe('proponerSesion: semana real (martes con gente, jueves solo)', () => {
  const martes = ses('martes', '2026-10-27', 19, { tipo: 'via-cuerda-limite', duracionMin: 100 })
  const solo = { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 120 } as const

  it('el jueves, con el miércoles de descanso, toca bloque al límite', () => {
    const r = proponerSesion(peticion({ fecha: '2026-10-29', contexto: solo, historial: [martes] }))
    expect(tipos(r)).toEqual(['bloque-limite', 'tecnica', 'arc'])
    expect(r.proximaVentanaIntensa).toBeUndefined()
  })
  it('el miércoles, el bloque al límite se sustituye por bloque suave y se avisa de que el jueves ya se puede', () => {
    const r = proponerSesion(peticion({ fecha: '2026-10-28', contexto: solo, historial: [martes] }))
    expect(tipos(r)).toEqual(['bloque-suave', 'tecnica', 'arc'])
    expect(r.principal!.sesion.intensidad).toBe('suave')
    expect(r.principal!.explicaciones[0]!.motivo).toMatch(/Sustituye a bloque-limite, porque falta un día completo de descanso/)
    expect(r.proximaVentanaIntensa).toEqual({ fecha: '2026-10-29' })
  })
  it('sin compañero ninguna sesión menciona cuerda', () => {
    const r = proponerSesion(peticion({ fecha: '2026-10-29', contexto: solo, historial: [martes] }))
    for (const plan of [r.principal!, ...r.alternativas]) {
      for (const b of plan.bloques) for (const e of b.ejercicios) expect(e.nombre).not.toMatch(/con cuerda/)
    }
  })
})

describe('proponerSesion: fase de fuerza', () => {
  const fuerza = (extra = {}) => peticion({ fase: FASE_FUERZA, historial: [antigua], ...extra })

  it('sin evaluación vigente propone el test de dedos, luego multipresa y vía al límite', () => {
    expect(tipos(proponerSesion(fuerza()))).toEqual(['evaluacion-dedos', 'multipresa-resistencia', 'via-cuerda-limite'])
  })
  it('con evaluación vigente propone multipresa al 70 % las primeras semanas, completada con técnica, ARC y hombro', () => {
    const r = proponerSesion(fuerza({ evaluacion: evaluacionReciente }))
    expect(tipos(r)).toEqual(['multipresa-resistencia', 'via-cuerda-limite', 'board'])
    const e = r.principal!.bloques[1]!.ejercicios[0]!
    expect(e.cargaKg).toBe(7) // 0,7 × 110 − 70
    expect(r.principal!.sesion.incluye).toEqual(['tecnica', 'arc', 'hombro'])
    expect(r.principal!.sesion.duracionMin).toBe(90) // 30 + 30 + 15 + 15
  })
  it('en casa solo ofrece lo que se puede hacer allí y completa con hombro', () => {
    const r = proponerSesion(fuerza({ evaluacion: evaluacionReciente, contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 120 } }))
    expect(tipos(r)).toEqual(['multipresa-resistencia', 'board', 'hombro'])
    expect(r.principal!.sesion.incluye).toEqual(['hombro'])
    expect(r.principal!.sesion.duracionMin).toBe(45)
  })
  it('una evaluación caducada (71 días) vuelve a proponer el test', () => {
    const r = proponerSesion(fuerza({ evaluacion: { ...evaluacionReciente, fecha: '2026-08-17' } }))
    expect(r.principal!.sesion.tipo).toBe('evaluacion-dedos')
  })
  it('multipresa el martes y otra el jueves es posible; el miércoles no', () => {
    const martesMp = ses('mp', '2026-10-27', 19, {
      tipo: 'multipresa-resistencia', duracionMin: 30, detalle: { regletaMm: 20, agarre: 'semiarqueado' },
    })
    const solo = { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 120 } as const
    const pJueves = fuerza({ fecha: '2026-10-29', contexto: solo, historial: [antigua, martesMp], evaluacion: evaluacionReciente })
    const jueves = proponerSesion(pJueves)
    // El jueves vuelve a caber trabajo intenso de dedos. Gana el board: la multipresa ya lleva 1 de 2 esta
    // semana y repetiría el tipo de la última sesión (50 + 7 − 30 = 27 frente a 100 + 5 = 105).
    expect(jueves.principal!.sesion.tipo).toBe('board')
    expect(jueves.proximaVentanaIntensa).toBeUndefined()
    const mpJueves = { ...martesMp, id: 'mp2', fecha: '2026-10-29' }
    expect(validarSesion(mpJueves, pJueves.historial, pJueves.perfil)).toEqual([])
    const miercoles = proponerSesion(fuerza({ fecha: '2026-10-28', contexto: solo, historial: [antigua, martesMp], evaluacion: evaluacionReciente }))
    expect(tipos(miercoles)).toEqual(['bloque-suave', 'tecnica', 'arc'])
    expect(miercoles.principal!.explicaciones[0]!.motivo).toMatch(/Sustituye a board/)
    expect(miercoles.proximaVentanaIntensa).toEqual({ fecha: '2026-10-29' })
  })
})

describe('proponerSesion: selección', () => {
  it('prefiere el cupo pendiente y penaliza repetir el último tipo', () => {
    const ayer = ses('ayer', '2026-10-26', 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 })
    const fase = { ...FASE_BASE, prioridad: ['tecnica', 'arc'] as const, cupos: { tecnica: 2, arc: 1 } }
    const r = proponerSesion(peticion({ historial: [ayer], fase: { ...fase, prioridad: [...fase.prioridad] } }))
    expect(tipos(r)).toEqual(['arc', 'tecnica']) // arc: 100 + 1; técnica: 50 + 2 − 30
  })
  it('las alternativas son de tipos distintos entre sí y de la principal', () => {
    const t = tipos(proponerSesion(peticion()))
    expect(new Set(t).size).toBe(t.length)
  })
})

describe('proponerSesion: tiempo y descanso', () => {
  const solo = (minutosDisponibles: number) => ({ compania: 'solo', lugar: 'rocodromo', minutosDisponibles }) as const

  it('con 25 minutos solo cabe hombro, sin complementos', () => {
    const r = proponerSesion(peticion({ contexto: solo(25) }))
    expect(tipos(r)).toEqual(['hombro'])
    expect(r.principal!.sesion.incluye).toBeUndefined()
  })
  it('con 15 minutos no hay ninguna sesión: principal nulo y descanso explicado por el contexto', () => {
    const r = proponerSesion(peticion({ contexto: solo(15) }))
    expect(r.principal).toBeNull()
    expect(r.alternativas).toEqual([])
    expect(r.descanso!.origen).toBe('contexto')
  })
  it('con todos los cupos cubiertos y mucha actividad reciente recomienda descansar, pero sigue ofreciendo sesión', () => {
    const historial = [
      ses('via1', '2026-10-21', 19, { tipo: 'via-cuerda-limite', duracionMin: 100, incluye: ['hombro'] }),
      ses('blq1', '2026-10-23', 19, { tipo: 'bloque-limite', duracionMin: 50, incluye: ['hombro'] }),
      ses('t1', '2026-10-24', 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 }),
      ses('t2', '2026-10-25', 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 }),
      ses('a1', '2026-10-26', 18, { tipo: 'arc', intensidad: 'suave', duracionMin: 50 }),
    ]
    const r = proponerSesion(peticion({ historial }))
    expect(r.descanso!.regla).toBe('generador.descanso-recomendado')
    expect(r.principal).not.toBeNull()
    expect(r.principal!.sesion.incluye).toBeUndefined() // los cupos de complementos ya están cubiertos
  })
  it('los complementos de sesiones pasadas cuentan para los cupos', () => {
    const conHombro = ses('v', '2026-10-25', 19, { tipo: 'via-cuerda-limite', duracionMin: 100, incluye: ['hombro'] })
    const otro = ses('w', '2026-10-23', 19, { tipo: 'bloque-limite', duracionMin: 50, incluye: ['hombro'] })
    const r = proponerSesion(peticion({ historial: [otro, conHombro] }))
    for (const plan of [r.principal!, ...r.alternativas]) expect(plan.sesion.incluye ?? []).not.toContain('hombro')
  })
  it('con actividad reciente pero cupos pendientes no recomienda descanso', () => {
    const historial = ['24', '25', '26'].map((d) =>
      ses(`t${d}`, `2026-10-${d}`, 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 }),
    )
    expect(proponerSesion(peticion({ historial })).descanso).toBeUndefined()
  })
})

describe('proponerSesion: entradas y propiedades', () => {
  it('lanza con una fecha inválida o una hora fuera de rango', () => {
    expect(() => proponerSesion(peticion({ fecha: '2026-02-30' }))).toThrow()
    expect(() => proponerSesion(peticion({ horaInicio: 24 }))).toThrow(/horaInicio/)
  })
  it('lanza con minutos no positivos o con un historial inválido', () => {
    expect(() => proponerSesion(peticion({ contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 0 } }))).toThrow(/minutosDisponibles/)
    expect(() => proponerSesion(peticion({ historial: [ses('a', '2026-10-26', 25)] }))).toThrow(/horaInicio/)
  })
  it('es determinista y no muta la petición', () => {
    const p = peticion({ fase: FASE_FUERZA, historial: [antigua], evaluacion: evaluacionReciente })
    const antes = structuredClone(p)
    expect(proponerSesion(p)).toEqual(proponerSesion(p))
    expect(p).toEqual(antes)
  })
  it('perfil con experiencia: el test de dedos puede proponerse sin historial', () => {
    expect(proponerSesion(peticion({ fase: FASE_FUERZA, perfil: perfilExperto })).principal!.sesion.tipo).toBe('evaluacion-dedos')
  })
  it('toda sesión propuesta, ya compuesta, supera contexto y seguridad al revalidarla', () => {
    const p = peticion({ fase: FASE_FUERZA, historial: [antigua], evaluacion: evaluacionReciente })
    const r = proponerSesion(p)
    for (const plan of [r.principal!, ...r.alternativas]) {
      expect(validarSesion(plan.sesion, p.historial, p.perfil)).toEqual([])
      expect(validarContexto(plan.sesion, p.contexto)).toEqual([])
      expect(plan.bloques.reduce((a, b) => a + b.minutos, 0)).toBe(plan.sesion.duracionMin)
      for (const e of plan.explicaciones) expect(e.parametros.length).toBeGreaterThan(0)
    }
  })
})
