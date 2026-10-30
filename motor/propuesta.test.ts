import { describe, expect, it } from 'vitest'
import { BASE_OCTUBRE, perfilExperto, peticion, ses } from './_fabrica'
import { validarContexto } from './contexto'
import { FASE_BASE, FASE_FUERZA } from './fases'
import { proponerSesion } from './propuesta'
import type { EvaluacionDedos, Propuesta } from './propuesta-tipos'
import { esCargaAlta, esIntensaDedos, validarSesion } from './seguridad'

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
    expect(e.motivo).toMatch(/pide 1 sesión de vía con cuerda al límite por semana y esta semana llevas 0/)
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
    expect(r.principal!.explicaciones[0]!.motivo).toMatch(/Sustituye a bloque al límite, porque falta un día completo de descanso/)
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
  const fuerza = (extra = {}) => peticion({ fase: FASE_FUERZA, historial: [antigua, ...BASE_OCTUBRE], ...extra })

  it('sin evaluación vigente propone el test de dedos, luego vía al límite y multipresa', () => {
    expect(tipos(proponerSesion(fuerza()))).toEqual(['evaluacion-dedos', 'via-cuerda-limite', 'multipresa-resistencia'])
  })
  it('con evaluación vigente y compañero, el martes toca vía al límite; la multipresa al 70 % queda como alternativa', () => {
    const r = proponerSesion(fuerza({ evaluacion: evaluacionReciente }))
    expect(tipos(r)).toEqual(['via-cuerda-limite', 'multipresa-resistencia', 'tecnica'])
    expect(r.principal!.sesion.incluye).toEqual(['hombro'])
    const mp = r.alternativas[0]!
    expect(mp.bloques[1]!.ejercicios[0]!.cargaKg).toBe(7) // 0,7 × 110 − 70
    expect(mp.sesion.incluye).toEqual(['tecnica', 'arc', 'hombro'])
    expect(mp.sesion.duracionMin).toBe(90) // 30 + 30 + 15 + 15
  })
  it('sin compañero la multipresa pasa a ser la principal', () => {
    const solo = { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 120 } as const
    const r = proponerSesion(fuerza({ evaluacion: evaluacionReciente, contexto: solo }))
    expect(r.principal!.sesion.tipo).toBe('multipresa-resistencia')
  })
  it('en casa solo ofrece lo que se puede hacer allí (multipresa, hombro y dominadas, sin board) y completa con hombro', () => {
    const r = proponerSesion(fuerza({ evaluacion: evaluacionReciente, contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 120 } }))
    // Las dominadas como sesión (P-39, cupo 1 en la fuerza) van al final: la prioridad más baja de la fase.
    expect(tipos(r)).toEqual(['multipresa-resistencia', 'hombro', 'dominadas'])
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
    // El jueves vuelve a caber trabajo intenso de dedos y la multipresa tiene aún 1 de 2 pendiente: es la
    // principal (la prioridad de la fase manda entre los tipos con cupo pendiente).
    expect(tipos(jueves)).toEqual(['multipresa-resistencia', 'tecnica', 'arc'])
    expect(jueves.proximaVentanaIntensa).toBeUndefined()
    const mpJueves = { ...martesMp, id: 'mp2', fecha: '2026-10-29' }
    expect(validarSesion(mpJueves, pJueves.historial, pJueves.perfil)).toEqual([])
    const miercoles = proponerSesion(fuerza({ fecha: '2026-10-28', contexto: solo, historial: [antigua, martesMp], evaluacion: evaluacionReciente }))
    expect(tipos(miercoles)).toEqual(['tecnica', 'arc', 'hombro'])
    for (const plan of [miercoles.principal!, ...miercoles.alternativas]) expect(esIntensaDedos(plan.sesion)).toBe(false)
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
  it('con todos los cupos cubiertos y mucha actividad reciente la principal es descansar y las alternativas son suaves', () => {
    // Los cupos son por semana natural: todo cae en la semana del lunes 2026-10-26 y se pide el domingo.
    const historial = [
      ses('via1', '2026-10-26', 19, { tipo: 'via-cuerda-limite', duracionMin: 100, incluye: ['hombro'] }),
      ses('blq1', '2026-10-28', 19, { tipo: 'bloque-limite', duracionMin: 50, incluye: ['hombro'] }),
      ses('t1', '2026-10-29', 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 }),
      ses('t2', '2026-10-30', 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 }),
      ses('a1', '2026-10-31', 18, { tipo: 'arc', intensidad: 'suave', duracionMin: 50 }),
    ]
    const r = proponerSesion(peticion({ fecha: '2026-11-01', historial }))
    expect(r.descanso!.regla).toBe('generador.descanso-recomendado')
    expect(r.principal).toBeNull()
    expect(r.alternativas.length).toBeGreaterThan(0)
    for (const plan of r.alternativas) {
      expect(esCargaAlta(plan.sesion)).toBe(false)
      // Con los cupos cubiertos el hombro no entra; solo puede añadirse volumen suave de relleno (técnica o ARC).
      expect(plan.sesion.incluye ?? []).not.toContain('hombro')
    }
  })
  it('las dominadas pendientes (opcionales, P-39) no impiden recomendar el descanso (P-16)', () => {
    const historial = [
      ses('via1', '2026-10-26', 19, { tipo: 'via-cuerda-limite', duracionMin: 100, incluye: ['hombro'] }),
      ses('blq1', '2026-10-28', 19, { tipo: 'bloque-limite', duracionMin: 50, incluye: ['hombro'] }),
      ses('t1', '2026-10-29', 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 }),
      ses('t2', '2026-10-30', 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 }),
      ses('a1', '2026-10-31', 18, { tipo: 'arc', intensidad: 'suave', duracionMin: 50 }),
    ]
    // Fuerza con los cupos de esta semana cubiertos salvo el de dominadas.
    const fase = {
      ...FASE_FUERZA,
      cupos: { 'via-cuerda-limite': 1, 'bloque-limite': 1, tecnica: 2, arc: 1, hombro: 2, dominadas: 1 },
      prioridad: ['via-cuerda-limite', 'bloque-limite', 'tecnica', 'arc', 'hombro', 'dominadas'] as typeof FASE_FUERZA.prioridad,
      prohibidos: FASE_FUERZA.prohibidos.filter((t) => t !== 'bloque-limite'),
    }
    const r = proponerSesion(peticion({ fecha: '2026-11-01', historial, fase }))
    expect(r.descanso?.regla).toBe('generador.descanso-recomendado')
    expect(r.principal).toBeNull()
  })
  it('los complementos de sesiones pasadas cuentan para los cupos', () => {
    // Misma semana natural (lunes 2026-10-26): los dos complementos de hombro cubren su cupo de 2.
    const conHombro = ses('v', '2026-10-27', 19, { tipo: 'via-cuerda-limite', duracionMin: 100, incluye: ['hombro'] })
    const otro = ses('w', '2026-10-26', 19, { tipo: 'bloque-limite', duracionMin: 50, incluye: ['hombro'] })
    const r = proponerSesion(peticion({ fecha: '2026-10-29', historial: [otro, conHombro] }))
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

describe('proponerSesion: hallazgos de la revisión final', () => {
  const diasDesde = (inicio: string, n: number) => {
    const [a, m, d] = inicio.split('-').map(Number) as [number, number, number]
    return Array.from({ length: n }, (_, i) => new Date(Date.UTC(a, m - 1, d + i)).toISOString().slice(0, 10))
  }
  const simular = (fase: typeof FASE_BASE, perfil = peticion().perfil, dias = 14) => {
    const historial: ReturnType<typeof ses>[] = []
    for (const [i, fecha] of diasDesde('2026-10-26', dias).entries()) {
      const r = proponerSesion(peticion({ fecha, fase, perfil, historial: [...historial], evaluacion: evaluacionReciente }))
      if (r.principal) historial.push({ ...r.principal.sesion, id: `d${i}` })
    }
    return historial
  }
  const maxIntensasEn7Dias = (h: ReturnType<typeof simular>) => {
    const intensas = h.filter((s) => esIntensaDedos(s)).map((s) => Date.parse(s.fecha) / 864e5)
    return Math.max(0, ...intensas.map((x) => intensas.filter((y) => y >= x && y <= x + 6).length))
  }

  it('entrenando todos los días en fase base nunca pasa de 2 sesiones intensas de dedos en 7 días (los cupos)', () => {
    expect(maxIntensasEn7Dias(simular(FASE_BASE))).toBeLessThanOrEqual(2)
  })
  it('en fase de fuerza un perfil novel nunca pasa de 3 sesiones intensas de dedos en 7 días', () => {
    expect(maxIntensasEn7Dias(simular(FASE_FUERZA))).toBeLessThanOrEqual(3)
  })
  it('un test implausible para un novel (200 % del peso: un 7,2 tecleado como 72) se rechaza con un mensaje claro', () => {
    const p = peticion({ fase: FASE_FUERZA, evaluacion: { fecha: '2026-10-20', pesoCorporalKg: 72, lastreKg: 72 } })
    expect(() => proponerSesion(p)).toThrow(/poco plausible/)
    expect(() => proponerSesion({ ...p, perfil: perfilExperto })).not.toThrow()
  })
  it('un historial con ids reservados se rechaza con un mensaje que explica qué hacer', () => {
    const guardada = ses('propuesta-tecnica', '2026-10-25', 18, { tipo: 'tecnica', intensidad: 'suave' })
    expect(() => proponerSesion(peticion({ historial: [guardada] }))).toThrow(/id reservado.*id propio/)
  })
  it('cuando el tope semanal bloquea lo intenso, la ventana señala el primer día en que vuelve a caber', () => {
    const blq = (id: string, fecha: string) => ses(id, fecha, 18, { tipo: 'bloque-limite', duracionMin: 50 })
    const historial = [blq('a', '2026-10-26'), blq('b', '2026-10-28'), blq('c', '2026-10-30')]
    const r = proponerSesion(peticion({ fecha: '2026-11-01', historial }))
    for (const plan of [r.principal, ...r.alternativas]) expect(esIntensaDedos(plan!.sesion)).toBe(false)
    expect(r.proximaVentanaIntensa).toEqual({ fecha: '2026-11-02' })
  })
})

describe('proponerSesion: hallazgos de la segunda revisión', () => {
  it('no anuncia una ventana cuando lo intenso está parado por cupos cubiertos y no por la carga (caso de la revisión)', () => {
    const historial = [
      ses('via', '2026-11-03', 19, { tipo: 'via-cuerda-limite', duracionMin: 100 }),
      ses('blq', '2026-11-05', 19, { tipo: 'bloque-limite', duracionMin: 50 }),
    ]
    // Antes devolvía el día 7, en el que no se proponía nada intenso.
    expect(proponerSesion(peticion({ fecha: '2026-11-06', historial })).proximaVentanaIntensa).toBeUndefined()
  })
  it('cuando sí hay ventana, ese día el generador propone de verdad una sesión intensa', () => {
    const martes = ses('martes', '2026-10-27', 19, { tipo: 'via-cuerda-limite', duracionMin: 100 })
    const p = peticion({ fecha: '2026-10-28', contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 120 }, historial: [martes] })
    const ventana = proponerSesion(p).proximaVentanaIntensa!
    expect(ventana).toEqual({ fecha: '2026-10-29' })
    const ese = proponerSesion({ ...p, fecha: ventana.fecha })
    expect([ese.principal, ...ese.alternativas].some((x) => x !== null && esIntensaDedos(x.sesion))).toBe(true)
  })
  it('un test de dedos en el historial cuenta como reciente aunque no se haya guardado la evaluación', () => {
    const test = ses('t', '2026-10-20', 19, {
      tipo: 'evaluacion-dedos', duracionMin: 30, detalle: { regletaMm: 20, agarre: 'semiarqueado', conCarga: true },
    })
    const r = proponerSesion(peticion({ fase: FASE_FUERZA, historial: [antigua, test] }))
    expect(tipos(r)).not.toContain('evaluacion-dedos')
  })
  it('una sesión de hombro no se rellena con escalada (no lleva calentamiento de escalada)', () => {
    const r = proponerSesion(peticion({ contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 120 } }))
    const hombro = [r.principal!, ...r.alternativas].find((x) => x.sesion.tipo === 'hombro')
    if (hombro) expect(hombro.sesion.incluye).toBeUndefined()
    const soloHombro = proponerSesion(peticion({ contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 25 } }))
    expect(soloHombro.principal!.sesion.incluye).toBeUndefined()
  })
})
