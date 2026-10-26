import { describe, expect, it } from 'vitest'
import { perfilExperto, perfilNovel, peticion, ses } from './_fabrica'
import {
  esIntensaDedos, FASE_BASE, FASE_FUERZA, proponerSesion, TIPOS_COMPLEMENTO, validarContexto, validarSesion,
} from './index'
import type { Peticion, SesionPlan } from './index'

const historial = [
  ses('h1', '2026-09-01', 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 }),
  ses('h2', '2026-10-20', 19, { tipo: 'multipresa-resistencia', detalle: { regletaMm: 20, agarre: 'semiarqueado' } }),
  ses('h3', '2026-10-26', 19, { tipo: 'bloque-limite', duracionMin: 50, incluye: ['hombro'] }),
]
const evaluacion = { fecha: '2026-10-15', pesoCorporalKg: 70, lastreKg: 25 }

const escenarios: Peticion[] = []
for (const fase of [FASE_BASE, FASE_FUERZA]) {
  for (const perfil of [perfilNovel, perfilExperto]) {
    for (const compania of ['solo', 'con-gente'] as const) {
      for (const lugar of ['rocodromo', 'roca', 'casa'] as const) {
        for (const minutosDisponibles of [15, 45, 120]) {
          for (const fecha of ['2026-10-27', '2026-10-28']) {
            escenarios.push(peticion({ fase, perfil, fecha, historial, evaluacion, contexto: { compania, lugar, minutosDisponibles } }))
          }
        }
      }
    }
  }
}
const planes = (p: Peticion): SesionPlan[] => {
  const r = proponerSesion(p)
  return [...(r.principal ? [r.principal] : []), ...r.alternativas]
}

describe('propiedades de proponerSesion (todas las combinaciones)', () => {
  it('hay 144 escenarios', () => {
    expect(escenarios.length).toBe(2 * 2 * 2 * 3 * 3 * 2)
  })
  it('es determinista y no muta la petición', () => {
    for (const p of escenarios) {
      const antes = structuredClone(p)
      expect(proponerSesion(p)).toEqual(proponerSesion(p))
      expect(p).toEqual(antes)
    }
  })
  it('toda sesión propuesta, ya compuesta, supera contexto y seguridad al revalidarla', () => {
    for (const p of escenarios) {
      for (const plan of planes(p)) {
        expect(validarContexto(plan.sesion, p.contexto), JSON.stringify(plan.sesion)).toEqual([])
        expect(validarSesion(plan.sesion, p.historial, p.perfil), JSON.stringify(plan.sesion)).toEqual([])
      }
    }
  })
  it('principal y alternativas son de tipos distintos; sin principal no hay alternativas y sí descanso', () => {
    for (const p of escenarios) {
      const r = proponerSesion(p)
      const t = planes(p).map((x) => x.sesion.tipo)
      expect(new Set(t).size).toBe(t.length)
      expect(r.alternativas.length).toBeLessThanOrEqual(2)
      if (!r.principal) {
        expect(r.alternativas).toEqual([])
        expect(r.descanso).toBeDefined()
      }
    }
  })
  it('las sesiones caben en el tiempo, sus bloques suman su duración y el hombro, si está, va al final', () => {
    for (const p of escenarios) {
      for (const plan of planes(p)) {
        expect(plan.sesion.duracionMin).toBeLessThanOrEqual(p.contexto.minutosDisponibles)
        expect(plan.bloques.reduce((a, b) => a + b.minutos, 0)).toBe(plan.sesion.duracionMin)
        expect(plan.explicaciones).toHaveLength(plan.bloques.length + 1)
        const inc = plan.sesion.incluye ?? []
        for (const t of inc) expect(TIPOS_COMPLEMENTO).toContain(t)
        if (inc.includes('hombro')) expect(plan.bloques.at(-1)!.nombre).toMatch(/hombro/)
      }
    }
  })
  it('un perfil novel nunca recibe suspensiones máximas ni campus, y su multipresa y test van a 20 mm semiarqueado', () => {
    for (const p of escenarios.filter((x) => x.perfil === perfilNovel)) {
      for (const plan of planes(p)) {
        expect(['multipresa-maxima', 'campus']).not.toContain(plan.sesion.tipo)
        if (['multipresa-resistencia', 'evaluacion-dedos'].includes(plan.sesion.tipo)) {
          expect(plan.sesion.detalle).toMatchObject({ regletaMm: 20, agarre: 'semiarqueado' })
        }
      }
    }
  })
  it('sin compañero nunca se propone cuerda ni se menciona', () => {
    for (const p of escenarios.filter((x) => x.contexto.compania === 'solo')) {
      for (const plan of planes(p)) {
        expect(['via-cuerda-limite', 'pegues-proyecto']).not.toContain(plan.sesion.tipo)
        for (const b of plan.bloques) for (const e of b.ejercicios) expect(e.nombre).not.toMatch(/con cuerda/)
      }
    }
  })
  it('el día siguiente a una sesión intensa de dedos nunca se propone otra', () => {
    // h3 (bloque al límite) es del 26: el 27 no puede haber sesión intensa de dedos.
    for (const p of escenarios.filter((x) => x.fecha === '2026-10-27')) {
      for (const plan of planes(p)) expect(esIntensaDedos(plan.sesion), plan.sesion.tipo).toBe(false)
    }
  })
})
