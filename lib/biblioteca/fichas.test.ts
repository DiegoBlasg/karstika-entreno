import { describe, expect, it } from 'vitest'
import { FRACCION_INICIAL_REPEATERS, METADATOS, VALORES } from '../../motor'
import { DIBUJO_IDS } from './dibujos'
import { FICHA_IDS, FICHAS, fichaDe, GRUPOS } from './fichas'

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
  const suspensiones = ['repeaters-7-3', 'resistencia-fuerza-10-5', 'suspension-maxima-10s', 'test-7-3-fallo', 'agarre-semiarqueado'] as const
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
  it('resistencia de fuerza: 10:5, 5 repeticiones, 4 series y 1 min entre series', () => {
    const t = texto('resistencia-fuerza-10-5')
    const v = VALORES['P-36']
    expect(t).toContain(`${v.trabajoS} s colgado y ${v.descansoS} s de descanso`)
    expect(t).toContain(`${v.repeticiones} repeticiones`)
    expect(t).toContain(`${v.series} series`)
    expect(t).toContain('1 min entre series')
  })
  it('máxima del test: 10 s, hasta 3 intentos y 3 min de descanso', () => {
    const t = texto('suspension-maxima-10s')
    const v = VALORES['P-18']
    expect(t).toContain(`${v.duracionS} s`)
    expect(t).toContain(`${v.intentos} intentos`)
    expect(t).toContain(`${v.descansoS / 60} min`)
  })
  it('7:3 del test: al 60 % del máximo de hoy, hasta el fallo', () => {
    const t = texto('test-7-3-fallo')
    const v = VALORES['P-24']
    expect(t).toContain(`${v.trabajoS} s colgado y ${v.descansoS} s de descanso`)
    expect(t).toContain(`${Math.round(v.fraccion * 100)} %`)
    expect(t).toMatch(/fallo/)
  })
  it('ninguna ficha de suspensiones da otros porcentajes que los del motor', () => {
    const permitidos = new Set([
      Math.round(FRACCION_INICIAL_REPEATERS * 100),
      Math.round(VALORES['P-06'].fraccionMaximaRepeaters * 100),
      Math.round(VALORES['P-24'].fraccion * 100),
    ])
    for (const id of suspensiones) {
      for (const m of texto(id).matchAll(/(\d+) %/g)) expect(permitidos, `${id}: ${m[0]}`).toContain(Number(m[1]))
    }
  })
})

describe('fichas de hombro: lo que es diseño lo dice', () => {
  it('las del programa de hombro citan P-41 y avisan de que la dosis es decisión de diseño', () => {
    for (const id of GRUPOS.find((g) => g.id === 'hombro')!.fichas) {
      expect(FICHAS[id].parametros, id).toContain('P-41')
      expect(texto(id), id).toMatch(/decisión de diseño/)
    }
  })
})

describe('GRUPOS', () => {
  it('son los cinco del índice, en orden', () => {
    expect(GRUPOS.map((g) => g.titulo)).toEqual(['Suspensiones', 'Escalada', 'Barra', 'Hombro y antagonistas', 'Movilidad'])
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
