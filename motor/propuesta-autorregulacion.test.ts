import { describe, expect, it } from 'vitest'
import { peticion, ses } from './_fabrica'
import type { Chequeo, Molestia, RegistroSesion, Seguimiento } from './autorregulacion-tipos'
import { descargar, FASE_BASE, FASE_FUERZA } from './fases'
import { proponerSesion } from './propuesta'
import type { Peticion, Propuesta, SesionPlan } from './propuesta-tipos'
import { esCargaAlta } from './seguridad'
import type { Contexto, Sesion } from './tipos'

const MARTES: Contexto = { compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120 }
const JUEVES: Contexto = { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 90 }
const CASA: Contexto = { compania: 'solo', lugar: 'casa', minutosDisponibles: 60 }
const EVALUACION = { fecha: '2026-11-03', pesoCorporalKg: 70, lastreKg: 10 }
const AL_LIMITE = ['bloque-limite', 'via-cuerda-limite', 'pegues-proyecto', 'board']

const seg = (extra: Partial<Seguimiento> = {}): Seguimiento => ({ registros: [], chequeos: [], altas: [], ...extra })
const chq = (fecha: string, valor: number, molestias: Molestia[] = []): Chequeo => ({ fecha, sueno: valor, fatiga: valor, ganas: valor, molestias })
const reg = (s: Sesion, rpe: number, molestias: Molestia[] = []): RegistroSesion => ({
  sesionId: s.id, fecha: s.fecha, rpe, duracionMin: s.duracionMin, molestias,
})
const pet = (fecha: string, contexto: Contexto, extra: Partial<Peticion> = {}): Peticion =>
  peticion({ fecha, contexto, fase: FASE_FUERZA, evaluacion: EVALUACION, ...extra })
const planes = (r: Propuesta): SesionPlan[] => [r.principal, ...r.alternativas].filter((x): x is SesionPlan => x !== null)
const tipos = (r: Propuesta): string[] => planes(r).map((x) => x.sesion.tipo)

const multipresa = (id: string, fecha: string): Sesion =>
  ses(id, fecha, 18, { tipo: 'multipresa-resistencia', intensidad: 'alta', duracionMin: 55, detalle: { regletaMm: 20, agarre: 'semiarqueado' } })
const OCHO_FECHAS = ['2026-11-09', '2026-11-12', '2026-11-16', '2026-11-19', '2026-11-23', '2026-11-26', '2026-11-30', '2026-12-03']
const ocho = OCHO_FECHAS.map((f, i) => multipresa(`m${i}`, f))
const repeaters = (r: Propuesta) => {
  const plan = planes(r).find((x) => x.sesion.tipo === 'multipresa-resistencia')!
  const bloques = plan.bloques.filter((b) => b.nombre.startsWith('Bloque de repeaters'))
  return { bloques: bloques.length, notas: bloques[0]!.ejercicios[0]!.notas!, parametros: bloques[0]!.explicacion.parametros }
}

describe('sin seguimiento, el generador no cambia', () => {
  it('un seguimiento vacío sobre un historial sin multipresa da la misma propuesta, más el estado', () => {
    const historial = [ses('t', '2026-11-08', 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 60 })]
    const sin = proponerSesion(pet('2026-11-10', MARTES, { historial }))
    const con = proponerSesion(pet('2026-11-10', MARTES, { historial, seguimiento: seg() }))
    const { estado, ...resto } = con
    expect(resto).toEqual(sin)
    expect(estado?.zonas.dedos).toBe('verde')
  })
  it('rechaza un estado pasado a mano', () => {
    const estado = proponerSesion(pet('2026-11-10', MARTES, { seguimiento: seg() })).estado!
    expect(() => proponerSesion(pet('2026-11-10', MARTES, { estado }))).toThrow(/no pases `estado`/)
  })
})

describe('semáforo de dolor en el generador (P-64)', () => {
  it('ámbar en dedos: nada de carga alta (ni multipresa, ni vía al límite, ni test); sí técnica o volumen suave', () => {
    for (const contexto of [MARTES, JUEVES, CASA]) {
      const r = proponerSesion(pet('2026-11-10', contexto, { seguimiento: seg({ chequeos: [chq('2026-11-10', 4, [{ zona: 'dedos', dolor: 2 }])] }) }))
      expect(planes(r).length, contexto.lugar).toBeGreaterThan(0)
      for (const x of planes(r)) expect(esCargaAlta(x.sesion), `${contexto.compania}:${x.sesion.tipo}`).toBe(false)
      expect(r.estado!.explicaciones.map((e) => e.regla)).toContain('autorregulacion.semaforo')
    }
  })
  it('ámbar en hombro: el hombro va sin carga', () => {
    const r = proponerSesion(pet('2026-11-10', { ...CASA, minutosDisponibles: 40 }, { seguimiento: seg({ chequeos: [chq('2026-11-10', 4, [{ zona: 'hombro', dolor: 3 }])] }) }))
    const hombro = planes(r).find((x) => x.sesion.tipo === 'hombro')!
    expect(hombro.sesion.detalle?.conCarga).toBe(false)
    expect(hombro.bloques.every((b) => b.explicacion.parametros.includes('P-43'))).toBe(true)
  })
  it('ámbar en otra zona: fuera lo que es al límite, pero la multipresa sigue', () => {
    const r = proponerSesion(pet('2026-11-10', MARTES, { seguimiento: seg({ chequeos: [chq('2026-11-10', 4, [{ zona: 'otra', dolor: 2 }])] }) }))
    expect(tipos(r).some((t) => AL_LIMITE.includes(t))).toBe(false)
    expect(tipos(r)).toContain('multipresa-resistencia')
  })
  it('rojo en dedos: descanso como principal y, como alternativa, hombro sin carga', () => {
    const r = proponerSesion(pet('2026-11-10', MARTES, { seguimiento: seg({ chequeos: [chq('2026-11-10', 4, [{ zona: 'dedos', dolor: 5 }])] }) }))
    expect(r.principal).toBeNull()
    expect(r.descanso?.regla).toBe('autorregulacion.rojo')
    expect(r.descanso?.motivo).toMatch(/fisioterapeuta/)
    expect(tipos(r)).toEqual(['hombro'])
    expect(r.alternativas[0]!.sesion.detalle?.conCarga).toBe(false)
  })
  it('rojo en hombro o en otra zona: solo descanso', () => {
    for (const zona of ['hombro', 'otra'] as const) {
      const r = proponerSesion(pet('2026-11-10', MARTES, { seguimiento: seg({ chequeos: [chq('2026-11-10', 4, [{ zona, dolor: 6 }])] }) }))
      expect(r.principal, zona).toBeNull()
      expect(r.alternativas, zona).toEqual([])
      expect(r.descanso?.regla).toBe('autorregulacion.rojo')
    }
  })
  it('una señal de alarma bloquea igual que un rojo', () => {
    const r = proponerSesion(pet('2026-11-10', MARTES, { seguimiento: seg({ chequeos: [chq('2026-11-10', 4, [{ zona: 'dedos', dolor: 1, alarma: true }])] }) }))
    expect(r.descanso?.regla).toBe('autorregulacion.rojo')
  })
})

describe('chequeo y descarga adelantada (P-50, P-65)', () => {
  it('chequeo de hoy bajo: sin carga alta hoy; mañana, sin chequeo bajo, vuelve la carga', () => {
    const seguimiento = seg({ chequeos: [chq('2026-11-10', 1)] })
    const hoy = proponerSesion(pet('2026-11-10', MARTES, { seguimiento }))
    for (const x of planes(hoy)) expect(esCargaAlta(x.sesion), x.sesion.tipo).toBe(false)
    expect(hoy.estado!.explicaciones.map((e) => e.regla)).toContain('autorregulacion.chequeo-bajo')
    const manana = proponerSesion(pet('2026-11-11', MARTES, { seguimiento }))
    expect(esCargaAlta(manana.principal!.sesion)).toBe(true)
  })
  it('2 sesiones seguidas por encima del RPE: 7 días de descarga, sin nada al límite y la multipresa con 1 bloque', () => {
    const a = ses('a', '2026-11-05', 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 60 })
    const b = ses('b', '2026-11-07', 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 60 })
    const seguimiento = seg({ registros: [reg(a, 7), reg(b, 7)] })
    const r = proponerSesion(pet('2026-11-10', MARTES, { historial: [a, b], seguimiento }))
    expect(r.estado?.descargaAdelantada).toEqual({ desde: '2026-11-08', hasta: '2026-11-14', motivo: 'rpe' })
    expect(tipos(r).some((t) => AL_LIMITE.includes(t))).toBe(false)
    expect(r.principal!.explicaciones[0]!.motivo).toMatch(/\(descarga\)/)
    expect(repeaters(r).bloques).toBe(1)
    const despues = proponerSesion(pet('2026-11-15', MARTES, { historial: [a, b], seguimiento }))
    expect(despues.estado?.descargaAdelantada).toBeUndefined()
    expect(despues.principal!.sesion.tipo).toBe('via-cuerda-limite')
  })
})

describe('progresión de la multipresa con seguimiento (P-11, P-46)', () => {
  const dentro = ocho.map((s) => reg(s, 7))
  it('8 sesiones válidas: 2 bloques al 80 %', () => {
    const r = proponerSesion(pet('2026-12-10', CASA, { historial: ocho, seguimiento: seg({ registros: dentro }) }))
    expect(repeaters(r)).toMatchObject({ bloques: 2 })
    expect(repeaters(r).notas).toMatch(/80 %/)
  })
  it('sin registros, las sesiones no cuentan para subir: 1 bloque al 70 %', () => {
    const r = proponerSesion(pet('2026-12-10', CASA, { historial: ocho, seguimiento: seg() }))
    expect(repeaters(r).bloques).toBe(1)
    expect(repeaters(r).notas).toMatch(/70 %/)
  })
  it('las sesiones por encima del objetivo no cuentan (4 de 8): 2 bloques pero al 70 %', () => {
    const registros = ocho.map((s, i) => reg(s, i % 2 === 0 ? 9 : 7))
    const r = proponerSesion(pet('2026-12-10', CASA, { historial: ocho, seguimiento: seg({ registros }) }))
    expect(repeaters(r).bloques).toBe(2)
    expect(repeaters(r).notas).toMatch(/70 %/)
  })
  it('tras un ámbar resuelto en dedos, un escalón atrás (de 80 % a 2 bloques al 70 %) y lo explica con P-46', () => {
    const seguimiento = seg({
      registros: dentro,
      chequeos: [chq('2026-12-05', 4, [{ zona: 'dedos', dolor: 2 }]), chq('2026-12-10', 4)],
    })
    const r = proponerSesion(pet('2026-12-10', CASA, { historial: ocho, seguimiento }))
    expect(r.estado?.zonas.dedos).toBe('verde')
    expect(repeaters(r).bloques).toBe(2)
    expect(repeaters(r).notas).toMatch(/70 %/)
    expect(repeaters(r).parametros).toContain('P-46')
  })
})

describe('dominadas como complemento (P-39)', () => {
  // Con las 2 multipresas de la semana ya hechas, en casa toca hombro; sobra tiempo para las dominadas.
  const semana = [multipresa('m1', '2026-11-05'), multipresa('m2', '2026-11-07')]
  const casa = (extra: Partial<Peticion> = {}) => proponerSesion(pet('2026-11-10', CASA, { historial: semana, ...extra }))
  const incluye = (r: Propuesta) => planes(r).flatMap((x) => x.sesion.incluye ?? [])
  it('en la fuerza se añaden a un día sin dedos intensos, con su bloque de 15 min y P-39', () => {
    const r = casa()
    expect(r.principal!.sesion.tipo).toBe('hombro')
    expect(r.principal!.sesion.incluye).toEqual(['dominadas'])
    const bloque = r.principal!.bloques.find((b) => b.nombre.includes('dominadas'))!
    expect(bloque.minutos).toBe(15)
    expect(bloque.explicacion.parametros).toEqual(['P-39'])
  })
  it('no en otras fases ni en descarga', () => {
    expect(incluye(casa({ fase: FASE_BASE }))).not.toContain('dominadas')
    expect(incluye(casa({ fase: descargar(FASE_FUERZA) }))).not.toContain('dominadas')
  })
  it('no si ese día hay una sesión intensa de dedos ni si ya hubo dominadas en 7 días', () => {
    const conDedosHoy = [...semana.slice(0, 1), multipresa('hoy', '2026-11-10')]
    expect(incluye(proponerSesion(pet('2026-11-10', CASA, { historial: conDedosHoy, horaInicio: 20 })))).not.toContain('dominadas')
    const previa = ses('h', '2026-11-06', 18, { tipo: 'hombro', intensidad: 'suave', duracionMin: 35, incluye: ['dominadas'] })
    expect(incluye(casa({ historial: [...semana, previa] }))).not.toContain('dominadas')
  })
  it('no con ámbar en codo, ni con ninguna intensa de dedos como principal', () => {
    expect(incluye(casa({ seguimiento: seg({ chequeos: [chq('2026-11-10', 4, [{ zona: 'codo', dolor: 2 }])] }) }))).not.toContain('dominadas')
    const r = proponerSesion(pet('2026-11-10', CASA, { historial: [], seguimiento: undefined }))
    expect(r.principal!.sesion.tipo).toBe('multipresa-resistencia')
    expect(r.principal!.sesion.incluye ?? []).not.toContain('dominadas')
  })
})

describe('arreglos de la revisión', () => {
  const tecnica = (id: string, fecha: string) => ses(id, fecha, 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 60 })
  it('freno P-11: una sesión de técnica por encima del objetivo impide pasar a 2 bloques', () => {
    const cuatro = ['2026-11-09', '2026-11-12', '2026-11-16', '2026-11-19'].map((f, i) => multipresa(`q${i}`, f))
    const t = tecnica('t', '2026-11-21')
    const historial = [...cuatro, t]
    const conFreno = proponerSesion(pet('2026-11-23', CASA, { historial, seguimiento: seg({ registros: [...cuatro.map((s) => reg(s, 7)), reg(t, 9)] }) }))
    expect(repeaters(conFreno).bloques).toBe(1)
    const plan = planes(conFreno).find((x) => x.sesion.tipo === 'multipresa-resistencia')!
    expect(plan.bloques.find((b) => b.nombre.startsWith('Bloque'))!.explicacion.motivo).toMatch(/Hoy no sube/)
    const sinFreno = proponerSesion(pet('2026-11-23', CASA, { historial, seguimiento: seg({ registros: [...cuatro.map((s) => reg(s, 7)), reg(t, 4)] }) }))
    expect(repeaters(sinFreno).bloques).toBe(2)
  })
  it('freno P-11: una sola multipresa por encima del objetivo repite el escalón, no lo baja', () => {
    const cinco = ['2026-11-09', '2026-11-12', '2026-11-16', '2026-11-19', '2026-11-23'].map((f, i) => multipresa(`c${i}`, f))
    const registros = cinco.map((s, i) => reg(s, i === 4 ? 9 : 7))
    const r = proponerSesion(pet('2026-11-26', CASA, { historial: cinco, seguimiento: seg({ registros }) }))
    expect(repeaters(r).bloques).toBe(2)
  })
  it('P-46 encadenado: dos molestias seguidas bajan dos escalones desde donde estabas', () => {
    const diez = ['2026-11-02', '2026-11-05', '2026-11-09', '2026-11-12', '2026-11-16', '2026-11-19', '2026-11-23', '2026-11-26', '2026-11-30', '2026-12-03']
      .map((f, i) => multipresa(`d${i}`, f))
    const dos = [multipresa('e0', '2026-12-07'), multipresa('e1', '2026-12-10')]
    const historial = [...diez, ...dos]
    const seguimiento = seg({
      registros: historial.map((s) => reg(s, 7)),
      chequeos: [
        chq('2026-12-04', 4, [{ zona: 'dedos', dolor: 2 }]), chq('2026-12-05', 4),
        chq('2026-12-12', 4, [{ zona: 'dedos', dolor: 2 }]), chq('2026-12-13', 4),
      ],
    })
    const r = proponerSesion(pet('2026-12-14', CASA, { historial, seguimiento }))
    expect(repeaters(r).bloques).toBe(1)
    expect(repeaters(r).notas).toMatch(/70 %/)
  })
  it('las sesiones hechas en descarga no cuentan para subir', () => {
    const conDescarga = ocho.map((s, i) => (i % 2 === 0 ? { ...s, descarga: true } : s))
    const r = proponerSesion(pet('2026-12-10', CASA, { historial: conDescarga, seguimiento: seg({ registros: conDescarga.map((s) => reg(s, 7)) }) }))
    expect(repeaters(r).bloques).toBe(2)
    expect(repeaters(r).notas).toMatch(/70 %/)
    const sinSeguimiento = proponerSesion(pet('2026-12-10', CASA, { historial: conDescarga }))
    expect(repeaters(sinSeguimiento).notas).toMatch(/70 %/)
  })
  it('las propuestas hechas en descarga quedan marcadas', () => {
    const r = proponerSesion(pet('2026-11-10', CASA, { fase: descargar(FASE_FUERZA) }))
    expect(r.principal!.sesion.descarga).toBe(true)
    expect(proponerSesion(pet('2026-11-10', CASA)).principal!.sesion.descarga).toBeUndefined()
  })
  it('sin registros, la explicación lo dice', () => {
    const r = proponerSesion(pet('2026-12-10', CASA, { historial: ocho, seguimiento: seg() }))
    const plan = planes(r).find((x) => x.sesion.tipo === 'multipresa-resistencia')!
    expect(plan.bloques.find((b) => b.nombre.startsWith('Bloque'))!.explicacion.motivo).toMatch(/8 sesiones de multipresa sin registro no cuentan/)
  })
  it('en el rocódromo, con el chequeo bajo, la principal es escalada suave y no hombro', () => {
    for (const contexto of [MARTES, JUEVES]) {
      const r = proponerSesion(pet('2026-11-10', contexto, { seguimiento: seg({ chequeos: [chq('2026-11-10', 1)] }) }))
      expect(r.principal!.sesion.tipo, contexto.compania).not.toBe('hombro')
      expect(esCargaAlta(r.principal!.sesion)).toBe(false)
    }
  })
  it('con ámbar en codo, el hombro también va sin carga', () => {
    const r = proponerSesion(pet('2026-11-10', { ...CASA, minutosDisponibles: 40 }, { seguimiento: seg({ chequeos: [chq('2026-11-10', 4, [{ zona: 'codo', dolor: 2 }])] }) }))
    expect(planes(r).find((x) => x.sesion.tipo === 'hombro')!.sesion.detalle?.conCarga).toBe(false)
  })
})

describe('test caducado tras un rojo (P-46)', () => {
  it('con un rojo levantado, el test anterior no fija la carga: la multipresa va por esfuerzo', () => {
    const viejo = ses('v', '2026-10-20', 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 60 })
    const seguimiento = seg({ registros: [reg(viejo, 4, [{ zona: 'dedos', dolor: 5 }])], altas: [{ zona: 'dedos', fecha: '2026-11-05' }] })
    const r = proponerSesion(pet('2026-11-10', CASA, { historial: [viejo], seguimiento }))
    const plan = planes(r).find((x) => x.sesion.tipo === 'multipresa-resistencia')!
    expect(plan.bloques.find((b) => b.nombre.startsWith('Bloque'))!.ejercicios[0]!.cargaKg).toBeUndefined()
    expect(r.estado?.retestDesde).toBe('2026-11-05')
  })
})
