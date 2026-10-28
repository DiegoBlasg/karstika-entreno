import { describe, expect, it } from 'vitest'
import { construirSesion, FASES } from '../../motor'
import { pasosDeSesion } from './pasos'
import { intentoAbierto, lastre73, leerDatosTest, mejorLastre, textoLastre } from './test'

describe('mejorLastre', () => {
  it('el mayor lastre de los intentos completados', () => {
    expect(mejorLastre([{ lastreKg: 10, completado: true }, { lastreKg: 15, completado: false }, { lastreKg: 12.5, completado: true }])).toBe(12.5)
    expect(mejorLastre([{ lastreKg: -5, completado: true }, null])).toBe(-5)
    expect(mejorLastre([{ lastreKg: 15, completado: false }, null])).toBeNull()
    expect(mejorLastre([])).toBeNull()
  })
})

describe('lastre73', () => {
  it('60 % de (peso + mejor) menos el peso, hacia abajo a 0,5 kg (fórmula del motor)', () => {
    expect(lastre73('2026-11-02', 72, 15)).toBe(-20)   // 0,6 × 87 = 52,2 → −19,8 → −20
    expect(lastre73('2026-11-02', 70, 10)).toBe(-22)   // 0,6 × 80 = 48 → −22
  })
  it('si el cálculo no vale devuelve null', () => {
    expect(lastre73('2026-11-02', Number.NaN, 15)).toBeNull()
  })
})

describe('textoLastre', () => {
  it('lastre, descarga o nada, con coma decimal', () => {
    expect(textoLastre(2.5)).toBe('+2,5 kg de lastre')
    expect(textoLastre(-20)).toBe('descarga de 20 kg')
    expect(textoLastre(0)).toBe('sin lastre ni descarga')
  })
})

describe('intentoAbierto', () => {
  const pasos = pasosDeSesion(construirSesion('evaluacion-dedos', {
    fecha: '2026-11-02', horaInicio: 9, contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 90 },
    perfil: { pesoKg: 72, anosEscalando: 1.5, lesiones: [] }, historial: [], fase: FASES.fuerza,
    evaluacion: { fecha: '2026-10-01', pesoCorporalKg: 72, lastreKg: 15 },
  })!)
  // 0 bloque, 1 bloque, 2 prepárate, 3 intento 1, 4 descanso, 5 intento 2, 6 descanso, 7 intento 3, 8 bloque, 9 prepárate, 10 fallo
  it('el formulario del último intento se ve hasta el siguiente colgado o el fallo', () => {
    expect([2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => intentoAbierto(pasos, i)?.n ?? null)).toEqual([
      null, null, 1, null, 2, null, 3, 3, null, null,
    ])
  })
})

describe('leerDatosTest', () => {
  it('acepta lo bien formado y descarta lo demás', () => {
    const ok = { pesoKg: 72, intentos: [{ lastreKg: 10, completado: true }, null] }
    expect(leerDatosTest(JSON.parse(JSON.stringify(ok)), 3)).toEqual(ok)
    expect(leerDatosTest(null, 3)).toBeNull()
    expect(leerDatosTest({ pesoKg: 10, intentos: [] }, 3)).toBeNull()
    expect(leerDatosTest({ pesoKg: 72, intentos: [null, null, null, null] }, 3)).toBeNull()
    expect(leerDatosTest({ pesoKg: 72, intentos: [{ lastreKg: 'x', completado: true }] }, 3)).toBeNull()
    expect(leerDatosTest({ pesoKg: 72, intentos: [{ lastreKg: 200, completado: true }] }, 3)).toBeNull()
  })
})
