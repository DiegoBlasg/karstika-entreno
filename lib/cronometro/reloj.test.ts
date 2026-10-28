import { describe, expect, it } from 'vitest'
import type { Paso } from './pasos'
import {
  atras, empezar, ESTADO_INICIAL, faseFallo, leerGuardado, minutosReales, noPuedoMas, pausar, reabrir, restanteS, siguiente,
  terminar, tick, transcurridoMs,
} from './reloj'

const B = { bloque: 'b' }
const PASOS: Paso[] = [
  { ...B, tipo: 'preparate', segundos: 10, titulo: 'p' },
  { ...B, tipo: 'colgado', segundos: 7, titulo: 'c' },
  { ...B, tipo: 'descanso', segundos: 3, titulo: 'd' },
  { ...B, tipo: 'manual', titulo: 'm' },
  { ...B, tipo: 'fallo', trabajoS: 7, descansoS: 3, titulo: 'f' },
]
const T0 = 1_000_000

describe('reloj', () => {
  it('avanza solo al llegar a cero y conserva el sobrante', () => {
    let e = empezar(ESTADO_INICIAL, T0)
    e = tick(PASOS, e, T0 + 9_999)
    expect(e.indice).toBe(0)
    expect(restanteS(PASOS, e, T0 + 9_999)).toBe(1)
    e = tick(PASOS, e, T0 + 10_500)
    expect(e.indice).toBe(1)
    expect(transcurridoMs(e, T0 + 10_500)).toBe(500)
  })
  it('tras un salto de tiempo avanza varios pasos de golpe y se para en el manual', () => {
    const e = tick(PASOS, empezar(ESTADO_INICIAL, T0), T0 + 60_000)
    expect(e.indice).toBe(3)
    expect(e.totalMs).toBe(20_000)
    expect(transcurridoMs(e, T0 + 60_000)).toBe(40_000) // el manual lleva corriendo desde que llegó
  })
  it('la pausa no cuenta', () => {
    let e = empezar(ESTADO_INICIAL, T0)
    e = pausar(e, T0 + 4_000)
    e = tick(PASOS, e, T0 + 100_000)
    expect(e.indice).toBe(0)
    e = empezar(e, T0 + 100_000)
    expect(restanteS(PASOS, e, T0 + 101_000)).toBe(5)
  })
  it('saltar, hecho y atrás', () => {
    let e = empezar(ESTADO_INICIAL, T0)
    e = siguiente(PASOS, e, T0 + 2_000)
    expect(e.indice).toBe(1)
    expect(e.totalMs).toBe(2_000)
    e = atras(e, T0 + 3_000)
    expect(e.indice).toBe(0)
    expect(transcurridoMs(e, T0 + 3_000)).toBe(0)
    expect(e.totalMs).toBe(3_000) // el tiempo vivido cuenta
    expect(atras(e, T0 + 3_500).indice).toBe(0)
  })
  it('fallo: alterna colgado y descanso y guarda los segundos colgado al pulsar «No puedo más»', () => {
    expect(faseFallo({ trabajoS: 7, descansoS: 3 }, 0)).toEqual({ fase: 'colgado', restanteS: 7, colgadoS: 0 })
    expect(faseFallo({ trabajoS: 7, descansoS: 3 }, 8_000)).toEqual({ fase: 'descanso', restanteS: 2, colgadoS: 7 })
    expect(faseFallo({ trabajoS: 7, descansoS: 3 }, 24_500)).toEqual({ fase: 'colgado', restanteS: 3, colgadoS: 18 })
    let e = { ...empezar(ESTADO_INICIAL, T0), indice: 4 }
    e = tick(PASOS, e, T0 + 500_000)
    expect(e.indice).toBe(4) // el fallo no termina solo
    e = noPuedoMas(PASOS, e, T0 + 24_500)
    expect(e.colgadoFalloS).toBe(18)
    expect(e.terminado).toBe(true)
  })
  it('terminar y minutos reales (redondeo hacia arriba, mínimo 1)', () => {
    let e = empezar(ESTADO_INICIAL, T0)
    expect(minutosReales(terminar(e, T0 + 5_000), T0 + 5_000)).toBe(1)
    e = terminar(tick(PASOS, e, T0 + 61_000), T0 + 61_000)
    expect(e.terminado).toBe(true)
    expect(e.enMarcha).toBe(false)
    expect(minutosReales(e, T0 + 999_999)).toBe(2)
  })
  it('lo guardado se recupera en pausa y lo que no vale se descarta', () => {
    const e = tick(PASOS, empezar(ESTADO_INICIAL, T0), T0 + 12_000)
    const guardado = JSON.parse(JSON.stringify(pausar(e, T0 + 12_000)))
    const r = leerGuardado(guardado, PASOS.length)!
    expect(r).toMatchObject({ indice: 1, enMarcha: false, desdeMs: null, acumuladoMs: 2_000, totalMs: 10_000 })
    expect(leerGuardado(null, PASOS.length)).toBeNull()
    expect(leerGuardado({ ...guardado, indice: 99 }, PASOS.length)).toBeNull()
    expect(leerGuardado({ ...guardado, totalMs: 'x' }, PASOS.length)).toBeNull()
    expect(leerGuardado({ ...guardado, enMarcha: true, desdeMs: T0 }, PASOS.length)).toMatchObject({ enMarcha: false, desdeMs: null })
  })
  it('lo guardado al final sin terminar se descarta; terminado a mitad vale', () => {
    const base = { indice: PASOS.length, enMarcha: false, desdeMs: null, acumuladoMs: 0, totalMs: 1_000, colgadoFalloS: null }
    expect(leerGuardado({ ...base, terminado: false }, PASOS.length)).toBeNull()
    expect(leerGuardado({ ...base, terminado: true }, PASOS.length)).toMatchObject({ terminado: true })
    expect(leerGuardado({ ...base, indice: 2, terminado: true }, PASOS.length)).toMatchObject({ indice: 2, terminado: true })
  })
  it('reabrir tras llegar al final por tiempo vuelve al último paso en pausa y conserva el tiempo', () => {
    const cortos: Paso[] = [PASOS[0]!, PASOS[1]!]
    const e = tick(cortos, empezar(ESTADO_INICIAL, T0), T0 + 30_000)
    expect(e).toMatchObject({ terminado: true, indice: 2, totalMs: 17_000 })
    expect(reabrir(cortos, e)).toEqual({
      indice: 1, enMarcha: false, desdeMs: null, acumuladoMs: 0, totalMs: 17_000, colgadoFalloS: null, terminado: false,
    })
  })
  it('reabrir tras «Terminar» a mitad vuelve a ese paso', () => {
    const e = terminar(siguiente(PASOS, empezar(ESTADO_INICIAL, T0), T0 + 2_000), T0 + 5_000)
    const r = reabrir(PASOS, e)
    expect(r).toMatchObject({ indice: 1, terminado: false, enMarcha: false, desdeMs: null, acumuladoMs: 0, totalMs: 5_000 })
  })
  it('reabrir en un fallo borra los segundos colgado (se vuelven a medir); fuera de un fallo los conserva', () => {
    const e = noPuedoMas(PASOS, { ...empezar(ESTADO_INICIAL, T0), indice: 4 }, T0 + 24_500)
    expect(e.colgadoFalloS).toBe(18)
    expect(reabrir(PASOS, e)).toMatchObject({ indice: 4, colgadoFalloS: null, terminado: false })
    const m = terminar({ ...empezar(ESTADO_INICIAL, T0), indice: 3, colgadoFalloS: 9 }, T0 + 1_000)
    expect(reabrir(PASOS, m)).toMatchObject({ indice: 3, colgadoFalloS: 9 })
  })
  it('reabrir no hace nada si no está terminado', () => {
    const e = empezar(ESTADO_INICIAL, T0)
    expect(reabrir(PASOS, e)).toBe(e)
  })
})
