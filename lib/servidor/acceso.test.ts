import { describe, expect, it } from 'vitest'
import { claveCorrecta, DURACION_SESION_S, firmarSesion, sesionValida } from './acceso'

const S = 'secreto-de-pruebas-de-al-menos-32-caracteres'

describe('cookie de sesión', () => {
  it('una cookie recién firmada vale hasta que caduca', async () => {
    const v = await firmarSesion(S, 1_000)
    expect(await sesionValida(v, S, 1_001)).toBe(true)
    expect(await sesionValida(v, S, 1_000 + DURACION_SESION_S)).toBe(false)
  })
  it('no vale manipulada, con otro secreto, vacía o mal formada', async () => {
    const v = await firmarSesion(S, 1_000)
    const [, firma] = v.split('.')
    expect(await sesionValida(`99999999999.${firma}`, S, 1_001)).toBe(false)
    expect(await sesionValida(v, `${S}-otro`, 1_001)).toBe(false)
    expect(await sesionValida(undefined, S, 1_001)).toBe(false)
    expect(await sesionValida('basura', S, 1_001)).toBe(false)
    expect(await sesionValida(`${v}.extra`, S, 1_001)).toBe(false)
  })
  it('exige un secreto largo', async () => {
    await expect(firmarSesion('corto', 1_000)).rejects.toThrow('SECRETO_SESION debe tener al menos 32 caracteres')
  })
})

describe('claveCorrecta', () => {
  it('compara la contraseña', async () => {
    expect(await claveCorrecta('pegue-largo', 'pegue-largo')).toBe(true)
    expect(await claveCorrecta('pegue-larg', 'pegue-largo')).toBe(false)
    expect(await claveCorrecta('', '')).toBe(false)
  })
})
