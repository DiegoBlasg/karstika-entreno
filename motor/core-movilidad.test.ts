import { describe, expect, it } from 'vitest'
import { esCargaAlta, FASES, proponerSesion, type Lugar, type Peticion, type Sesion } from '.'

// Base con cupos de técnica cubiertos y una vía al límite hecha: en casa, la base no tiene nada que hacer (hombro y
// técnica cubiertos) y el motor recomienda descansar.
const ctx = (lugar: Lugar, minutosDisponibles = 45, compania: 'solo' | 'con-gente' = 'con-gente') =>
  ({ compania, lugar, minutosDisponibles, multipresaEnCasa: false })
const sesion = (id: string, fecha: string, tipo: Sesion['tipo'], intensidad: Sesion['intensidad'] = 'suave'): Sesion =>
  ({ id, tipo, intensidad, fecha, horaInicio: 18, duracionMin: 60 })
const HISTORIAL: Sesion[] = [
  sesion('a', '2026-11-02', 'tecnica'), sesion('b', '2026-11-03', 'hombro'), sesion('c', '2026-11-03', 'tecnica'),
  sesion('d', '2026-11-04', 'hombro'), sesion('e', '2026-11-04', 'via-cuerda-limite', 'alta'), sesion('f', '2026-11-05', 'arc'),
]
const peticion = (lugar: Lugar, minutos = 45, extra: Partial<Peticion> = {}): Peticion => ({
  fecha: '2026-11-06', horaInicio: 18, contexto: ctx(lugar, minutos),
  perfil: { pesoKg: 70, anosEscalando: 1.5, lesiones: [] }, historial: HISTORIAL, fase: FASES.base, ...extra,
})

describe('core-movilidad (P-72)', () => {
  it('cuando la propuesta es descanso, sale como primera alternativa', () => {
    const r = proponerSesion(peticion('casa'))
    expect(r.principal).toBeNull()
    expect(r.descanso).toBeDefined()
    expect(r.alternativas[0]?.sesion.tipo).toBe('core-movilidad')
  })
  it('nunca es carga alta y dura 30 min con 30 o más disponibles, 20 con menos', () => {
    const core = proponerSesion(peticion('casa')).alternativas[0]!
    expect(esCargaAlta(core.sesion)).toBe(false)
    expect(core.sesion.intensidad).toBe('suave')
    expect(core.sesion.duracionMin).toBe(30)
    const corto = proponerSesion(peticion('casa', 25)).alternativas.find((o) => o.sesion.tipo === 'core-movilidad')
    expect(corto?.sesion.duracionMin).toBe(20)
    expect(proponerSesion(peticion('casa', 15)).alternativas.some((o) => o.sesion.tipo === 'core-movilidad')).toBe(false)
  })
  it('paso alto y tobillo solo en la de 30 min (en la de 20 no caben)', () => {
    const fichas = (m: number) => proponerSesion(peticion('casa', m)).alternativas.find((o) => o.sesion.tipo === 'core-movilidad')!.bloques.flatMap((b) => b.ejercicios.map((e) => e.ficha))
    expect(fichas(30)).toEqual(expect.arrayContaining(['paso-alto', 'tobillo']))
    expect(fichas(25)).not.toContain('paso-alto')
    expect(fichas(25)).not.toContain('tobillo')
  })
  it('con barra hay elevaciones colgado; en roca, tumbado', () => {
    const nombres = (lugar: Lugar): string[] => {
      const r = proponerSesion(peticion(lugar))
      const core = [r.principal, ...r.alternativas].find((o) => o?.sesion.tipo === 'core-movilidad')
      return core ? core.bloques.flatMap((b) => b.ejercicios.map((e) => e.nombre)) : []
    }
    expect(nombres('casa')).toContain('Elevaciones de piernas colgado')
    const roca = nombres('roca')
    if (roca.length > 0) {
      expect(roca).toContain('Elevaciones de piernas tumbado')
      expect(roca).not.toContain('Elevaciones de piernas colgado')
    }
  })
  it('con una zona en rojo no se ofrece', () => {
    const r = proponerSesion(peticion('casa', 45, {
      seguimiento: { registros: [], altas: [], chequeos: [{ fecha: '2026-11-06', sueno: 3, fatiga: 3, ganas: 3, molestias: [{ zona: 'dedos', dolor: 5 }] }] },
    }))
    expect(r.principal).toBeNull()
    expect(r.alternativas.some((o) => o.sesion.tipo === 'core-movilidad')).toBe(false)
  })
  it('con principal no se añade', () => {
    const r = proponerSesion(peticion('rocodromo', 90, { historial: [] }))
    expect(r.principal).not.toBeNull()
    expect([r.principal, ...r.alternativas].some((o) => o?.sesion.tipo === 'core-movilidad')).toBe(false)
  })
  it('no está en los cupos ni en la prioridad de ninguna fase', () => {
    for (const f of Object.values(FASES)) {
      expect(f.cupos['core-movilidad']).toBeUndefined()
      expect(f.prioridad).not.toContain('core-movilidad')
    }
  })
})
