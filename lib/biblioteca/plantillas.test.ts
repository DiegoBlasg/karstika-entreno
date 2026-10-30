// Las plantillas del motor enlazan a la biblioteca por id. El motor no conoce la biblioteca, así que la comprobación
// de que cada `ficha` existe vive aquí.
import { describe, expect, it } from 'vitest'
import { FASE_BASE, TIPOS_COMPLEMENTO, construirComplemento, construirSesion, descargar, TIPOS_CON_PLANTILLA } from '../../motor'
import type { Bloque, EstadoAtleta, Peticion, Sesion } from '../../motor'
import { FICHAS, fichaDe } from './fichas'

const evaluacion = { fecha: '2026-10-20', pesoCorporalKg: 70, lastreKg: 30 }
const estado = (z: Partial<EstadoAtleta['zonas']>): EstadoAtleta =>
  ({ zonas: { dedos: 'verde', muneca: 'verde', codo: 'verde', hombro: 'verde', otra: 'verde', ...z }, chequeoBajoHoy: false }) as unknown as EstadoAtleta
const hombroPrevio: Sesion = { id: 'h1', tipo: 'hombro', intensidad: 'suave', fecha: '2026-10-20', horaInicio: 9, duracionMin: 20 }
// Con 4 multipresas previas, la multipresa pasa a 2 bloques (y aparece la pausa entre ellos).
const multipresas: Sesion[] = [1, 4, 7, 10].map((d, i) => ({
  id: `m${i}`, tipo: 'multipresa-resistencia', intensidad: 'alta', fecha: `2026-09-${String(d).padStart(2, '0')}`, horaInicio: 18, duracionMin: 30,
}))

function peticiones(): Peticion[] {
  const out: Peticion[] = []
  for (const lugar of ['rocodromo', 'roca', 'casa'] as const) {
    for (const compania of ['solo', 'con-gente'] as const) {
      for (const minutosDisponibles of [30, 45, 60, 120]) {
        for (const fase of [FASE_BASE, descargar(FASE_BASE)]) {
          for (const extra of [{}, { evaluacion }, { evaluacion, historial: multipresas }, { historial: [hombroPrevio] }, { estado: estado({ hombro: 'ambar' }) }, { estado: estado({ dedos: 'rojo' }) }]) {
            out.push({
              fecha: '2026-10-27', horaInicio: 19, perfil: { pesoKg: 70, anosEscalando: 1.5, lesiones: [] }, historial: [], fase,
              contexto: { compania, lugar, minutosDisponibles }, ...extra,
            })
          }
        }
      }
    }
  }
  return out
}

function bloquesDeTodo(): Bloque[] {
  const bloques: Bloque[] = []
  for (const p of peticiones()) {
    for (const t of TIPOS_CON_PLANTILLA) bloques.push(...(construirSesion(t, p)?.bloques ?? []))
    for (const t of TIPOS_COMPLEMENTO) {
      const b = construirComplemento(t, p, 60)
      if (b) bloques.push(b)
    }
  }
  return bloques
}

describe('fichas usadas por las plantillas', () => {
  const ejercicios = bloquesDeTodo().flatMap((b) => b.ejercicios.map((e) => ({ bloque: b.nombre, ...e })))

  it('se han recorrido muchos ejercicios', () => {
    expect(ejercicios.length).toBeGreaterThan(1000)
  })
  it('toda ficha usada existe en FICHAS', () => {
    const faltan = [...new Set(ejercicios.filter((e) => e.ficha !== undefined && !fichaDe(e.ficha)).map((e) => e.ficha))]
    expect(faltan).toEqual([])
  })
  it('solo quedan sin ficha los descansos y el board', () => {
    const sinFicha = [...new Set(ejercicios.filter((e) => e.ficha === undefined).map((e) => e.nombre))].sort()
    expect(sinFicha).toEqual([
      '5 bloques en board, uno o dos grados por debajo de tu límite',
      'Descanso activo suave, sin colgarte',
      'Descanso suave, hidrátate',
      'Descanso suave, sin colgarte',
    ])
  })
  it('todas las suspensiones en regleta enlazan a una ficha de suspensiones', () => {
    const suspensiones = new Set(['repeaters-7-3', 'resistencia-fuerza-10-5', 'suspension-maxima-10s', 'test-7-3-fallo'])
    for (const e of ejercicios.filter((x) => /regleta|Suspensi/.test(x.nombre))) expect(suspensiones, e.nombre).toContain(e.ficha)
  })
  it('la sesión y el complemento de hombro enlazan solo a fichas de hombro y antagonistas o de movilidad', () => {
    const permitidas = new Set([
      'movilidad', 'retracciones-escapulares', 'flexiones', 'rotacion-externa-banda', 'ytw-banda', 'face-pull-banda', 'extensores-dedos-banda',
      'plancha-toques-hombro',
    ])
    const deHombro = bloquesDeTodo().filter((b) => /hombro|Movilidad y activación|Movilidad sin carga|Antagonistas/i.test(b.nombre))
    expect(deHombro.length).toBeGreaterThan(0)
    for (const b of deHombro) for (const e of b.ejercicios) expect(permitidas, `${b.nombre}: ${e.nombre}`).toContain(e.ficha)
    for (const id of permitidas) expect(FICHAS).toHaveProperty(id)
  })
})
