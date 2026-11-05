import { describe, expect, it } from 'vitest'
import { FRACCION_INICIAL_REPEATERS, METADATOS, VALORES } from '../../motor'
import { DIBUJO_IDS } from './dibujos'
import { FICHA_IDS, FICHAS, fichaDe, GRUPOS, LUGARES_FICHA, usoFicha } from './fichas'

const todas = Object.values(FICHAS)
const texto = (id: (typeof FICHA_IDS)[number]): string => {
  const f = FICHAS[id]
  return [f.titulo, f.paraQue, f.material, ...f.pasos, ...f.errores, ...f.paraSi].join(' ')
}

describe('FICHAS', () => {
  it('cada id tiene su ficha con el mismo id', () => {
    expect(Object.keys(FICHAS).sort()).toEqual([...FICHA_IDS].sort())
    for (const id of FICHA_IDS) expect(FICHAS[id].id).toBe(id)
  })
  it('todas tienen título, para qué, material, de 3 a 7 pasos, errores y cuándo parar', () => {
    for (const f of todas) {
      expect(f.titulo.trim(), f.id).not.toBe('')
      expect(f.paraQue.trim(), f.id).not.toBe('')
      expect(f.material.trim(), f.id).not.toBe('')
      expect(f.pasos.length, f.id).toBeGreaterThanOrEqual(3)
      expect(f.pasos.length, f.id).toBeLessThanOrEqual(7)
      expect(f.errores.length, f.id).toBeGreaterThan(0)
      expect(f.paraSi.length, f.id).toBeGreaterThan(0)
      for (const t of [...f.pasos, ...f.errores, ...f.paraSi]) expect(t.trim(), f.id).not.toBe('')
    }
  })
  it('sus parámetros existen en METADATOS y cada ficha cita al menos uno', () => {
    for (const f of todas) {
      expect(f.parametros.length, f.id).toBeGreaterThan(0)
      for (const p of f.parametros) expect(METADATOS[p], `${f.id}: ${p}`).toBeDefined()
    }
  })
  it('cada dibujo existe', () => {
    for (const f of todas) if (f.dibujo) expect(DIBUJO_IDS, f.id).toContain(f.dibujo)
  })
  it('cada dibujo lo usa al menos una ficha', () => {
    for (const d of DIBUJO_IDS) expect(todas.some((f) => f.dibujo === d), d).toBe(true)
  })
  it('todas dicen cuándo parar por dolor (P-43) o por una señal de alarma (P-44)', () => {
    for (const f of todas) {
      expect(f.paraSi.join(' '), f.id).toMatch(/dolor/i)
      expect(f.parametros.some((p) => p === 'P-43' || p === 'P-44'), f.id).toBe(true)
    }
  })
})

describe('fichas de suspensiones: los números son los del motor', () => {
  const regleta = `${VALORES['P-12'].regletaMinimaMm} mm`
  const suspensiones = ['repeaters-7-3', 'resistencia-10-6', 'suspension-maxima-10s', 'agarre-semiarqueado'] as const
  it('todas usan regleta de 20 mm, agarre semiarqueado, regleta mínima para noveles y P-10', () => {
    for (const id of suspensiones) {
      expect(texto(id), id).toContain(regleta)
      expect(texto(id), id).toMatch(/semiarqueado/i)
      expect(texto(id), id).toMatch(/menos de 2 años/)
      expect(FICHAS[id].parametros, id).toContain('P-10')
      expect(FICHAS[id].parametros, id).toContain('P-12')
      expect(FICHAS[id].dibujo, id).toBe('colgado-multipresa')
    }
  })
  it('repeaters: 7:3, 7 repeticiones, 2,5 min entre series, 70 % y como mucho 80 %', () => {
    const t = texto('repeaters-7-3')
    expect(VALORES['P-02']).toMatchObject({ trabajoS: 7, descansoS: 3 })
    expect(t).toContain(`${VALORES['P-02'].trabajoS} s colgado y ${VALORES['P-02'].descansoS} s de descanso`)
    expect(t).toContain(`${VALORES['P-03'].repeticionesPorSerie} repeticiones`)
    expect(t).toContain('2,5 min')
    expect(t).toContain(`${Math.round(FRACCION_INICIAL_REPEATERS * 100)} %`)
    expect(t).toContain(`${Math.round(VALORES['P-06'].fraccionMaximaRepeaters * 100)} %`)
  })
  it('resistencia: 10:6 al 60 %, hasta 24 repeticiones, 2 series y 6 min entre series', () => {
    const t = texto('resistencia-10-6')
    const v = VALORES['P-36']
    expect(t).toContain(`${v.trabajoS} s colgado y ${v.descansoS} s de descanso, hasta ${v.repeticiones} repeticiones`)
    expect(t).toContain(`${v.series} series`)
    expect(t).toContain('6 min entre series')
    expect(t).toContain('60 %')
  })
  it('máxima del test: 10 s, hasta 3 intentos y 3 min de descanso', () => {
    const t = texto('suspension-maxima-10s')
    const v = VALORES['P-18']
    expect(t).toContain(`${v.duracionS} s`)
    expect(t).toContain(`${v.intentos} intentos`)
    expect(t).toContain(`${v.descansoS / 60} min`)
  })
  it('colgado del test: canto de 30 mm a peso corporal, hasta soltar, con descarga por debajo de 10 s', () => {
    const t = texto('colgado-30mm')
    const v = VALORES['P-24']
    expect(t).toContain(`${v.regletaMm} mm`)
    expect(t).toMatch(/hasta soltar/)
    expect(t).toContain(`${v.minimoS} s`)
    expect(t).toContain(`${VALORES['P-19'].colgadoPct} %`)
    expect(t).toMatch(/semiarqueado/)
    expect(t).toMatch(/menos de 2 años/)
    expect(FICHAS['colgado-30mm'].parametros).toEqual(expect.arrayContaining(['P-24', 'P-19', 'P-10', 'P-12']))
  })
  it('tests de casa y power slap: citan su cambio real (P-19)', () => {
    expect(texto('power-slap')).toContain(`${VALORES['P-19'].powerSlapCm} cm`)
    expect(texto('dominadas-maximas')).toContain(`a partir de ${VALORES['P-19'].dominadas}`)
    expect(texto('apertura-cadera')).toContain(`${VALORES['P-19'].caderaCm} cm`)
    for (const id of ['power-slap', 'dominadas-maximas', 'apertura-cadera'] as const) expect(FICHAS[id].parametros, id).toContain('P-19')
  })
  it('ninguna ficha de suspensiones da otros porcentajes que los del motor', () => {
    const permitidos = new Set([
      Math.round(FRACCION_INICIAL_REPEATERS * 100),
      Math.round(VALORES['P-06'].fraccionMaximaRepeaters * 100),
      Math.round(VALORES['P-36'].fraccion * 100),
    ])
    for (const id of suspensiones) {
      for (const m of texto(id).matchAll(/(\d+) %/g)) expect(permitidos, `${id}: ${m[0]}`).toContain(Number(m[1]))
    }
  })
})

describe('fichas de hombro: la dosis la marca la sesión', () => {
  it('las del programa de hombro citan P-41 y remiten a la sesión para la dosis (su explicación dice de dónde sale)', () => {
    for (const id of GRUPOS.find((g) => g.id === 'hombro')!.fichas) {
      expect(FICHAS[id].parametros, id).toContain('P-41')
      expect(texto(id), id).toMatch(/marca la sesión/)
    }
  })
})

describe('GRUPOS', () => {
  it('son las siete cualidades y «Fuerza y forma», en orden', () => {
    expect(GRUPOS.map((g) => g.titulo)).toEqual([
      'Fuerza de dedos', 'Resistencia', 'Potencia y tirón', 'Técnica', 'Cabeza y táctica', 'Hombro y antagonistas', 'Movilidad y core',
      'Fuerza y forma',
    ])
  })
  it('cada ficha dice dónde se hace y si el entrenador la propone', () => {
    for (const id of FICHA_IDS) expect(LUGARES_FICHA[id].length, id).toBeGreaterThan(0)
    expect(usoFicha('pies-silenciosos')).toBe('plan')
    expect(usoFicha('inthangs')).toBe('consulta')
    expect(usoFicha('campus')).toBe('no')
    expect(LUGARES_FICHA['tactica-encadene']).toEqual(['roca'])
  })
  it('cada ficha está en un solo grupo', () => {
    const vistas = GRUPOS.flatMap((g) => g.fichas)
    expect([...vistas].sort()).toEqual([...FICHA_IDS].sort())
  })
})

describe('fichaDe', () => {
  it('devuelve la ficha si existe y undefined si no', () => {
    expect(fichaDe('flexiones')?.titulo).toBe(FICHAS.flexiones.titulo)
    expect(fichaDe('no-existe')).toBeUndefined()
    expect(fichaDe(undefined)).toBeUndefined()
    expect(fichaDe('constructor')).toBeUndefined()
  })
})
