import { describe, expect, it } from 'vitest'
import { perfilExperto, perfilNovel, ses } from './_fabrica'
import { validarContexto, validarSesion } from './index'

const historial = [
  ses('a', '2026-10-26', 18),
  ses('b', '2026-10-27', 18, { tipo: 'multipresa-resistencia' }),
  ses('c', '2026-10-28', 8, { tipo: 'resistencia-4x4' }),
  ses('d', '2026-10-30', 18, { tipo: 'multipresa-resistencia', intensidad: 'suave' }),
]
const propuestas = [
  ses('p1', '2026-10-29', 18, { tipo: 'campus' }),
  ses('p2', '2026-10-27', 20, { tipo: 'multipresa-maxima', detalle: { regletaMm: 15, agarre: 'arqueado', conCarga: true } }),
  ses('p3', '2026-10-31', 18, { tipo: 'multipresa-resistencia' }),
]

describe('propiedades de validarSesion', () => {
  it('es determinista', () => {
    for (const p of propuestas) {
      expect(validarSesion(p, historial, perfilNovel)).toEqual(validarSesion(p, historial, perfilNovel))
    }
  })
  it('no muta sus entradas', () => {
    for (const p of propuestas) {
      const antes = structuredClone({ p, historial, perfilNovel })
      validarSesion(p, historial, perfilNovel)
      expect({ p, historial, perfilNovel }).toEqual(antes)
    }
  })
  it('el orden del historial no cambia el resultado', () => {
    for (const p of propuestas) {
      expect(validarSesion(p, [...historial].reverse(), perfilNovel)).toEqual(validarSesion(p, historial, perfilNovel))
    }
  })
  it('toda violación trae sesiones, mensaje y una explicación con parámetros', () => {
    for (const p of propuestas) {
      for (const perfil of [perfilNovel, perfilExperto]) {
        for (const v of validarSesion(p, historial, perfil)) {
          expect(v.sesionIds).toContain(p.id)
          expect(v.mensaje.length).toBeGreaterThan(10)
          expect(v.explicacion.parametros.length).toBeGreaterThan(0)
          expect(v.explicacion.regla).toBe(v.regla)
        }
      }
    }
  })
  it('varias reglas a la vez salen ordenadas por regla', () => {
    const v = validarSesion(propuestas[1]!, historial, perfilNovel)
    const reglas = v.map((x) => x.regla)
    expect(reglas.length).toBeGreaterThan(2)
    expect(reglas).toEqual([...reglas].sort())
  })
  it('lanza con un perfil con anosEscalando NaN', () => {
    expect(() => validarSesion(propuestas[0]!, historial, { ...perfilNovel, anosEscalando: Number.NaN })).toThrow(/anosEscalando/)
  })
})

describe('propiedades de validarContexto', () => {
  it('toda violación de contexto se explica sin evidencia', () => {
    const v = validarContexto(propuestas[0]!, { compania: 'solo', lugar: 'roca', minutosDisponibles: 30 })
    expect(v.length).toBeGreaterThan(0)
    for (const x of v) expect(x.explicacion.origen).toBe('contexto')
  })
})
