import { describe, expect, it } from 'vitest'
import { crearLimitador } from './limite'

describe('limitador de intentos', () => {
  it('bloquea un minuto tras 5 fallos seguidos y se reinicia con un acierto', () => {
    const l = crearLimitador(5, 60_000)
    for (let i = 0; i < 4; i++) l.fallo('ip', 1_000)
    expect(l.bloqueado('ip', 1_000)).toBe(false)
    l.fallo('ip', 2_000)
    expect(l.bloqueado('ip', 2_000)).toBe(true)
    expect(l.bloqueado('otra', 2_000)).toBe(false)
    expect(l.bloqueado('ip', 62_001)).toBe(false)
    l.exito('ip')
    expect(l.bloqueado('ip', 2_000)).toBe(false)
  })
  it('los fallos antiguos caducan', () => {
    const l = crearLimitador(5, 60_000)
    for (let i = 0; i < 4; i++) l.fallo('ip', 0)
    l.fallo('ip', 70_000)
    expect(l.bloqueado('ip', 70_000)).toBe(false)
  })
})
