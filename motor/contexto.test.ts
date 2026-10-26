import { describe, expect, it } from 'vitest'
import { ses } from './_fabrica'
import { tiposPosibles, validarContexto } from './contexto'
import type { Contexto } from './tipos'

const ctx = (c: Partial<Contexto> = {}): Contexto => ({
  compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 120, ...c,
})

describe('tiposPosibles: tabla completa de las 6 combinaciones', () => {
  const sinCuerda = [
    'arc', 'bloque-limite', 'bloque-suave', 'board', 'campus', 'descanso', 'dominadas', 'evaluacion-dedos', 'hombro',
    'multipresa-maxima', 'multipresa-resistencia', 'resistencia-4x4', 'tecnica', 'via-autoasegurada',
  ]
  const enCasa = [
    'board', 'campus', 'descanso', 'dominadas', 'evaluacion-dedos', 'hombro', 'multipresa-maxima', 'multipresa-resistencia',
  ]
  const tabla = [
    ['solo', 'rocodromo', sinCuerda],
    ['con-gente', 'rocodromo', [...sinCuerda, 'via-cuerda-limite']],
    ['solo', 'roca', ['descanso']],
    ['con-gente', 'roca', ['descanso', 'pegues-proyecto', 'via-cuerda-limite']],
    ['solo', 'casa', enCasa],
    ['con-gente', 'casa', enCasa],
  ] as const
  it.each(tabla)('%s en %s', (compania, lugar, esperado) => {
    expect(tiposPosibles(ctx({ compania, lugar }))).toEqual(esperado)
  })
  it('lanza con minutos infinitos', () => {
    expect(() => tiposPosibles(ctx({ minutosDisponibles: Infinity }))).toThrow(/minutosDisponibles/)
  })
})

describe('tiposPosibles', () => {
  it('solo en rocódromo: bloque, autoasegurada, board y técnica; nunca cuerda ni pegues', () => {
    const t = tiposPosibles(ctx())
    for (const ok of ['bloque-limite', 'bloque-suave', 'via-autoasegurada', 'board', 'tecnica', 'arc', 'resistencia-4x4', 'descanso']) {
      expect(t).toContain(ok)
    }
    expect(t).not.toContain('via-cuerda-limite')
    expect(t).not.toContain('pegues-proyecto')
  })
  it('con gente en rocódromo: vías con cuerda sí, pegues no (solo en roca)', () => {
    const t = tiposPosibles(ctx({ compania: 'con-gente' }))
    expect(t).toContain('via-cuerda-limite')
    expect(t).not.toContain('pegues-proyecto')
  })
  it('con gente en roca: cuerda y pegues, sin bloque ni autoasegurada', () => {
    const t = tiposPosibles(ctx({ compania: 'con-gente', lugar: 'roca' }))
    expect(t).toContain('via-cuerda-limite')
    expect(t).toContain('pegues-proyecto')
    expect(t).not.toContain('bloque-limite')
    expect(t).not.toContain('via-autoasegurada')
  })
  it('solo en roca: únicamente descanso', () => {
    expect(tiposPosibles(ctx({ lugar: 'roca' }))).toEqual(['descanso'])
  })
  it('en casa: multipresa, board, dominadas, hombro, campus y descanso', () => {
    expect(tiposPosibles(ctx({ lugar: 'casa' }))).toEqual(
      ['board', 'campus', 'descanso', 'dominadas', 'evaluacion-dedos', 'hombro', 'multipresa-maxima', 'multipresa-resistencia'],
    )
  })
  it('siempre incluye descanso y está ordenada', () => {
    for (const compania of ['solo', 'con-gente'] as const) {
      for (const lugar of ['rocodromo', 'roca', 'casa'] as const) {
        const t = tiposPosibles(ctx({ compania, lugar }))
        expect(t).toContain('descanso')
        expect(t).toEqual([...t].sort())
      }
    }
  })
  it('lanza con minutos no positivos', () => {
    expect(() => tiposPosibles(ctx({ minutosDisponibles: 0 }))).toThrow(/minutosDisponibles/)
    expect(() => tiposPosibles(ctx({ minutosDisponibles: Number.NaN }))).toThrow(/minutosDisponibles/)
  })
})

describe('validarContexto', () => {
  it('sin violaciones cuando todo encaja', () => {
    expect(validarContexto(ses('a', '2026-10-27', 18, { tipo: 'bloque-limite' }), ctx())).toEqual([])
  })
  it('vía con cuerda estando solo: contexto.sin-cuerda', () => {
    const v = validarContexto(ses('a', '2026-10-27', 18, { tipo: 'via-cuerda-limite' }), ctx())
    expect(v.map((x) => x.regla)).toEqual(['contexto.sin-cuerda'])
    expect(v[0]!.sesionIds).toEqual(['a'])
    expect(v[0]!.explicacion.origen).toBe('contexto')
  })
  it('tipo imposible en el lugar: contexto.lugar', () => {
    const v = validarContexto(ses('a', '2026-10-27', 18, { tipo: 'bloque-limite' }), ctx({ lugar: 'casa' }))
    expect(v.map((x) => x.regla)).toEqual(['contexto.lugar'])
  })
  it('más duración que tiempo disponible: contexto.tiempo (el límite exacto pasa)', () => {
    expect(validarContexto(ses('a', '2026-10-27', 18, { duracionMin: 120 }), ctx())).toEqual([])
    const v = validarContexto(ses('a', '2026-10-27', 18, { duracionMin: 121 }), ctx())
    expect(v.map((x) => x.regla)).toEqual(['contexto.tiempo'])
  })
  it('varias violaciones salen ordenadas por regla', () => {
    const v = validarContexto(
      ses('a', '2026-10-27', 18, { tipo: 'pegues-proyecto', duracionMin: 300 }),
      ctx({ compania: 'solo', lugar: 'rocodromo' }),
    )
    expect(v.map((x) => x.regla)).toEqual(['contexto.lugar', 'contexto.sin-cuerda', 'contexto.tiempo'])
  })
  it('no muta sus entradas', () => {
    const s = ses('a', '2026-10-27', 18, { tipo: 'via-cuerda-limite' })
    const c = ctx()
    const antes = structuredClone({ s, c })
    validarContexto(s, c)
    expect({ s, c }).toEqual(antes)
  })
})
