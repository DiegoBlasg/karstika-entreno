import { describe, expect, it } from 'vitest'
import { explicar, explicarContexto } from './explicacion'
import { METADATOS, type ParametroId } from './metadatos'

describe('explicar', () => {
  it('deriva evidencias, nivel y origen de los parámetros', () => {
    const e = explicar('regla.prueba', ['P-02'], 'porque sí')
    expect(e.parametros).toEqual(['P-02'])
    expect(e.evidencias).toEqual(METADATOS['P-02'].evidencia)
    expect(e.nivelMinimo).toBe(METADATOS['P-02'].nivelMinimo)
    expect(e.origen).toBe('evidencia')
    expect(e.motivo).toBe('porque sí')
  })
  it('un parámetro de diseño rebaja el nivel a sinEvidencia y el origen a diseno', () => {
    const e = explicar('regla.prueba', ['P-02', 'P-14'], 'm')
    expect(METADATOS['P-14'].origen).toBe('diseno')
    expect(e.nivelMinimo).toBe('sinEvidencia')
    expect(e.origen).toBe('diseno')
  })
  it('une evidencias sin duplicados y ordenadas, y ordena los parámetros', () => {
    const e = explicar('regla.prueba', ['P-05', 'P-02', 'P-02'], 'm')
    expect(e.parametros).toEqual(['P-02', 'P-05'])
    expect(e.evidencias).toEqual([...new Set(e.evidencias)].sort())
    expect(e.evidencias.length).toBeGreaterThan(0)
  })
  it('lanza sin parámetros', () => {
    expect(() => explicar('regla.prueba', [], 'm')).toThrow(/ningún parámetro/)
  })
  it('lanza con un parámetro desconocido', () => {
    expect(() => explicar('regla.prueba', ['P-99' as ParametroId], 'm')).toThrow(/desconocido/)
  })
  it('lanza con regla o motivo vacíos', () => {
    expect(() => explicar('', ['P-02'], 'm')).toThrow()
    expect(() => explicar('regla.prueba', ['P-02'], '  ')).toThrow()
  })
})

describe('explicar: casos límite', () => {
  const ids = Object.keys(METADATOS) as ParametroId[]
  const conEvidencia = ids.filter((id) => METADATOS[id].origen === 'evidencia' && METADATOS[id].evidencia.length > 0)
  const nivelesAB = ['A', 'B', 'C']

  it('nivelMinimo es el más bajo entre dos parámetros con evidencia, en ambos órdenes', () => {
    const a = conEvidencia.find((id) => nivelesAB.includes(METADATOS[id].nivelMinimo))!
    const b = conEvidencia.find(
      (id) => nivelesAB.includes(METADATOS[id].nivelMinimo) && METADATOS[id].nivelMinimo !== METADATOS[a].nivelMinimo,
    )!
    expect(b).toBeDefined()
    const orden = ['C', 'B', 'A']
    const esperado = orden.find((n) => n === METADATOS[a].nivelMinimo || n === METADATOS[b].nivelMinimo)
    expect(explicar('r.x', [a, b], 'm').nivelMinimo).toBe(esperado)
    expect(explicar('r.x', [b, a], 'm').nivelMinimo).toBe(esperado)
  })

  it('una evidencia compartida entre parámetros distintos aparece una sola vez, ordenada', () => {
    let par: [ParametroId, ParametroId, string] | undefined
    for (const x of ids) {
      for (const y of ids) {
        if (x >= y) continue
        const comun = METADATOS[x].evidencia.find((ev) => METADATOS[y].evidencia.includes(ev))
        if (comun) {
          par = [x, y, comun]
          break
        }
      }
      if (par) break
    }
    expect(par).toBeDefined()
    const [x, y, comun] = par!
    const e = explicar('r.x', [x, y], 'm')
    expect(e.evidencias.filter((ev) => ev === comun)).toHaveLength(1)
    const manual = [...METADATOS[x].evidencia, ...METADATOS[y].evidencia]
      .filter((ev, i, arr) => arr.indexOf(ev) === i)
      .sort((p, q) => (p < q ? -1 : p > q ? 1 : 0))
    expect(e.evidencias).toEqual(manual)
    expect(explicar('r.x', [y, x], 'm')).toEqual(e)
  })

  it('no muta los parámetros de entrada ni METADATOS', () => {
    const entrada: ParametroId[] = ['P-05', 'P-02', 'P-02']
    const entradaAntes = structuredClone(entrada)
    const metaAntes = structuredClone(METADATOS)
    explicar('r.x', entrada, 'm')
    expect(entrada).toEqual(entradaAntes)
    expect(METADATOS).toEqual(metaAntes)
  })

  it.each(['constructor', 'toString', '__proto__'])('lanza con la clave de prototipo %s', (id) => {
    expect(() => explicar('r.x', [id as ParametroId], 'm')).toThrow(/desconocido/)
  })
})

describe('explicarContexto', () => {
  it('no cita parámetros ni evidencia', () => {
    const e = explicarContexto('contexto.sin-cuerda', 'Sin compañero no hay cuerda.')
    expect(e).toEqual({
      regla: 'contexto.sin-cuerda',
      parametros: [],
      evidencias: [],
      nivelMinimo: 'sinEvidencia',
      origen: 'contexto',
      motivo: 'Sin compañero no hay cuerda.',
    })
  })
  it('lanza con motivo vacío o en blanco', () => {
    expect(() => explicarContexto('contexto.x', '')).toThrow()
    expect(() => explicarContexto('contexto.x', '   ')).toThrow()
  })
  it('exige algo después del prefijo contexto.', () => {
    expect(() => explicarContexto('contexto.', 'm')).toThrow(/contexto\./)
  })
  it('exige que la regla empiece por contexto.', () => {
    expect(() => explicarContexto('seguridad.x', 'm')).toThrow(/contexto\./)
  })
})
