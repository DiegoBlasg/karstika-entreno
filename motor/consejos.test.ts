import { describe, expect, it } from 'vitest'
import { peticion } from './_fabrica'
import type { Chequeo, Molestia } from './autorregulacion-tipos'
import { CONSEJOS, elegirConsejos } from './consejos'
import { FASE_FUERZA } from './fases'
import { METADATOS } from './metadatos'
import { proponerSesion } from './propuesta'
import type { Peticion } from './propuesta-tipos'
import type { Contexto } from './tipos'

const MARTES: Contexto = { compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120 }
const EVALUACION = { fecha: '2026-11-03', pesoCorporalKg: 70, lastreKg: 10 }
const chq = (fecha: string, molestias: Molestia[]): Chequeo => ({ fecha, sueno: 4, fatiga: 4, ganas: 4, molestias })
const pet = (extra: Partial<Peticion> = {}): Peticion =>
  peticion({ fecha: '2026-11-10', contexto: MARTES, fase: FASE_FUERZA, evaluacion: EVALUACION, ...extra })
const consejos = (p: Peticion) => elegirConsejos(p, proponerSesion(p))
const ids = (p: Peticion) => consejos(p).map((c) => c.id)
const hace = (n: number, id: string) => ({ id, fecha: new Date(Date.UTC(2026, 10, 10 - n)).toISOString().slice(0, 10) })

describe('elegirConsejos (P-66)', () => {
  it('vía al límite: como mucho 2, los propios de la sesión antes que los generales', () => {
    const p = pet()
    expect(proponerSesion(p).principal!.sesion.tipo).toBe('via-cuerda-limite')
    expect(ids(p)).toEqual(['lectura-via', 'descanso-pegues'])
  })
  it('no repite un consejo mostrado hace 6 días; a los 7, vuelve a valer, empezando por el que hace más que no ves', () => {
    expect(ids(pet({ consejosMostrados: [hace(6, 'lectura-via')] }))).toEqual(['descanso-pegues', 'reposos-via'])
    expect(ids(pet({ consejosMostrados: [hace(7, 'lectura-via')] }))).toEqual(['descanso-pegues', 'reposos-via'])
    expect(ids(pet({ consejosMostrados: [hace(7, 'lectura-via'), hace(8, 'descanso-pegues')] }))).toEqual(['reposos-via', 'calentamiento'])
  })
  it('cuando ya se han visto todos los de la sesión, rotan los generales', () => {
    const vistos = ['lectura-via', 'descanso-pegues', 'reposos-via', 'calentamiento'].map((id) => hace(1, id))
    expect(ids(pet({ consejosMostrados: vistos }))).toEqual(['sueno', 'proteina'])
    expect(ids(pet({ consejosMostrados: [...vistos, hace(2, 'sueno'), hace(2, 'proteina')] }))).toEqual(['peso', 'suplementos'])
  })
  it('los de seguridad van primero y se repiten aunque se hayan mostrado', () => {
    const ambar = pet({ seguimiento: { registros: [], chequeos: [chq('2026-11-10', [{ zona: 'dedos', dolor: 2 }])], altas: [] }, consejosMostrados: [hace(1, 'vigilar-ambar')] })
    expect(ids(ambar)[0]).toBe('vigilar-ambar')
    const rojo = pet({ seguimiento: { registros: [], chequeos: [chq('2026-11-10', [{ zona: 'hombro', dolor: 6 }])], altas: [] } })
    expect(ids(rojo)).toEqual(['fisio-rojo', 'sueno'])
  })
  it('miedo a caer solo con limitante cabeza y en una sesión de vía o pegues', () => {
    expect(ids(pet({ limitantePrincipal: 'cabeza' }))[0]).toBe('miedo-caer')
    expect(ids(pet({ limitantePrincipal: 'resistencia' }))).not.toContain('miedo-caer')
  })
  it('la proteína se calcula con tu peso y cita P-57', () => {
    const vistos = ['lectura-via', 'descanso-pegues', 'reposos-via', 'calentamiento', 'sueno'].map((id) => hace(1, id))
    const c = consejos(pet({ consejosMostrados: vistos }))[0]!
    expect(c.id).toBe('proteina')
    expect(c.texto).toMatch(/unos 1,6 g de proteína por kg.*unos 110 g/)
    expect(c.explicacion.parametros).toEqual(['P-57'])
  })
  it('cada consejo cita parámetros existentes y es determinista', () => {
    for (const c of CONSEJOS) for (const id of c.parametros) expect(METADATOS[id], `${c.id}:${id}`).toBeDefined()
    expect(consejos(pet())).toEqual(consejos(pet()))
  })
})
