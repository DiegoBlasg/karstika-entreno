import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import { conflictoFranja, elegirGenerado, otraOpcion } from './generar'
import { prepararPropuesta, type EntradaPeticion } from './peticion'

const entrada = (lugar: 'casa' | 'rocodromo'): EntradaPeticion =>
  ({ fecha: '2026-11-04', horaInicio: 18, contexto: { compania: 'con-gente', lugar, minutosDisponibles: 90 } })

describe('generar', () => {
  it('sin tipo, la principal; con tipo, la opción de ese tipo; un tipo imposible da error', () => {
    const prep = prepararPropuesta(datosVacios(), entrada('rocodromo'))
    if (prep.tipo !== 'propuesta' || !prep.propuesta.principal) throw new Error('sin principal')
    const r = elegirGenerado(prep)
    expect(r.tipo === 'sesion' && r.plan.sesion.tipo).toBe(prep.propuesta.principal.sesion.tipo)
    const alt = prep.propuesta.alternativas[0]
    if (alt) {
      const r2 = elegirGenerado(prep, alt.sesion.tipo)
      expect(r2.tipo === 'sesion' && r2.plan.sesion.tipo).toBe(alt.sesion.tipo)
    }
    expect(elegirGenerado(prep, 'campus').tipo).toBe('error')
  })
  it('otra opción rota por la lista sin repetir el tipo actual', () => {
    const prep = prepararPropuesta(datosVacios(), entrada('rocodromo'))
    if (prep.tipo !== 'propuesta' || !prep.propuesta.principal) throw new Error('sin principal')
    const tipos = [prep.propuesta.principal, ...prep.propuesta.alternativas].map((o) => o.sesion.tipo)
    expect(tipos.length).toBeGreaterThan(1)
    expect(otraOpcion(prep, tipos[0]!)?.sesion.tipo).toBe(tipos[1])
    expect(otraOpcion(prep, tipos.at(-1)!)?.sesion.tipo).toBe(tipos[0])
    // Un tipo que no está en la lista: la primera.
    expect(otraOpcion(prep, 'campus')?.sesion.tipo).toBe(tipos[0])
  })
  it('una sesión por franja y día', () => {
    const d = datosVacios({ sesiones: [sesionFila(uuid(1), '2026-11-04', { horaInicio: 18 })] })
    expect(conflictoFranja(d, '2026-11-04', 'tarde')).toBe('Ya tienes una sesión ese día por la tarde.')
    expect(conflictoFranja(d, '2026-11-04', 'manana')).toBeNull()
    expect(conflictoFranja(d, '2026-11-05', 'tarde')).toBeNull()
    expect(conflictoFranja(d, '2026-11-04', 'tarde', uuid(1))).toBeNull()
  })
})
