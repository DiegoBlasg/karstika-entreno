import { describe, expect, it } from 'vitest'
import { descargar, FASE_BASE, FASE_FUERZA, FASE_RENDIMIENTO, FASE_TRANSICION, FASES } from './fases'
import { VALORES } from './parametros'
import { TIPOS_CON_PLANTILLA } from './plantillas'

describe.each([FASE_BASE, FASE_FUERZA])('fase $id: plantillas', (fase) => {
  it('todos los tipos prioritarios tienen plantilla', () => {
    for (const t of fase.prioridad) expect(TIPOS_CON_PLANTILLA, t).toContain(t)
  })
})

describe.each([FASE_BASE, FASE_FUERZA])('fase $id', (fase) => {
  it('ningún tipo está a la vez en prioridad y en prohibidos', () => {
    for (const t of fase.prioridad) expect(fase.prohibidos, t).not.toContain(t)
  })
  it('los cupos solo existen para tipos prioritarios y son enteros positivos', () => {
    for (const [tipo, cupo] of Object.entries(fase.cupos)) {
      expect(fase.prioridad, tipo).toContain(tipo)
      expect(Number.isInteger(cupo) && cupo! > 0, tipo).toBe(true)
    }
  })
  it('la prioridad no tiene repetidos', () => {
    expect(new Set(fase.prioridad).size).toBe(fase.prioridad.length)
  })
})

describe('FASE_BASE respeta P-32', () => {
  it('no prescribe fuerza de dedos ni board', () => {
    for (const t of ['multipresa-resistencia', 'multipresa-maxima', 'board', 'campus'] as const) {
      expect(FASE_BASE.prioridad).not.toContain(t)
      expect(FASE_BASE.prohibidos).toContain(t)
    }
  })
  it('permite el test de dedos', () => {
    expect(FASE_BASE.prioridad[0]).toBe('evaluacion-dedos')
  })
})

describe('FASE_FUERZA', () => {
  it('prioriza la multipresa de repeaters y nunca las suspensiones máximas ni el campus', () => {
    expect(FASE_FUERZA.prioridad).toContain('multipresa-resistencia')
    expect(FASE_FUERZA.prohibidos).toContain('multipresa-maxima')
    expect(FASE_FUERZA.prohibidos).toContain('campus')
  })
})

describe('escalar al límite desde la base (decisión del usuario)', () => {
  it('la base incluye vía con cuerda y bloque al límite con cupo de 1 por semana cada una', () => {
    expect(FASE_BASE.prioridad).toEqual(expect.arrayContaining(['via-cuerda-limite', 'bloque-limite']))
    expect(FASE_BASE.cupos['via-cuerda-limite']).toBe(1)
    expect(FASE_BASE.cupos['bloque-limite']).toBe(1)
  })
  it('la fase de fuerza mantiene la vía al límite junto a la multipresa', () => {
    expect(FASE_FUERZA.prioridad).toContain('via-cuerda-limite')
    expect(FASE_FUERZA.cupos['multipresa-resistencia']).toBe(2)
  })
})

describe('todas las fases de la temporada', () => {
  const todas = Object.values(FASES)
  const intensasDedos: readonly string[] = VALORES['P-15'].tiposIntensosDedos

  it.each(todas)('$id: coherencia de prioridad, cupos y prohibidos, y plantilla para cada tipo', (fase) => {
    for (const t of fase.prioridad) {
      expect(fase.prohibidos, t).not.toContain(t)
      expect(TIPOS_CON_PLANTILLA, t).toContain(t)
    }
    for (const t of Object.keys(fase.cupos)) expect(fase.prioridad, t).toContain(t)
  })
  it.each(todas)('$id: los cupos de sesiones intensas de dedos no pasan del tope de 3 por semana (P-12)', (fase) => {
    // El test de dedos es puntual (una vez por fase), no semanal: no cuenta para el tope habitual. Los pegues
    // solo existen en viajes a roca y compiten con la vía al límite: en semanas de sala no cuentan, y en semanas
    // de viaje la regla seguridad.dedos-7dias impide pasar de 3.
    const total = Object.entries(fase.cupos)
      .filter(([t]) => intensasDedos.includes(t) && t !== 'evaluacion-dedos' && t !== 'pegues-proyecto')
      .reduce((a, [, n]) => a + (n ?? 0), 0)
    expect(total).toBeLessThanOrEqual(VALORES['P-12'].maxSesionesIntensasDedos7Dias)
  })
  it('la transición no tiene nada intenso', () => {
    for (const t of FASE_TRANSICION.prioridad) expect(intensasDedos).not.toContain(t)
  })
  it('descargar quita todo lo que es al límite, marca la fase y no muta la original', () => {
    const antes = structuredClone(FASE_RENDIMIENTO)
    const d = descargar(FASE_RENDIMIENTO)
    expect(FASE_RENDIMIENTO).toEqual(antes)
    expect(d.descarga).toBe(true)
    for (const t of ['via-cuerda-limite', 'pegues-proyecto', 'bloque-limite', 'board', 'campus', 'evaluacion-dedos'] as const) {
      expect(d.prioridad).not.toContain(t)
      expect(d.cupos[t]).toBeUndefined()
      expect(d.prohibidos).toContain(t)
    }
    expect(d.prioridad).toContain('multipresa-resistencia')
  })
})
