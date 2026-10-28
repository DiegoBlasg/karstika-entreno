import { describe, expect, it } from 'vitest'
import { construirSesion, descargar, FASES, type Contexto, type Peticion, type SesionPlan, type TipoSesion } from '../../motor'
import { pasosDeSesion, segundosDe, SEGUNDOS_PREPARATE, type Paso } from './pasos'

const CASA: Contexto = { compania: 'solo', lugar: 'casa', minutosDisponibles: 90 }
const ROCO: Contexto = { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 90 }
const peticion = (contexto: Contexto, fase = FASES.fuerza): Peticion => ({
  fecha: '2026-11-02', horaInicio: 9, contexto, perfil: { pesoKg: 72, anosEscalando: 1.5, lesiones: [] }, historial: [], fase,
  evaluacion: { fecha: '2026-10-01', pesoCorporalKg: 72, lastreKg: 15 },
})
const plan = (tipo: TipoSesion, contexto: Contexto, fase = FASES.fuerza): SesionPlan => {
  const p = construirSesion(tipo, peticion(contexto, fase))
  if (!p) throw new Error(`sin plan para ${tipo}`)
  return p
}
const tipos = (ps: Paso[]) => ps.map((p) => p.tipo)

describe('pasosDeSesion', () => {
  it('los intentos del test llevan su número; las repeticiones de los repeaters, no', () => {
    const ps = pasosDeSesion(plan('evaluacion-dedos', CASA))
    expect(ps.filter((p) => p.tipo === 'colgado').map((p) => (p.tipo === 'colgado' ? p.intento : undefined))).toEqual([
      { n: 1, de: 3 }, { n: 2, de: 3 }, { n: 3, de: 3 },
    ])
    const rep = pasosDeSesion(plan('multipresa-resistencia', CASA)).filter((p) => p.tipo === 'colgado')
    expect(rep.every((p) => p.tipo === 'colgado' && p.intento === undefined)).toBe(true)
  })
  it('repeaters: prepárate, colgado/descanso por repetición, sin descanso corto tras la última, descanso entre series', () => {
    const pl = plan('multipresa-resistencia', CASA)
    const ej = pl.bloques.flatMap((b) => b.ejercicios).find((e) => e.repeticiones !== undefined)!
    const ps = pasosDeSesion(pl)
    const del = ps.filter((p) => p.bloque !== pl.bloques[0]!.nombre)
    expect(del[0]).toMatchObject({ tipo: 'preparate', segundos: SEGUNDOS_PREPARATE })
    expect(del.filter((p) => p.tipo === 'colgado').length).toBe(ej.series! * ej.repeticiones!)
    expect(del.filter((p) => p.tipo === 'descanso' && p.segundos === ej.descansoS).length).toBe(ej.series! * (ej.repeticiones! - 1))
    expect(del.filter((p) => p.tipo === 'descanso' && p.segundos === ej.descansoSeriesS).length).toBe(ej.series! - 1)
    expect(del[1]).toMatchObject({ tipo: 'colgado', segundos: ej.trabajoS, titulo: `Serie 1 de ${ej.series} · rep 1 de ${ej.repeticiones}` })
    expect(ps[0]).toMatchObject({ tipo: 'bloque', segundos: pl.bloques[0]!.minutos * 60 })
  })
  it('descarga: la mitad de series se refleja en los pasos', () => {
    const normal = pasosDeSesion(plan('multipresa-resistencia', CASA)).filter((p) => p.tipo === 'colgado').length
    const pl = plan('multipresa-resistencia', CASA, descargar(FASES.fuerza))
    const ej = pl.bloques.flatMap((b) => b.ejercicios).find((e) => e.repeticiones !== undefined)!
    const colgados = pasosDeSesion(pl).filter((p) => p.tipo === 'colgado').length
    expect(colgados).toBe(ej.series! * ej.repeticiones!)
    expect(colgados).toBeLessThan(normal)
  })
  it('4x4: una vuelta manual por serie con 4 min entre vueltas', () => {
    const pl = plan('resistencia-4x4', ROCO)
    const ps = pasosDeSesion(pl).filter((p) => p.bloque === '4x4')
    expect(tipos(ps)).toEqual(['manual', 'descanso', 'manual', 'descanso', 'manual', 'descanso', 'manual'])
    expect(ps[0]).toMatchObject({ titulo: 'Vuelta 1 de 4' })
    expect(ps[1]).toMatchObject({ segundos: 240 })
  })
  it('ARC y hombro: un paso bloque por bloque, con sus minutos y su detalle', () => {
    for (const [tipo, ctx] of [['arc', ROCO], ['hombro', CASA]] as const) {
      const pl = plan(tipo, ctx)
      const ps = pasosDeSesion(pl)
      expect(tipos(ps).every((t) => t === 'bloque')).toBe(true)
      expect(ps.map((p) => segundosDe(p))).toEqual(pl.bloques.map((b) => b.minutos * 60))
      expect(ps[0]).toMatchObject({ titulo: pl.bloques[0]!.nombre })
      if (ps[0]!.tipo === 'bloque') expect(ps[0]!.detalle[0]).toContain(pl.bloques[0]!.ejercicios[0]!.nombre)
    }
  })
  it('test de dedos: 3 intentos de 10 s con 3 min entre ellos y el 7:3 hasta el fallo', () => {
    const ps = pasosDeSesion(plan('evaluacion-dedos', CASA))
    expect(tipos(ps)).toEqual([
      'bloque', 'bloque',
      'preparate', 'colgado', 'descanso', 'colgado', 'descanso', 'colgado',
      'bloque',
      'preparate', 'fallo',
    ])
    expect(ps[3]).toMatchObject({ segundos: 10, titulo: 'Intento 1 de 3' })
    expect(ps[4]).toMatchObject({ segundos: 180 })
    expect(ps[10]).toMatchObject({ tipo: 'fallo', trabajoS: 7, descansoS: 3 })
  })
  it('los segundos con tiempo de cada bloque no superan sus minutos', () => {
    const casos: [TipoSesion, Contexto][] = [
      ['multipresa-resistencia', CASA], ['multipresa-resistencia-fuerza', CASA], ['resistencia-4x4', ROCO],
      ['arc', ROCO], ['hombro', CASA], ['evaluacion-dedos', CASA],
    ]
    for (const [tipo, ctx] of casos) {
      const pl = plan(tipo, ctx)
      const ps = pasosDeSesion(pl)
      for (const b of pl.bloques) {
        const s = ps.filter((p) => p.bloque === b.nombre).reduce((a, p) => a + (segundosDe(p) ?? 0), 0)
        expect(s, `${tipo} · ${b.nombre}`).toBeLessThanOrEqual(b.minutos * 60)
      }
    }
  })
})
