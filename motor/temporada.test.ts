import { describe, expect, it } from 'vitest'
import { FASE_BASE } from './fases'
import { faseEnFecha, planificarTemporada, semanaEnFecha } from './temporada'

const temporada = planificarTemporada('2026-11-02', '2027-10-04')
const tramos = (t: typeof temporada) => {
  const out: [string, number, number][] = []
  for (const s of t.semanas) {
    const ultimo = out.at(-1)
    if (ultimo && ultimo[0] === s.faseId && ultimo[1] === s.ciclo) ultimo[2] += 1
    else out.push([s.faseId, s.ciclo, 1])
  }
  return out
}

describe('planificarTemporada', () => {
  it('del 2 de noviembre de 2026 al 4 de octubre de 2027 son 48 semanas con la plantilla exacta', () => {
    expect(temporada.semanas).toHaveLength(48)
    expect(tramos(temporada)).toEqual([
      ['base', 1, 4], ['fuerza', 1, 8], ['resistencia', 1, 6], ['rendimiento', 1, 4], ['transicion', 1, 2],
      ['fuerza', 2, 8], ['resistencia', 2, 6], ['rendimiento', 2, 10],
    ])
    expect(temporada.semanas[0]!.lunes).toBe('2026-11-02')
    expect(temporada.semanas.at(-1)!.lunes).toBe('2027-09-27')
  })
  it('descarga cada 4.ª semana de carga de cada ciclo (P-47) y afinado la última semana', () => {
    const descargas = temporada.semanas.filter((s) => s.descarga).map((s) => `${s.ciclo}:${s.faseId}:${s.semanaDeFase}`)
    expect(descargas).toEqual([
      '1:fuerza:4', '1:fuerza:8', '1:resistencia:4', '1:rendimiento:2',
      '2:fuerza:4', '2:fuerza:8', '2:resistencia:4', '2:rendimiento:2', '2:rendimiento:6', '2:rendimiento:10',
    ])
  })
  it('la base y la transición no tienen descargas (ya son suaves)', () => {
    expect(temporada.semanas.filter((s) => (s.faseId === 'base' || s.faseId === 'transicion') && s.descarga)).toEqual([])
  })
  it('se reevalúa al final de cada fase (P-26) y a mitad del rendimiento final (P-08), salvo base, transición y afinado', () => {
    const reev = temporada.semanas.filter((s) => s.reevaluar).map((s) => `${s.ciclo}:${s.faseId}:${s.semanaDeFase}`)
    expect(reev).toEqual([
      '1:fuerza:8', '1:resistencia:6', '1:rendimiento:4', '2:fuerza:8', '2:resistencia:6', '2:rendimiento:5',
    ])
  })
  it('un objetivo a mitad de semana se normaliza a su lunes', () => {
    expect(planificarTemporada('2026-11-02', '2027-10-07')).toEqual({ ...temporada, objetivo: '2027-10-04' })
  })
  it('con 44 semanas recorta el rendimiento final; con 52 alarga rendimiento final, transición y primavera', () => {
    expect(tramos(planificarTemporada('2026-11-02', '2027-09-06')).map((x) => x[2])).toEqual([4, 8, 6, 4, 2, 8, 6, 6])
    expect(tramos(planificarTemporada('2026-11-02', '2027-11-01')).map((x) => x[2])).toEqual([4, 8, 6, 5, 3, 8, 6, 12])
  })
  it('fuera de 42-53 semanas o con un inicio que no es lunes lanza un error claro', () => {
    expect(() => planificarTemporada('2026-11-02', '2027-08-16')).toThrow(/41 semanas.*entre 42 y 53/)
    expect(() => planificarTemporada('2026-11-02', '2027-11-15')).toThrow(/54 semanas.*entre 42 y 53/)
    expect(() => planificarTemporada('2026-11-03', '2027-10-04')).toThrow(/lunes/)
  })
})

describe('semanaEnFecha y faseEnFecha', () => {
  it('encuentra la semana de cualquier día y la fase sin descarga en una semana normal', () => {
    expect(semanaEnFecha(temporada, '2026-11-05')).toMatchObject({ faseId: 'base', semanaDeFase: 1 })
    expect(faseEnFecha(temporada, '2026-11-05')).toEqual(FASE_BASE)
  })
  it('en una semana de descarga no hay nada al límite', () => {
    const lunes = temporada.semanas.find((s) => s.faseId === 'fuerza' && s.semanaDeFase === 4)!.lunes
    const f = faseEnFecha(temporada, lunes)
    expect(f.descarga).toBe(true)
    for (const t of ['via-cuerda-limite', 'bloque-limite', 'board', 'pegues-proyecto', 'evaluacion-dedos'] as const) {
      expect(f.prioridad).not.toContain(t)
      expect(f.prohibidos).toContain(t)
    }
    expect(f.prioridad).toContain('multipresa-resistencia')
  })
  it('en la semana de reevaluación el test está permitido aunque coincida con una descarga', () => {
    const lunes = temporada.semanas.find((s) => s.ciclo === 1 && s.faseId === 'fuerza' && s.semanaDeFase === 8)!.lunes
    const f = faseEnFecha(temporada, lunes)
    expect(f.descarga).toBe(true)
    expect(f.reevaluar).toBe(true)
    expect(f.prioridad[0]).toBe('evaluacion-dedos')
    expect(f.prohibidos).not.toContain('evaluacion-dedos')
    expect(f.prioridad).not.toContain('via-cuerda-limite')
  })
  it('la semana objetivo y la siguiente son de rendimiento, sin test ni descarga', () => {
    for (const f of ['2027-10-04', '2027-10-09', '2027-10-17']) {
      const fase = faseEnFecha(temporada, f)
      expect(fase.id).toBe('rendimiento')
      expect(fase.descarga).toBeUndefined()
      expect(fase.prohibidos).toContain('evaluacion-dedos')
    }
  })
  it('fuera de la temporada lanza un error claro', () => {
    expect(() => faseEnFecha(temporada, '2026-10-30')).toThrow(/fuera de la temporada/)
    expect(() => faseEnFecha(temporada, '2027-10-18')).toThrow(/fuera de la temporada/)
  })
  it('las fases devueltas no se pueden modificar por accidente', () => {
    const fase = faseEnFecha(temporada, '2026-11-05')
    expect(() => fase.prioridad.push('campus')).toThrow()
    expect(faseEnFecha(temporada, '2026-11-05').prioridad).not.toContain('campus')
  })
})

describe('límites del rango', () => {
  it('42 y 53 semanas son válidas', () => {
    expect(planificarTemporada('2026-11-02', '2027-08-23').semanas).toHaveLength(42)
    expect(planificarTemporada('2026-11-02', '2027-11-08').semanas).toHaveLength(53)
  })
})
