import { describe, expect, it } from 'vitest'
import { restriccionesDe } from './autorregulacion'
import { motivosNoEncaja } from './propuesta'
import { esCargaAlta } from './seguridad'
import { TIPOS_SESION, type Sesion, type TipoSesion } from './tipos'
import type { EstadoAtleta, Semaforo, Zona } from './autorregulacion-tipos'

const zonas = (z: Partial<Record<Zona, Semaforo>> = {}): Record<Zona, Semaforo> =>
  ({ dedos: 'verde', muneca: 'verde', codo: 'verde', hombro: 'verde', otra: 'verde', ...z })
const estado = (z: Partial<Record<Zona, Semaforo>> = {}, chequeoBajoHoy = false): EstadoAtleta =>
  ({ zonas: zonas(z), chequeoBajoHoy } as unknown as EstadoAtleta)
const sesion = (tipo: TipoSesion, extra: Partial<Sesion> = {}): Sesion =>
  ({ id: 'x', tipo, intensidad: 'alta', fecha: '2026-11-05', horaInicio: 19, duracionMin: 60, ...extra })

describe('motivosNoEncaja', () => {
  it('en verde y sin chequeo bajo, todo encaja', () => {
    for (const t of TIPOS_SESION) expect(motivosNoEncaja(sesion(t), estado()), t).toEqual([])
  })
  it('chequeo bajo: la carga alta no encaja', () => {
    expect(motivosNoEncaja(sesion('bloque-limite'), estado({}, true))).toEqual(['Tu chequeo de hoy es bajo: hoy nada de carga alta.'])
    expect(motivosNoEncaja(sesion('tecnica', { intensidad: 'suave' }), estado({}, true))).toEqual([])
  })
  it('una zona de carga en ámbar: sin carga alta', () => {
    expect(motivosNoEncaja(sesion('multipresa-maxima'), estado({ dedos: 'ambar' }))).toEqual(['Tienes una zona de carga en ámbar: hoy nada de carga alta.'])
  })
  it('hombro u otra zona en rojo: solo descanso', () => {
    expect(motivosNoEncaja(sesion('tecnica', { intensidad: 'suave' }), estado({ hombro: 'rojo' }))).toEqual(['Tienes el hombro u otra zona en rojo: hoy toca descansar.'])
  })
  it('dedos en rojo: solo hombro', () => {
    expect(motivosNoEncaja(sesion('arc', { intensidad: 'suave' }), estado({ dedos: 'rojo' }))).toEqual(['Tienes dedos, muñeca o codo en rojo: hoy solo trabajo de hombro.'])
    expect(motivosNoEncaja(sesion('hombro', { intensidad: 'suave' }), estado({ dedos: 'rojo' }))).not.toContain('Tienes dedos, muñeca o codo en rojo: hoy solo trabajo de hombro.')
  })
  it('«otra zona» en ámbar: nada al límite', () => {
    expect(motivosNoEncaja(sesion('via-cuerda-limite'), estado({ otra: 'ambar' }))).toContain('Tienes «otra zona» en ámbar: hoy nada al límite.')
  })
  it('dominadas incluidas cuando hoy no tocan', () => {
    expect(motivosNoEncaja(sesion('tecnica', { intensidad: 'suave', incluye: ['dominadas'] }), estado({ dedos: 'ambar' })))
      .toContain('Hoy no tocan dominadas: sáltate ese complemento.')
  })
  it('coherente con bloqueadaPorEstado: si el entrenador la bloquearía, hay motivos', () => {
    const AL_LIMITE: TipoSesion[] = ['bloque-limite', 'via-cuerda-limite', 'pegues-proyecto', 'board']
    const ZONAS: Zona[] = ['dedos', 'muneca', 'codo', 'hombro', 'otra']
    const estados: EstadoAtleta[] = [estado(), estado({}, true)]
    for (const z of ZONAS) for (const sem of ['ambar', 'rojo'] as const) estados.push(estado({ [z]: sem }))
    for (const e of estados) {
      const r = restriccionesDe(e)
      for (const t of TIPOS_SESION) for (const intensidad of ['suave', 'alta'] as const) {
        const s = sesion(t, { intensidad })
        const bloquea = r.soloDescanso || (r.soloHombro && t !== 'hombro') || (r.sinCargaAlta && esCargaAlta(s)) || (r.sinLimite && AL_LIMITE.includes(t))
        if (bloquea) expect(motivosNoEncaja(s, e), `${t}/${intensidad}`).not.toEqual([])
      }
    }
  })
})
