import { describe, expect, it } from 'vitest'
import { peticion } from './_fabrica'
import { FASE_BASE, FASE_FUERZA, FASE_RESISTENCIA } from './fases'
import { proponerSesion } from './propuesta'
import type { Hueco, Peticion } from './propuesta-tipos'
import { conDominadas, esCargaAlta, esIntensaDedos, validarSesion } from './seguridad'
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
  it('con huecos vacíos (último hueco de la semana) se usa el plan, con la misma sesión', () => {
    const sin = proponerSesion(lunes())
    const vacio = proponerSesion(lunes({ huecos: [] }))
    expect(vacio.principal?.sesion.tipo).toBe(sin.principal?.sesion.tipo)
    expect(vacio.semana).toEqual([])
  })
  it('en el último hueco de rocódromo de la semana no se descansa por el descanso recomendado (P-16)', () => {
    // El mismo escenario que en propuesta.test.ts: semana con los cupos cubiertos y 4 sesiones recientes; se pide el
    // domingo en el rocódromo con gente.
    const historial: Sesion[] = [
      { id: 'via1', tipo: 'via-cuerda-limite', intensidad: 'alta', fecha: '2026-10-26', horaInicio: 19, duracionMin: 100, incluye: ['hombro'] },
      { id: 'blq1', tipo: 'bloque-limite', intensidad: 'alta', fecha: '2026-10-28', horaInicio: 19, duracionMin: 50, incluye: ['hombro'] },
      { id: 't1', tipo: 'tecnica', intensidad: 'suave', fecha: '2026-10-29', horaInicio: 18, duracionMin: 45 },
      { id: 't2', tipo: 'tecnica', intensidad: 'suave', fecha: '2026-10-30', horaInicio: 18, duracionMin: 45 },
      { id: 'a1', tipo: 'arc', intensidad: 'suave', fecha: '2026-10-31', horaInicio: 18, duracionMin: 50 },
    ]
    const p = peticion({ fecha: '2026-11-01', historial })
    expect(proponerSesion(p).descanso?.regla).toBe('generador.descanso-recomendado')
    const plan = proponerSesion({ ...p, huecos: [] })
    expect(plan.principal).not.toBeNull()
    expect(esCargaAlta(plan.principal!.sesion)).toBe(false)
    expect(plan.descanso).toBeUndefined()
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

describe('plan semanal con un rojo antiguo sin alta (falla cerrado)', () => {
  const vieja: Sesion = { id: 'v', tipo: 'tecnica', intensidad: 'suave', fecha: '2026-07-20', horaInicio: 19, duracionMin: 60 }
  const seguimiento = { registros: [{ sesionId: 'v', fecha: '2026-07-20', rpe: 4, duracionMin: 60, molestias: [{ zona: 'dedos' as const, dolor: 6 }] }], chequeos: [], altas: [] }
  it('sin huecos el rojo de hace más de 75 días sigue mandando: descanso', () => {
    const r = proponerSesion(lunes({ historial: [vieja], seguimiento }))
    expect(r.principal).toBeNull()
    expect(r.descanso?.regla).toBe('autorregulacion.rojo')
  })
  it('con huecos también: ni hoy ni en el plan hay carga alta con los dedos en rojo', () => {
    const r = proponerSesion(lunes({ historial: [vieja], seguimiento, huecos: SEMANA }))
    expect(r.principal).toBeNull()
    expect(r.descanso?.regla).toBe('autorregulacion.rojo')
    for (const e of r.semana ?? []) if (e.sesion) expect(esCargaAlta(e.sesion)).toBe(false)
  })
  it('la principal con huecos es siempre de un tipo que el generador propone hoy sin huecos', () => {
    for (const extra of [{}, { historial: [vieja], seguimiento }, { fase: FASE_RESISTENCIA }] as Partial<Peticion>[]) {
      const sin = proponerSesion(lunes(extra))
      const con = proponerSesion(lunes({ ...extra, huecos: SEMANA }))
      if (con.principal) expect([sin.principal, ...sin.alternativas].map((o) => o?.sesion.tipo)).toContain(con.principal.sesion.tipo)
    }
  })
})

describe('hueco libre (P-67)', () => {
  it('si la única opción de hoy es carga alta y quitaría la vía de mañana, hoy queda libre y sin alternativas de carga alta', () => {
    // Con las dominadas de la semana ya hechas (P-39, cupo 1), en casa solo queda la multipresa.
    const hombro = (id: string, fecha: string): Sesion => ({ id, tipo: 'hombro', intensidad: 'suave', fecha, horaInicio: 9, duracionMin: 40 })
    const conDom: Sesion = { ...hombro('h1', '2026-11-09'), duracionMin: 55, incluye: ['dominadas'] }
    const p = lunes({ fecha: '2026-11-11', historial: [conDom, hombro('h2', '2026-11-10')], huecos: [{ fecha: '2026-11-12', horaInicio: 19, contexto: AMIGOS }] })
    const r = proponerSesion(p)
    expect(r.principal).toBeNull()
    expect(r.descanso?.regla).toBe('plan.semana-libre')
    expect(r.semana?.[0]?.sesion?.tipo).toBe('via-cuerda-limite')
    for (const a of r.alternativas) expect(esCargaAlta(a.sesion)).toBe(false)
  })
})

describe('mañanas en casa (P-41, P-39)', () => {
  // Cuatro mañanas de lunes a jueves en casa con solo barra; nada más en la semana.
  const BARRA: Contexto = { ...CASA, multipresaEnCasa: false }
  const mananas: Hueco[] = ['2026-11-10', '2026-11-11', '2026-11-12'].map((fecha) => ({ fecha, horaInicio: 9, contexto: BARRA }))
  const plan = (fase: Peticion['fase']) => {
    const r = proponerSesion(lunes({ contexto: BARRA, fase, huecos: mananas }))
    return [{ fecha: '2026-11-09', sesion: r.principal?.sesion ?? null }, ...(r.semana ?? []).map((e) => ({ fecha: e.hueco.fecha, sesion: e.sesion }))]
  }
  const diasHombro = (dias: ReturnType<typeof plan>) =>
    dias.filter((d) => d.sesion && (d.sesion.tipo === 'hombro' || (d.sesion.incluye ?? []).includes('hombro'))).map((d) => diaNumero(d.fecha))
  it.each([FASE_BASE, FASE_FUERZA, FASE_RESISTENCIA])('$id: el hombro va 2 veces y en días no seguidos', (fase) => {
    const dias = diasHombro(plan(fase))
    expect(dias).toHaveLength(2)
    expect(dias[1]! - dias[0]!).toBeGreaterThan(1)
  })
  it.each([FASE_FUERZA, FASE_RESISTENCIA])('$id: las dominadas salen como sesión en una de las mañanas libres, una sola vez', (fase) => {
    const dias = plan(fase)
    expect(dias.filter((d) => d.sesion && conDominadas(d.sesion))).toHaveLength(1)
    expect(dias.filter((d) => d.sesion?.tipo === 'dominadas')).toHaveLength(1)
  })
  it('en la base no hay dominadas', () => {
    expect(plan(FASE_BASE).filter((d) => d.sesion && conDominadas(d.sesion))).toEqual([])
  })
})
