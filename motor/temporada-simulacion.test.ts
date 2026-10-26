import { describe, expect, it } from 'vitest'
import {
  diaNumero, esIntensaDedos, faseEnFecha, fechaDesdeDia, planificarTemporada, proponerSesion, validarContexto, validarSesion,
} from './index'
import type { Contexto, EvaluacionDedos, Sesion, SesionPlan } from './index'

// Temporada completa con la semana real del usuario: martes con gente en el rocódromo, jueves solo en el
// rocódromo, sábado en casa y dos viajes a roca de fin de semana (uno en cada bloque de rendimiento).
const perfil = { pesoKg: 72, anosEscalando: 1.5, lesiones: [] }
const temporada = planificarTemporada('2026-11-02', '2027-10-04')
const viajes = new Set(['2027-03-27', '2027-03-28', '2027-09-11', '2027-09-12'])
const patron: { off: number; ctx: Contexto | null; hora: number }[] = [
  { off: 1, ctx: { compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120 }, hora: 19 },
  { off: 3, ctx: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 120 }, hora: 19 },
  { off: 5, ctx: { compania: 'solo', lugar: 'casa', minutosDisponibles: 45 }, hora: 10 },
  { off: 6, ctx: null, hora: 10 },
]
const ROCA: Contexto = { compania: 'con-gente', lugar: 'roca', minutosDisponibles: 180 }

interface Paso { fecha: string; plan: SesionPlan | null; alternativas: SesionPlan[]; descarga: boolean; ctx: Contexto; historial: Sesion[] }
const pasos: Paso[] = []
const historial: Sesion[] = []
let evaluacion: EvaluacionDedos | undefined
let lastre = 20
for (const s of temporada.semanas) {
  for (const x of patron) {
    const fecha = fechaDesdeDia(diaNumero(s.lunes) + x.off)
    const ctx = viajes.has(fecha) ? ROCA : x.ctx
    if (!ctx) continue
    const fase = faseEnFecha(temporada, fecha)
    const r = proponerSesion({ fecha, horaInicio: x.hora, contexto: ctx, perfil, historial: [...historial], fase, ...(evaluacion ? { evaluacion } : {}) })
    pasos.push({ fecha, plan: r.principal, alternativas: r.alternativas, descarga: s.descarga, ctx, historial: [...historial] })
    if (r.principal) {
      historial.push({ ...r.principal.sesion, id: `h${historial.length}` })
      if (r.principal.sesion.tipo === 'evaluacion-dedos') {
        evaluacion = { fecha, pesoCorporalKg: 72, lastreKg: lastre }
        lastre += 3
      }
    }
  }
}

describe('simulación de la temporada completa (48 semanas)', () => {
  it('ninguna propuesta (principal o alternativa) viola contexto ni seguridad', () => {
    for (const paso of pasos) {
      for (const plan of [paso.plan, ...paso.alternativas]) {
        if (!plan) continue
        expect(validarSesion(plan.sesion, paso.historial, perfil), `${paso.fecha} ${plan.sesion.tipo}`).toEqual([])
        expect(validarContexto(plan.sesion, paso.ctx), `${paso.fecha} ${plan.sesion.tipo}`).toEqual([])
      }
    }
  })
  it('nunca más de 3 sesiones intensas de dedos en 7 días ni dos días seguidos', () => {
    const dias = historial.filter(esIntensaDedos).map((s) => diaNumero(s.fecha))
    for (const d of dias) {
      expect(dias.filter((x) => x >= d && x <= d + 6).length).toBeLessThanOrEqual(3)
      expect(dias.filter((x) => Math.abs(x - d) === 1)).toEqual([])
    }
  })
  it('en semanas de descarga no hay nada al límite', () => {
    const alLimite = ['via-cuerda-limite', 'bloque-limite', 'board', 'pegues-proyecto', 'campus']
    for (const paso of pasos.filter((p) => p.descarga)) {
      for (const plan of [paso.plan, ...paso.alternativas]) if (plan) expect(alLimite, paso.fecha).not.toContain(plan.sesion.tipo)
    }
  })
  it('el test de dedos se repite al final de las fases, nunca antes de 4 semanas de base ni en el afinado final', () => {
    const tests = historial.filter((s) => s.tipo === 'evaluacion-dedos').map((s) => s.fecha)
    expect(tests.length).toBeGreaterThanOrEqual(5)
    expect(diaNumero(tests[0]!) - diaNumero('2026-11-03')).toBeGreaterThanOrEqual(28)
    expect(tests.some((f) => f >= temporada.semanas.at(-1)!.lunes)).toBe(false)
  })
  it('la carga de multipresa nunca supera el 80 % del test vigente', () => {
    for (const paso of pasos) {
      const e = paso.plan?.bloques.flatMap((b) => b.ejercicios).find((x) => x.cargaKg !== undefined)
      if (!e) continue
      const test = [...historial].filter((s) => s.tipo === 'evaluacion-dedos' && s.fecha <= paso.fecha).length
      expect(test).toBeGreaterThan(0)
      expect(72 + e.cargaKg!).toBeLessThanOrEqual(0.8 * (72 + 20 + 3 * (test - 1)) + 1e-9)
    }
  })
  it('en los viajes a roca de rendimiento toca proyecto el primer día y vías cómodas el segundo', () => {
    const dia = (f: string) => pasos.find((p) => p.fecha === f)!.plan!.sesion.tipo
    expect(dia('2027-03-27')).toBe('pegues-proyecto')
    expect(dia('2027-03-28')).toBe('tecnica')
    expect(dia('2027-09-11')).toBe('pegues-proyecto')
    expect(dia('2027-09-12')).toBe('tecnica')
  })
  it('cada fase entrena lo suyo: multipresa en fuerza, 4x4 y resistencia de fuerza en resistencia, nada intenso en transición', () => {
    const tiposEn = (faseId: string) => {
      const lunes = new Set(temporada.semanas.filter((s) => s.faseId === faseId).map((s) => s.lunes))
      return historial.filter((h) => {
        const l = fechaDesdeDia(diaNumero(h.fecha) - (((diaNumero(h.fecha) - 4) % 7) + 7) % 7)
        return lunes.has(l)
      }).map((h) => h.tipo)
    }
    expect(tiposEn('fuerza')).toContain('multipresa-resistencia')
    expect(tiposEn('resistencia')).toContain('resistencia-4x4')
    expect(tiposEn('resistencia')).toContain('multipresa-resistencia-fuerza')
    expect(tiposEn('transicion').filter((t) => ['via-cuerda-limite', 'multipresa-resistencia', 'bloque-limite'].includes(t))).toEqual([])
  })
})

describe('simulación: hallazgos de la revisión', () => {
  const semanaDe = (f: string) => temporada.semanas[Math.floor((diaNumero(f) - diaNumero(temporada.inicio)) / 7)]!
  it('cada test de dedos cae en una semana de reevaluación, salvo el primero (lo desbloquea la base, P-32)', () => {
    const tests = historial.filter((s) => s.tipo === 'evaluacion-dedos').map((s) => s.fecha)
    for (const f of tests.slice(1)) expect(semanaDe(f).reevaluar, f).toBe(true)
  })
  it('en rendimiento hay bloque al límite el día sin compañero y la multipresa es de mantenimiento (1 bloque)', () => {
    const enRendimiento = historial.filter((h) => semanaDe(h.fecha).faseId === 'rendimiento')
    expect(enRendimiento.map((h) => h.tipo)).toContain('bloque-limite')
    for (const paso of pasos.filter((p) => semanaDe(p.fecha).faseId === 'rendimiento' && p.plan?.sesion.tipo === 'multipresa-resistencia')) {
      expect(paso.plan!.bloques.filter((b) => b.nombre.startsWith('Bloque de repeaters')), paso.fecha).toHaveLength(1)
    }
  })
})

describe('simulación con disponibilidad diaria: la carga alta no pasa de los cupos', () => {
  it('en resistencia, el 4x4 no se repite en 7 días aunque se pueda entrenar todos los días', () => {
    const h: Sesion[] = []
    const inicio = temporada.semanas.find((s) => s.ciclo === 1 && s.faseId === 'resistencia' && s.semanaDeFase === 1)!.lunes
    for (let i = 0; i < 21; i++) {
      const fecha = fechaDesdeDia(diaNumero(inicio) + i)
      const ctx: Contexto = { compania: [1, 4].includes(i % 7) ? 'con-gente' : 'solo', lugar: 'rocodromo', minutosDisponibles: 120 }
      const r = proponerSesion({ fecha, horaInicio: 19, contexto: ctx, perfil, historial: [...h], fase: faseEnFecha(temporada, fecha), evaluacion: { fecha: inicio, pesoCorporalKg: 72, lastreKg: 20 } })
      if (r.principal) h.push({ ...r.principal.sesion, id: `d${i}` })
    }
    const cuatro = h.filter((s) => s.tipo === 'resistencia-4x4').map((s) => diaNumero(s.fecha))
    expect(cuatro.length).toBeGreaterThan(0)
    for (const d of cuatro) expect(cuatro.filter((x) => x > d && x <= d + 6)).toEqual([])
  })
})

describe('semana objetivo', () => {
  it('con disponibilidad diaria, el sábado del viaje toca proyecto: nada intenso en sala los días anteriores', () => {
    const h: Sesion[] = [...historial]
    let sabado: string | undefined
    for (let i = 0; i < 7; i++) {
      const fecha = fechaDesdeDia(diaNumero('2027-10-04') + i)
      const roca = i === 5 || i === 6
      const ctx: Contexto = roca ? ROCA : { compania: i % 2 === 0 ? 'con-gente' : 'solo', lugar: 'rocodromo', minutosDisponibles: 120 }
      const r = proponerSesion({ fecha, horaInicio: 10, contexto: ctx, perfil, historial: [...h], fase: faseEnFecha(temporada, fecha), ...(evaluacion ? { evaluacion } : {}) })
      if (!roca && r.principal) expect(esIntensaDedos(r.principal.sesion), fecha).toBe(false)
      if (i === 5) sabado = r.principal?.sesion.tipo
      if (r.principal) h.push({ ...r.principal.sesion, id: `o${i}` })
    }
    expect(sabado).toBe('pegues-proyecto')
  })
})
