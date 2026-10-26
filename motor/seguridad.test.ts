import { describe, expect, it } from 'vitest'
import { perfilExperto, perfilNovel, ses } from './_fabrica'
import { esIntensaDedos, validarSesion } from './seguridad'

const reglas = (v: { regla: string }[]) => v.map((x) => x.regla)

describe('esIntensaDedos', () => {
  it('requiere intensidad alta y un tipo que cargue los dedos', () => {
    expect(esIntensaDedos(ses('a', '2026-10-26', 18))).toBe(true)
    expect(esIntensaDedos(ses('a', '2026-10-26', 18, { intensidad: 'suave' }))).toBe(false)
    expect(esIntensaDedos(ses('a', '2026-10-26', 18, { tipo: 'resistencia-4x4' }))).toBe(false)
    expect(esIntensaDedos(ses('a', '2026-10-26', 18, { tipo: 'via-autoasegurada' }))).toBe(true)
  })
})

describe('seguridad.dedos-48h', () => {
  // Lunes 18:00 + 90 min termina a las 19:30.
  const lunes = ses('lunes', '2026-10-26', 18)

  it('exactamente 48 h entre el fin y el inicio pasa', () => {
    expect(validarSesion(ses('miercoles', '2026-10-28', 19.5), [lunes], perfilExperto)).toEqual([])
  })
  it('47,9 h viola', () => {
    const v = validarSesion(ses('miercoles', '2026-10-28', 19.4), [lunes], perfilExperto)
    expect(reglas(v)).toEqual(['seguridad.dedos-48h'])
    expect(v[0]!.sesionIds).toEqual(['lunes', 'miercoles'])
    expect(v[0]!.explicacion.parametros).toEqual(['P-14', 'P-15'])
    expect(v[0]!.explicacion.origen).toBe('diseno')
  })
  it('vale también cuando la sesión del historial es posterior a la propuesta', () => {
    const futura = ses('futura', '2026-10-28', 19.4)
    expect(reglas(validarSesion(lunes, [futura], perfilExperto))).toEqual(['seguridad.dedos-48h'])
    expect(validarSesion(lunes, [ses('futura', '2026-10-28', 19.5)], perfilExperto)).toEqual([])
  })
  it('cruza el fin de mes', () => {
    const sabado = ses('sabado', '2026-10-31', 20) // termina 21:30
    expect(validarSesion(ses('lunes2', '2026-11-02', 21.5), [sabado], perfilExperto)).toEqual([])
    expect(reglas(validarSesion(ses('lunes2', '2026-11-02', 21), [sabado], perfilExperto))).toEqual(['seguridad.dedos-48h'])
  })
  it('sesiones solapadas violan', () => {
    expect(reglas(validarSesion(ses('b', '2026-10-26', 19), [lunes], perfilExperto))).toEqual(['seguridad.dedos-48h'])
  })
  it('una sesión suave o de un tipo que no carga los dedos no cuenta', () => {
    const manana = ses('manana', '2026-10-27', 18, { intensidad: 'suave' })
    expect(validarSesion(manana, [lunes], perfilExperto)).toEqual([])
    const cuatro = ses('cuatro', '2026-10-27', 18, { tipo: 'resistencia-4x4' })
    expect(validarSesion(cuatro, [lunes], perfilExperto)).toEqual([])
    expect(validarSesion(ses('b', '2026-10-27', 18), [ses('suave', '2026-10-26', 18, { intensidad: 'suave' })], perfilExperto)).toEqual([])
  })
  it('una violación por cada sesión del historial en conflicto, ordenadas', () => {
    const v = validarSesion(
      ses('m', '2026-10-27', 18),
      [ses('z', '2026-10-26', 8), ses('a', '2026-10-28', 8)],
      perfilExperto,
    )
    expect(v.filter((x) => x.regla === 'seguridad.dedos-48h').map((x) => x.sesionIds)).toEqual([['a', 'm'], ['m', 'z']])
  })
})

describe('seguridad.carga-alta-seguida', () => {
  const alta = (id: string, fecha: string) => ses(id, fecha, 8, { tipo: 'resistencia-4x4' })

  it('dos días seguidos pasan y el tercero viola', () => {
    expect(validarSesion(alta('b', '2026-10-27'), [alta('a', '2026-10-26')], perfilExperto)).toEqual([])
    const v = validarSesion(alta('c', '2026-10-28'), [alta('a', '2026-10-26'), alta('b', '2026-10-27')], perfilExperto)
    expect(reglas(v)).toEqual(['seguridad.carga-alta-seguida'])
    expect(v[0]!.sesionIds).toEqual(['a', 'b', 'c'])
    expect(v[0]!.explicacion.parametros).toEqual(['P-16'])
  })
  it('un hueco de un día rompe la racha', () => {
    expect(validarSesion(alta('d', '2026-10-29'), [alta('a', '2026-10-26'), alta('b', '2026-10-27')], perfilExperto)).toEqual([])
  })
  it('la propuesta puede unir dos tramos del historial', () => {
    const v = validarSesion(alta('b', '2026-10-27'), [alta('a', '2026-10-26'), alta('c', '2026-10-28')], perfilExperto)
    expect(reglas(v)).toEqual(['seguridad.carga-alta-seguida'])
  })
  it('cruza el fin de semana y el fin de mes', () => {
    expect(reglas(validarSesion(alta('c', '2026-11-01'), [alta('a', '2026-10-30'), alta('b', '2026-10-31')], perfilExperto))).toEqual(['seguridad.carga-alta-seguida'])
    expect(reglas(validarSesion(alta('c', '2026-12-31'), [alta('a', '2026-12-29'), alta('b', '2026-12-30')], perfilExperto))).toEqual(['seguridad.carga-alta-seguida'])
  })
  it('dos sesiones altas el mismo día cuentan como un día', () => {
    const v = validarSesion(alta('c', '2026-10-27'), [alta('a', '2026-10-26'), ses('b', '2026-10-27', 20, { tipo: 'resistencia-4x4' })], perfilExperto)
    expect(v).toEqual([])
  })
  it('una propuesta suave nunca viola esta regla', () => {
    const suave = ses('c', '2026-10-28', 8, { intensidad: 'suave' })
    expect(validarSesion(suave, [alta('a', '2026-10-26'), alta('b', '2026-10-27')], perfilExperto)).toEqual([])
  })
  it('se aplica igual con perfil novel', () => {
    const v = validarSesion(alta('c', '2026-10-28'), [alta('a', '2026-10-26'), alta('b', '2026-10-27')], perfilNovel)
    expect(reglas(v)).toEqual(['seguridad.carga-alta-seguida'])
  })
})

describe('validarSesion: entrada', () => {
  it('lanza si el id de la propuesta ya está en el historial', () => {
    expect(() => validarSesion(ses('a', '2026-10-27', 18), [ses('a', '2026-10-26', 18)], perfilExperto)).toThrow(/duplicado/)
  })
  it('lanza con horas inválidas', () => {
    expect(() => validarSesion(ses('a', '2026-10-27', 24), [], perfilExperto)).toThrow(/horaInicio/)
  })
  it('sin historial no hay violaciones temporales', () => {
    expect(validarSesion(ses('a', '2026-10-27', 18), [], perfilExperto)).toEqual([])
  })
})

describe('validarSesion: perfil', () => {
  const s = ses('a', '2026-10-27', 18)
  it('acepta un perfil válido (incluidos 0 años)', () => {
    expect(() => validarSesion(s, [], perfilExperto)).not.toThrow()
    expect(() => validarSesion(s, [], { ...perfilExperto, anosEscalando: 0 })).not.toThrow()
  })
  it('lanza con anosEscalando NaN, negativo o infinito', () => {
    for (const anosEscalando of [Number.NaN, -1, Infinity, -Infinity]) {
      expect(() => validarSesion(s, [], { ...perfilExperto, anosEscalando })).toThrow(/anosEscalando/)
    }
  })
  it('lanza con pesoKg 0, negativo, NaN o infinito', () => {
    for (const pesoKg of [0, -5, Number.NaN, Infinity]) {
      expect(() => validarSesion(s, [], { ...perfilExperto, pesoKg })).toThrow(/pesoKg/)
    }
  })
})
