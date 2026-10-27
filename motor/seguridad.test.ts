import { describe, expect, it } from 'vitest'
import { BASE_OCTUBRE, perfilExperto, perfilNovel, ses } from './_fabrica'
import { esIntensaDedos, validarSesion } from './seguridad'
import type { Perfil, Sesion } from './tipos'

const reglas = (v: { regla: string }[]) => v.map((x) => x.regla)

describe('esIntensaDedos', () => {
  it('requiere intensidad alta y un tipo que cargue los dedos', () => {
    expect(esIntensaDedos(ses('a', '2026-10-26', 18))).toBe(true)
    expect(esIntensaDedos(ses('a', '2026-10-26', 18, { intensidad: 'suave' }))).toBe(false)
    expect(esIntensaDedos(ses('a', '2026-10-26', 18, { tipo: 'resistencia-4x4' }))).toBe(false)
    expect(esIntensaDedos(ses('a', '2026-10-26', 18, { tipo: 'via-autoasegurada' }))).toBe(true)
  })
})

describe('esIntensaDedos: tipos que cuentan siempre', () => {
  it('multipresa y campus cuentan aunque la etiqueta sea suave', () => {
    for (const tipo of ['multipresa-resistencia', 'multipresa-maxima', 'campus'] as const) {
      expect(esIntensaDedos(ses('a', '2026-10-26', 18, { tipo, intensidad: 'suave' })), tipo).toBe(true)
    }
  })
  it('board suave sigue sin contar', () => {
    expect(esIntensaDedos(ses('a', '2026-10-26', 18, { tipo: 'board', intensidad: 'suave' }))).toBe(false)
  })
})

describe('seguridad.dedos-dia-descanso', () => {
  it('una multipresa de resistencia etiquetada suave el día después de un board alto viola', () => {
    const board = ses('board', '2026-10-26', 18, { tipo: 'board' })
    const mp = ses('mp', '2026-10-27', 18, { tipo: 'multipresa-resistencia', intensidad: 'suave', detalle: { regletaMm: 20 } })
    expect(reglas(validarSesion(mp, [board], perfilExperto))).toEqual(['seguridad.dedos-dia-descanso'])
  })
  it('multipresa máxima suave el día después de un board viola con 3 años', () => {
    const board = ses('board', '2026-10-26', 18, { tipo: 'board' })
    const mp = ses('mp', '2026-10-27', 19.5, { tipo: 'multipresa-maxima', intensidad: 'suave' })
    const perfil3 = { ...perfilExperto, anosEscalando: 3 }
    expect(reglas(validarSesion(mp, [board], perfil3))).toEqual(['seguridad.dedos-dia-descanso'])
  })
  it('el campus suave el día después de un board alto viola', () => {
    const board = ses('board', '2026-10-26', 18, { tipo: 'board' })
    const c = ses('c', '2026-10-27', 18, { tipo: 'campus', intensidad: 'suave' })
    expect(reglas(validarSesion(c, [board], perfilExperto))).toEqual(['seguridad.dedos-dia-descanso'])
  })
  const lunes = ses('lunes', '2026-10-26', 18)

  it('con un día completo de por medio pasa a cualquier hora (lunes 18:00 → miércoles 08:00)', () => {
    expect(validarSesion(ses('miercoles', '2026-10-28', 8), [lunes], perfilExperto)).toEqual([])
    expect(validarSesion(ses('miercoles', '2026-10-28', 23.5), [lunes], perfilExperto)).toEqual([])
  })
  it('el día siguiente viola, aunque pasen más de 24 h', () => {
    const v = validarSesion(ses('martes', '2026-10-27', 23.5), [lunes], perfilExperto)
    expect(reglas(v)).toEqual(['seguridad.dedos-dia-descanso'])
    expect(v[0]!.sesionIds).toEqual(['lunes', 'martes'])
    expect(v[0]!.explicacion.parametros).toEqual(['P-14', 'P-15'])
    expect(v[0]!.explicacion.origen).toBe('diseno')
    expect(v[0]!.mensaje).toMatch(/días seguidos/)
  })
  it('dos sesiones intensas el mismo día violan, aunque no se solapen', () => {
    const v = validarSesion(ses('tarde', '2026-10-26', 21), [ses('manana', '2026-10-26', 8)], perfilExperto)
    // P-68 también salta: son dos sesiones de carga alta el mismo día.
    expect(reglas(v)).toEqual(['seguridad.carga-alta-mismo-dia', 'seguridad.dedos-dia-descanso'])
    expect(v.find((x) => x.regla === 'seguridad.dedos-dia-descanso')!.mensaje).toMatch(/mismo día/)
  })
  it('vale también cuando la sesión del historial es posterior a la propuesta', () => {
    expect(reglas(validarSesion(lunes, [ses('martes', '2026-10-27', 8)], perfilExperto))).toEqual(['seguridad.dedos-dia-descanso'])
    expect(validarSesion(lunes, [ses('miercoles', '2026-10-28', 8)], perfilExperto)).toEqual([])
  })
  it('cruza el fin de mes y de año', () => {
    const sabado = ses('sabado', '2026-10-31', 20)
    expect(validarSesion(ses('lunes2', '2026-11-02', 8), [sabado], perfilExperto)).toEqual([])
    expect(reglas(validarSesion(ses('domingo', '2026-11-01', 8), [sabado], perfilExperto))).toEqual(['seguridad.dedos-dia-descanso'])
    expect(reglas(validarSesion(ses('ano', '2027-01-01', 8), [ses('noche', '2026-12-31', 20)], perfilExperto))).toEqual(['seguridad.dedos-dia-descanso'])
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
    expect(v.filter((x) => x.regla === 'seguridad.dedos-dia-descanso').map((x) => x.sesionIds)).toEqual([['a', 'm'], ['m', 'z']])
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
    // Sin racha de 3 días; solo salta P-68 (dos de carga alta el mismo día).
    expect(reglas(v)).toEqual(['seguridad.carga-alta-mismo-dia'])
  })
  it('una sesión solo cuenta en su día de inicio, aunque cruce la medianoche', () => {
    const noche = ses('noche', '2026-10-26', 23.5, { tipo: 'resistencia-4x4', duracionMin: 300 })
    // 26 (noche), 27 (propuesta), 28: racha de 3 días.
    const v = validarSesion(alta('b', '2026-10-27'), [noche, alta('c', '2026-10-28')], perfilExperto)
    expect(reglas(v)).toEqual(['seguridad.carga-alta-seguida'])
    expect(v[0]!.sesionIds).toEqual(['b', 'c', 'noche'])
    // La noche del 26 no cuenta como 27: con propuesta el 28 no hay racha.
    expect(validarSesion(alta('c', '2026-10-28'), [noche], perfilExperto)).toEqual([])
  })
  it('tres días seguidos de multipresa etiquetada suave cuentan como carga alta', () => {
    const mp = (id: string, fecha: string) =>
      ses(id, fecha, 8, { tipo: 'multipresa-resistencia', intensidad: 'suave', detalle: { regletaMm: 20 } })
    const v = validarSesion(mp('c', '2026-10-28'), [mp('a', '2026-10-26'), mp('b', '2026-10-27')], perfilExperto)
    expect(reglas(v)).toContain('seguridad.carga-alta-seguida')
    expect(v.find((x) => x.regla === 'seguridad.carga-alta-seguida')!.sesionIds).toEqual(['a', 'b', 'c'])
  })
  it('el campus suave en el historial cuenta como carga alta; el board suave no', () => {
    const alta = (id: string, fecha: string) => ses(id, fecha, 8, { tipo: 'resistencia-4x4' })
    const campus = ses('k', '2026-10-27', 8, { tipo: 'campus', intensidad: 'suave' })
    expect(reglas(validarSesion(alta('c', '2026-10-28'), [alta('a', '2026-10-26'), campus], perfilExperto))).toEqual(['seguridad.carga-alta-seguida'])
    const board = ses('k', '2026-10-27', 8, { tipo: 'board', intensidad: 'suave' })
    expect(validarSesion(alta('c', '2026-10-28'), [alta('a', '2026-10-26'), board], perfilExperto)).toEqual([])
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
  it('lanza con perfil, historial o propuesta ausentes', () => {
    const s = ses('a', '2026-10-27', 18)
    expect(() => validarSesion(s, [], null as never)).toThrow('validarSesion: perfil es obligatorio')
    expect(() => validarSesion(s, [], undefined as never)).toThrow('validarSesion: perfil es obligatorio')
    expect(() => validarSesion(s, undefined as never, perfilExperto)).toThrow('validarSesion: historial debe ser un array')
    expect(() => validarSesion(s, null as never, perfilExperto)).toThrow('validarSesion: historial debe ser un array')
    expect(() => validarSesion(s, {} as never, perfilExperto)).toThrow('validarSesion: historial debe ser un array')
    expect(() => validarSesion(null as never, [], perfilExperto)).toThrow('validarSesion: propuesta es obligatoria')
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

describe('seguridad.campus y seguridad.maxima-novel', () => {
  it('campus viola en perfil novel y pasa en experto', () => {
    const c = ses('c', '2026-10-27', 18, { tipo: 'campus' })
    const v = validarSesion(c, [], perfilNovel)
    expect(reglas(v)).toEqual(['seguridad.campus'])
    expect(v[0]!.explicacion.parametros).toEqual(['P-12', 'P-13'])
    expect(validarSesion(c, [], perfilExperto)).toEqual([])
  })
  it('el límite de años: 2 años ya no es novel, 1,99 sí', () => {
    const c = ses('c', '2026-10-27', 18, { tipo: 'campus' })
    expect(reglas(validarSesion(c, [], { ...perfilNovel, anosEscalando: 1.99 }))).toEqual(['seguridad.campus'])
    expect(validarSesion(c, [], { ...perfilNovel, anosEscalando: 2 })).toEqual([])
  })
  it('multipresa máxima viola en novel y pasa en experto', () => {
    const m = ses('m', '2026-10-27', 18, { tipo: 'multipresa-maxima', detalle: { regletaMm: 20 } })
    const v = validarSesion(m, [], perfilNovel)
    expect(reglas(v)).toEqual(['seguridad.maxima-novel'])
    expect(v[0]!.explicacion.parametros).toEqual(['P-01', 'P-12'])
    expect(validarSesion(m, [], perfilExperto)).toEqual([])
  })
})

describe('seguridad.multipresa-7dias', () => {
  // Las multipresas ahora cuentan siempre como intensas de dedos; aquí solo interesa la regla de 7 días,
  // así que se filtra por ella (dedos-dia-descanso y regleta tienen sus propias pruebas).
  const mp = (id: string, fecha: string) =>
    ses(id, fecha, 8, { tipo: 'multipresa-resistencia', intensidad: 'suave', detalle: { regletaMm: 20 } })
  const validar = (p: Sesion, h: Sesion[], perfil: Perfil) =>
    validarSesion(p, h, perfil).filter((x) => x.regla === 'seguridad.multipresa-7dias')

  it('dos multipresas en 7 días pasan y tres violan', () => {
    expect(validar(mp('c', '2026-10-31'), [mp('a', '2026-10-26')], perfilNovel)).toEqual([])
    const v = validar(mp('c', '2026-10-31'), [mp('a', '2026-10-26'), mp('b', '2026-10-28')], perfilNovel)
    expect(reglas(v)).toEqual(['seguridad.multipresa-7dias'])
    expect(v[0]!.sesionIds).toEqual(['a', 'b', 'c'])
    expect(v[0]!.explicacion.parametros).toEqual(['P-12'])
  })
  it('la tercera a 7 días de la primera no cae en la misma ventana', () => {
    expect(validar(mp('c', '2026-11-02'), [mp('a', '2026-10-26'), mp('b', '2026-10-28')], perfilNovel)).toEqual([])
  })
  it('cuenta también sesiones futuras ya confirmadas', () => {
    const v = validar(mp('b', '2026-10-28'), [mp('a', '2026-10-26'), mp('c', '2026-10-31')], perfilNovel)
    expect(reglas(v)).toEqual(['seguridad.multipresa-7dias'])
  })
  it('límite de la ventana: 7 días naturales inclusive violan y 8 pasan', () => {
    // 26 y 1-nov son 7 días naturales inclusive (26..1).
    const dentro = validar(mp('c', '2026-11-01'), [mp('a', '2026-10-26'), mp('b', '2026-10-28')], perfilNovel)
    expect(reglas(dentro)).toEqual(['seguridad.multipresa-7dias'])
    expect(validar(mp('c', '2026-11-02'), [mp('a', '2026-10-26'), mp('b', '2026-10-28')], perfilNovel)).toEqual([])
  })
  it('límite de la ventana con una sesión futura confirmada y la propuesta en medio', () => {
    const dentro = validar(mp('b', '2026-10-28'), [mp('a', '2026-10-26'), mp('c', '2026-11-01')], perfilNovel)
    expect(reglas(dentro)).toEqual(['seguridad.multipresa-7dias'])
    expect(validar(mp('b', '2026-10-28'), [mp('a', '2026-10-26'), mp('c', '2026-11-02')], perfilNovel)).toEqual([])
  })
  it('no se aplica a perfiles con experiencia ni a otros tipos', () => {
    expect(validar(mp('c', '2026-10-31'), [mp('a', '2026-10-26'), mp('b', '2026-10-28')], perfilExperto)).toEqual([])
    const otro = (id: string, fecha: string) => ses(id, fecha, 8, { tipo: 'tecnica', intensidad: 'suave' })
    expect(validar(otro('c', '2026-10-31'), [otro('a', '2026-10-26'), otro('b', '2026-10-28')], perfilNovel)).toEqual([])
  })
})

describe('seguridad.regleta', () => {
  const conRegleta = (mm: number, tipo: 'multipresa-resistencia' | 'tecnica' = 'multipresa-resistencia') =>
    ses('r', '2026-10-27', 18, { tipo, intensidad: 'suave', detalle: { regletaMm: mm } })

  it('19 mm viola y 20 mm pasa en novel', () => {
    const v = validarSesion(conRegleta(19), [], perfilNovel)
    expect(reglas(v)).toEqual(['seguridad.regleta'])
    expect(validarSesion(conRegleta(20), [], perfilNovel)).toEqual([])
  })
  it('NaN, 0, negativos e Infinity ya no llegan a la regla: la entrada inválida lanza', () => {
    for (const mm of [Number.NaN, 0, -5, Infinity]) {
      expect(() => validarSesion(conRegleta(mm), [], perfilNovel)).toThrow(/regletaMm/)
    }
  })
  it('un novel en multipresa sin regletaMm (detalle vacío o ausente) viola: hay que indicar el canto', () => {
    const vacio = ses('r', '2026-10-27', 18, { tipo: 'multipresa-resistencia', intensidad: 'suave', detalle: {} })
    const sinDetalle = ses('r', '2026-10-27', 18, { tipo: 'multipresa-maxima', intensidad: 'suave' })
    for (const s of [vacio, sinDetalle]) {
      const v = validarSesion(s, [], perfilNovel).filter((x) => x.regla === 'seguridad.regleta')
      expect(v.length).toBe(1)
      expect(v[0]!.mensaje).toMatch(/canto|profundidad/)
      expect(v[0]!.mensaje).toMatch(/indicar|especificar/)
    }
  })
  it('sin regletaMm no viola con experiencia ni fuera de la multipresa', () => {
    const vacio = ses('r', '2026-10-27', 18, { tipo: 'multipresa-resistencia', intensidad: 'suave', detalle: {} })
    expect(validarSesion(vacio, [], perfilExperto)).toEqual([])
    expect(validarSesion(ses('r', '2026-10-27', 18, { tipo: 'tecnica', intensidad: 'suave' }), [], perfilNovel)).toEqual([])
  })
  it('no se aplica a perfiles con experiencia ni fuera de la multipresa', () => {
    expect(validarSesion(conRegleta(10), [], perfilExperto)).toEqual([])
    expect(validarSesion(conRegleta(10, 'tecnica'), [], perfilNovel)).toEqual([])
  })
})

describe('seguridad.arqueado', () => {
  const arq = (conCarga: boolean | undefined) =>
    ses('q', '2026-10-27', 18, {
      tipo: 'multipresa-resistencia',
      intensidad: 'suave',
      detalle: { agarre: 'arqueado', regletaMm: 20, ...(conCarga === undefined ? {} : { conCarga }) },
    })

  it('con experiencia, arqueado con carga viola y solo cita P-10', () => {
    const v = validarSesion(arq(true), [], perfilExperto)
    expect(reglas(v)).toEqual(['seguridad.arqueado'])
    expect(v[0]!.explicacion.parametros).toEqual(['P-10'])
  })
  it('con experiencia, arqueado sin carga o con conCarga ausente pasa', () => {
    expect(validarSesion(arq(false), [], perfilExperto)).toEqual([])
    expect(validarSesion(arq(undefined), [], perfilExperto)).toEqual([])
  })
  it('un novel viola con cualquier arqueado, con o sin carga o sin el campo, y cita P-10 y P-12', () => {
    for (const conCarga of [true, false, undefined]) {
      const v = validarSesion(arq(conCarga), [], perfilNovel)
      expect(reglas(v), String(conCarga)).toEqual(['seguridad.arqueado'])
      expect(v[0]!.explicacion.parametros).toEqual(['P-10', 'P-12'])
    }
  })
  it('arqueado con carga viola en cualquier tipo (también tecnica)', () => {
    const t = ses('q', '2026-10-27', 18, { tipo: 'tecnica', intensidad: 'suave', detalle: { agarre: 'arqueado', conCarga: true } })
    expect(reglas(validarSesion(t, [], perfilExperto))).toEqual(['seguridad.arqueado'])
    expect(reglas(validarSesion(t, [], perfilNovel))).toEqual(['seguridad.arqueado'])
  })
  it('semiarqueado con carga pasa', () => {
    const semi = ses('q', '2026-10-27', 18, { intensidad: 'suave', detalle: { agarre: 'semiarqueado', conCarga: true } })
    expect(validarSesion(semi, [], perfilExperto)).toEqual([])
    expect(validarSesion(semi, [], perfilNovel)).toEqual([])
  })
})

describe('validarSesion: varias reglas a la vez', () => {
  it('las violaciones salen ordenadas por regla', () => {
    // Bloque intenso el lunes 18:00 (termina 19:30); la propuesta es el martes: días seguidos.
    const lunes = ses('lunes', '2026-10-26', 18)
    const peligrosa = ses('p', '2026-10-27', 18, {
      tipo: 'multipresa-maxima',
      detalle: { regletaMm: 15 },
    })
    const v = validarSesion(peligrosa, [lunes], perfilNovel)
    expect(reglas(v)).toEqual(['seguridad.dedos-dia-descanso', 'seguridad.maxima-novel', 'seguridad.regleta'])
  })
  it('arqueado, dedos-dia-descanso, maxima-novel, multipresa-7dias y regleta a la vez, en orden', () => {
    const mp = (id: string, fecha: string) =>
      ses(id, fecha, 8, { tipo: 'multipresa-resistencia', intensidad: 'suave', detalle: { regletaMm: 20 } })
    const propuesta = ses('p', '2026-10-27', 18, {
      tipo: 'multipresa-maxima',
      detalle: { regletaMm: 15, agarre: 'arqueado', conCarga: true },
    })
    const historial = [ses('lunes', '2026-10-26', 18), mp('m1', '2026-10-25'), mp('m2', '2026-10-28')]
    const v = validarSesion(propuesta, historial, perfilNovel)
    // lunes y m2 (multipresa, intensa por tipo) son del día anterior y del siguiente a la propuesta: dedos-dia-descanso sale dos veces.
    // Los días 25-28 son además cuatro seguidos de carga alta (la multipresa suave cuenta).
    const nombres = reglas(v)
    expect(nombres).toEqual([
      'seguridad.arqueado',
      'seguridad.carga-alta-seguida',
      'seguridad.dedos-7dias',
      'seguridad.dedos-dia-descanso',
      'seguridad.dedos-dia-descanso',
      'seguridad.maxima-novel',
      'seguridad.multipresa-7dias',
      'seguridad.regleta',
    ])
    expect(nombres).toEqual([...nombres].sort())
  })
  it('campus y carga-alta-seguida a la vez, en orden', () => {
    // el 4x4 no carga los dedos: aquí solo interesa combinar campus con la racha de carga alta.
    const alta = (id: string, fecha: string) => ses(id, fecha, 8, { tipo: 'resistencia-4x4' })
    const campus = ses('c', '2026-10-28', 8, { tipo: 'campus' })
    const v = validarSesion(campus, [alta('a', '2026-10-26'), alta('b', '2026-10-27')], perfilNovel)
    expect(reglas(v)).toEqual(['seguridad.campus', 'seguridad.carga-alta-seguida'])
  })
})

describe('seguridad.evaluacion-prematura', () => {
  const evaluacion = (fecha: string) =>
    ses('e', fecha, 18, {
      tipo: 'evaluacion-dedos', duracionMin: 30, detalle: { regletaMm: 20, agarre: 'semiarqueado', conCarga: true },
    })

  it('en perfil novel el test también exige regleta indicada y de al menos 20 mm', () => {
    const base = ses('e', '2026-10-27', 18, { tipo: 'evaluacion-dedos', duracionMin: 30 })
    const historial = [primera('2026-09-01'), ...BASE_OCTUBRE]
    expect(reglas(validarSesion(base, historial, perfilNovel))).toEqual(['seguridad.regleta'])
    const pequena = { ...base, detalle: { regletaMm: 15, agarre: 'semiarqueado' as const, conCarga: true } }
    expect(reglas(validarSesion(pequena, historial, perfilNovel))).toEqual(['seguridad.regleta'])
    const arqueado = { ...base, detalle: { regletaMm: 20, agarre: 'arqueado' as const, conCarga: true } }
    expect(reglas(validarSesion(arqueado, historial, perfilNovel))).toEqual(['seguridad.arqueado'])
  })
  const primera = (fecha: string) => ses('p', fecha, 18, { tipo: 'tecnica', intensidad: 'suave' })

  it('28 días desde la primera sesión pasa y 27 viola, en perfil novel', () => {
    expect(validarSesion(evaluacion('2026-10-27'), [primera('2026-09-29'), ...BASE_OCTUBRE], perfilNovel)).toEqual([])
    const v = validarSesion(evaluacion('2026-10-27'), [primera('2026-09-30'), ...BASE_OCTUBRE], perfilNovel)
    expect(reglas(v)).toEqual(['seguridad.evaluacion-prematura'])
    expect(v[0]!.explicacion.parametros).toEqual(['P-12', 'P-32'])
    expect(v[0]!.sesionIds).toEqual(['e'])
  })
  it('sin historial viola en perfil novel', () => {
    expect(reglas(validarSesion(evaluacion('2026-10-27'), [], perfilNovel))).toEqual(['seguridad.evaluacion-prematura'])
  })
  it('la primera sesión es la más antigua, no la última del historial', () => {
    const historial = [primera('2026-10-20'), ses('q', '2026-09-01', 18, { tipo: 'tecnica', intensidad: 'suave' }), ...BASE_OCTUBRE]
    expect(validarSesion(evaluacion('2026-10-27'), historial, perfilNovel)).toEqual([])
  })
  it('no se aplica a perfiles con experiencia', () => {
    expect(validarSesion(evaluacion('2026-10-27'), [], perfilExperto)).toEqual([])
  })
  it('la evaluación cuenta como sesión intensa de dedos aunque se etiquete suave', () => {
    const ayer = ses('ayer', '2026-10-26', 18, { tipo: 'evaluacion-dedos', intensidad: 'suave' })
    const v = validarSesion(ses('hoy', '2026-10-27', 18, { tipo: 'board' }), [ayer], perfilExperto)
    expect(reglas(v)).toContain('seguridad.dedos-dia-descanso')
  })
  it('no dispara maxima-novel: es el tipo de excepción', () => {
    const v = validarSesion(evaluacion('2026-10-27'), [primera('2026-09-01'), ...BASE_OCTUBRE], perfilNovel)
    expect(reglas(v)).not.toContain('seguridad.maxima-novel')
  })
})

describe('seguridad.dedos-7dias (tope semanal para perfiles novel)', () => {
  const intensa = (id: string, fecha: string) => ses(id, fecha, 18, { tipo: 'bloque-limite' })
  const regla = (v: ReturnType<typeof validarSesion>) => v.filter((x) => x.regla === 'seguridad.dedos-7dias')

  it('3 sesiones intensas de dedos en 7 días pasan y la 4.ª viola (días alternos)', () => {
    const h = [intensa('a', '2026-10-26'), intensa('b', '2026-10-28'), intensa('c', '2026-10-30')]
    expect(regla(validarSesion(intensa('c', '2026-10-30'), h.slice(0, 2), perfilNovel))).toEqual([])
    const v = regla(validarSesion(intensa('d', '2026-11-01'), h, perfilNovel))
    expect(v).toHaveLength(1)
    expect(v[0]!.sesionIds).toEqual(['a', 'b', 'c', 'd'])
    expect(v[0]!.explicacion.parametros).toEqual(['P-12'])
    expect(validarSesion(intensa('d', '2026-11-01'), h, perfilNovel).map((x) => x.regla)).toEqual(['seguridad.dedos-7dias'])
  })
  it('la cuarta a 8 días de la primera ya cabe', () => {
    const h = [intensa('a', '2026-10-26'), intensa('b', '2026-10-28'), intensa('c', '2026-10-30')]
    expect(regla(validarSesion(intensa('d', '2026-11-03'), h, perfilNovel))).toEqual([])
  })
  it('cuenta multipresas etiquetadas suaves y sesiones futuras, y no se aplica con experiencia', () => {
    const mp = (id: string, fecha: string) =>
      ses(id, fecha, 18, { tipo: 'multipresa-resistencia', intensidad: 'suave', detalle: { regletaMm: 20 } })
    const h = [mp('a', '2026-10-26'), intensa('b', '2026-10-28'), intensa('c', '2026-11-01')]
    expect(regla(validarSesion(intensa('d', '2026-10-30'), h, perfilNovel))).toHaveLength(1)
    expect(regla(validarSesion(intensa('d', '2026-10-30'), h, perfilExperto))).toEqual([])
  })
})

describe('seguridad.evaluacion-prematura: mínimo de sesiones en la base', () => {
  const evaluacion = ses('e', '2026-10-27', 18, {
    tipo: 'evaluacion-dedos', duracionMin: 30, detalle: { regletaMm: 20, agarre: 'semiarqueado', conCarga: true },
  })
  const primera = ses('p', '2026-09-01', 18, { tipo: 'tecnica', intensidad: 'suave' })

  it('con 28 días pero solo 5 sesiones en las 4 semanas previas viola, y el mensaje dice cuántas llevas', () => {
    const v = validarSesion(evaluacion, [primera, ...BASE_OCTUBRE.slice(0, 5)], perfilNovel)
    expect(v.map((x) => x.regla)).toEqual(['seguridad.evaluacion-prematura'])
    expect(v[0]!.mensaje).toMatch(/6 sesiones.*llevas 5/)
  })
  it('con 6 sesiones en las 4 semanas previas pasa', () => {
    expect(validarSesion(evaluacion, [primera, ...BASE_OCTUBRE], perfilNovel)).toEqual([])
  })
  it('las sesiones de hace más de 28 días no cuentan para el mínimo', () => {
    const viejas = BASE_OCTUBRE.map((s, i) => ({ ...s, id: `v${i}`, fecha: `2026-09-${String(10 + i).padStart(2, '0')}` }))
    expect(validarSesion(evaluacion, [primera, ...viejas], perfilNovel).map((x) => x.regla)).toEqual(['seguridad.evaluacion-prematura'])
  })
})

describe('seguridad.dominadas-dia-dedos y seguridad.dominadas-7dias (P-39)', () => {
  const reglas = (p: Sesion, h: Sesion[]) => validarSesion(p, h, perfilExperto).map((v) => v.regla)
  const tecnicaConDominadas = (id: string, fecha: string) =>
    ses(id, fecha, 18, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 75, incluye: ['dominadas'] })
  const multipresa = (id: string, fecha: string, h = 9) =>
    ses(id, fecha, h, { tipo: 'multipresa-resistencia', duracionMin: 55, detalle: { regletaMm: 20, agarre: 'semiarqueado' } })
  it('no van el mismo día que una sesión intensa de dedos, en los dos sentidos', () => {
    expect(reglas(tecnicaConDominadas('d', '2026-11-10'), [multipresa('m', '2026-11-10')])).toContain('seguridad.dominadas-dia-dedos')
    expect(reglas(multipresa('m', '2026-11-10', 20), [tecnicaConDominadas('d', '2026-11-10')])).toContain('seguridad.dominadas-dia-dedos')
    expect(reglas(ses('x', '2026-11-10', 18, { tipo: 'bloque-limite', incluye: ['dominadas'] }), [])).toContain('seguridad.dominadas-dia-dedos')
    expect(reglas(tecnicaConDominadas('d', '2026-11-10'), [multipresa('m', '2026-11-09')])).not.toContain('seguridad.dominadas-dia-dedos')
  })
  it('también como sesión propia', () => {
    const sola = ses('d', '2026-11-10', 18, { tipo: 'dominadas', intensidad: 'alta', duracionMin: 20 })
    expect(reglas(sola, [multipresa('m', '2026-11-10')])).toContain('seguridad.dominadas-dia-dedos')
  })
  it('como mucho 1 en cualquier ventana de 7 días, para cualquier perfil', () => {
    const previa = tecnicaConDominadas('a', '2026-11-04')
    expect(reglas(tecnicaConDominadas('b', '2026-11-10'), [previa])).toContain('seguridad.dominadas-7dias')
    expect(reglas(tecnicaConDominadas('b', '2026-11-11'), [previa])).not.toContain('seguridad.dominadas-7dias')
    expect(validarSesion(tecnicaConDominadas('b', '2026-11-10'), [previa], perfilNovel).map((v) => v.regla)).toContain('seguridad.dominadas-7dias')
  })
})

describe('seguridad.carga-alta-mismo-dia (P-68)', () => {
  const manana = ses('m', '2026-11-10', 9, { tipo: 'multipresa-resistencia', intensidad: 'alta', duracionMin: 45, detalle: { regletaMm: 20, agarre: 'semiarqueado' } })
  const tarde = ses('t', '2026-11-10', 19, { tipo: 'via-cuerda-limite', intensidad: 'alta', duracionMin: 120 })
  const reglas = (s: Sesion, h: Sesion[]) => validarSesion(s, h, perfilExperto).map((v) => v.regla)
  it('rechaza una segunda sesión de carga alta el mismo día', () => {
    expect(reglas(tarde, [manana])).toContain('seguridad.carga-alta-mismo-dia')
  })
  it('una suave por la tarde o la de carga alta otro día sí valen', () => {
    expect(reglas(ses('s', '2026-11-10', 19, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 60 }), [manana])).not.toContain('seguridad.carga-alta-mismo-dia')
    expect(reglas(tarde, [{ ...manana, fecha: '2026-11-09' }])).not.toContain('seguridad.carga-alta-mismo-dia')
  })
})
