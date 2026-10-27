import { describe, expect, it } from 'vitest'
import { crearLimitador } from './limite'

describe('limitador de intentos', () => {
  it('deja 5 intentos por minuto y se reinicia con un acierto', () => {
    const l = crearLimitador(5, 60_000)
    for (let i = 0; i < 5; i++) expect(l.intentar('ip', 1_000)).toBe(true)
    expect(l.intentar('ip', 2_000)).toBe(false)
    expect(l.intentar('otra', 2_000)).toBe(true)
    expect(l.intentar('ip', 61_001)).toBe(true) // un minuto después del último intento contado
    l.exito('ip')
    for (let i = 0; i < 5; i++) expect(l.intentar('ip', 61_002)).toBe(true)
  })
  it('los intentos antiguos caducan', () => {
    const l = crearLimitador(5, 60_000)
    for (let i = 0; i < 4; i++) l.intentar('ip', 0)
    expect(l.intentar('ip', 70_000)).toBe(true)
    for (let i = 0; i < 4; i++) expect(l.intentar('ip', 70_000)).toBe(true)
    expect(l.intentar('ip', 70_000)).toBe(false)
  })
  it('los intentos en paralelo no superan el límite', async () => {
    const l = crearLimitador(5, 60_000)
    // El mismo orden que la acción entrar: reservar el intento y, después, comprobar la contraseña (asíncrono).
    const comprobarClave = (): Promise<boolean> => new Promise((r) => setTimeout(() => r(false), 5))
    const flujo = async (): Promise<'bloqueado' | 'incorrecta' | 'correcta'> => {
      if (!l.intentar('ip', 1_000)) return 'bloqueado'
      if (!(await comprobarClave())) return 'incorrecta'
      l.exito('ip')
      return 'correcta'
    }
    const resultados = await Promise.all(Array.from({ length: 200 }, flujo))
    expect(resultados.filter((r) => r === 'incorrecta')).toHaveLength(5)
    expect(resultados.filter((r) => r === 'bloqueado')).toHaveLength(195)
  })
})
