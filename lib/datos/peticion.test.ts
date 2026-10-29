import { describe, expect, it } from 'vitest'
import { sumarDias } from '../fecha'
import { datosVacios, huecoFila, uuid } from './_fabrica'
import { conChequeo, conRegistro, conSesion, filaSesionAceptada } from './cambios'
import { opcionElegida, prepararPropuesta, temporadaDe, type EntradaPeticion, type Preparacion } from './peticion'

const MARTES: EntradaPeticion = { fecha: '2026-11-03', horaInicio: 19, contexto: { compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120 } }
const propuestaDe = (p: Preparacion) => {
  if (p.tipo !== 'propuesta') throw new Error(`esperaba una propuesta: ${p.mensaje}`)
  return p
}

describe('prepararPropuesta', () => {
  it('antes del inicio y después del final de la temporada no propone', () => {
    const antes = prepararPropuesta(datosVacios(), { ...MARTES, fecha: '2026-10-30' })
    expect(antes).toEqual({ tipo: 'fuera-temporada', mensaje: 'La temporada empieza el lunes, 2 de noviembre.' })
    const despues = prepararPropuesta(datosVacios(), { ...MARTES, fecha: '2028-01-10' })
    expect(despues.tipo).toBe('fuera-temporada')
  })
  it('el primer martes con amigos propone vía al límite con dos alternativas, y siempre igual', () => {
    const p = propuestaDe(prepararPropuesta(datosVacios(), MARTES))
    expect(p.propuesta.principal?.sesion.tipo).toBe('via-cuerda-limite')
    expect(p.propuesta.alternativas.map((a) => a.sesion.tipo)).toEqual(['bloque-limite', 'tecnica'])
    expect(p.fase.id).toBe('base')
    expect(p.consejos.length).toBeGreaterThan(0)
    expect(prepararPropuesta(datosVacios(), MARTES)).toEqual(p)
  })
  it('opcionElegida: 0 es la principal y 1… las alternativas', () => {
    const { propuesta } = propuestaDe(prepararPropuesta(datosVacios(), MARTES))
    expect(opcionElegida(propuesta, 0)?.sesion.tipo).toBe('via-cuerda-limite')
    expect(opcionElegida(propuesta, 2)?.sesion.tipo).toBe('tecnica')
    expect(opcionElegida(propuesta, 3)).toBeUndefined()
  })
  it('con el chequeo de hoy bajo no propone nada intenso', () => {
    const bajo = conChequeo(datosVacios(), { fecha: '2026-11-03', sueno: 1, fatiga: 1, ganas: 1, molestias: [] })
    const p = propuestaDe(prepararPropuesta(bajo, MARTES))
    expect(p.propuesta.estado?.chequeoBajoHoy).toBe(true)
    for (const o of [p.propuesta.principal, ...p.propuesta.alternativas]) if (o) expect(o.sesion.intensidad).toBe('suave')
  })
  it('escenario: aceptar, registrar por encima del RPE objetivo y la siguiente sale frenada (P-11)', () => {
    const martes = propuestaDe(prepararPropuesta(datosVacios(), MARTES))
    const fila = filaSesionAceptada(opcionElegida(martes.propuesta, 0)!, uuid(1))
    const d = conRegistro(conSesion(datosVacios(), fila), {
      sesion_id: uuid(1), rpe: 10, duracion_min: fila.sesion.duracionMin, molestias: [], registrado_en: 'x',
    }, [])
    const jueves = propuestaDe(prepararPropuesta(d, { ...MARTES, fecha: '2026-11-05' }))
    expect(jueves.propuesta.estado?.sinSubida).toBe(true)
  })
  it('datos incoherentes: lanza con el mensaje del motor', () => {
    const d = datosVacios({ registros: [{ sesion_id: uuid(1), rpe: 5, duracion_min: 60, molestias: [], registrado_en: 'x' }] })
    expect(() => prepararPropuesta(d, MARTES)).toThrow(`El registro de la sesión ${uuid(1)} no tiene sesión`)
  })
})

describe('temporadaDe', () => {
  it('el reparto del ciclo 2 se fija con lo sabido el lunes en que empieza el ciclo 2', () => {
    const base = temporadaDe(datosVacios())
    expect(base.semanas.find((s) => s.ciclo === 2)?.lunes).toBe('2027-04-19')
    const tardia = datosVacios({
      evaluaciones: [{ id: uuid(1), fecha: '2027-05-03', peso_corporal_kg: 70, lastre_kg: 25, resistencia_s: 200, tecnica: 6 }],
    })
    expect(temporadaDe(tardia)).toEqual(base)
  })
})

describe('prepararPropuesta con huecos', () => {
  it('sin huecos declarados en la semana no hay plan semanal', () => {
    const p = propuestaDe(prepararPropuesta(datosVacios(), MARTES))
    expect(p.propuesta.semana).toBeUndefined()
  })
  it('con huecos declarados devuelve el plan del resto de la semana', () => {
    const d = datosVacios({
      huecos: [
        huecoFila(uuid(101), '2026-11-03', '19:00', { compania: 'con-gente', lugar: 'rocodromo', minutos: 120 }),
        huecoFila(uuid(102), '2026-11-04', '09:00'),
        huecoFila(uuid(103), '2026-11-05', '19:00', { lugar: 'rocodromo', minutos: 90 }),
      ],
    })
    const p = propuestaDe(prepararPropuesta(d, MARTES))
    expect(p.propuesta.semana?.map((x) => x.hueco.fecha)).toEqual(['2026-11-04', '2026-11-05'])
    expect(prepararPropuesta(d, MARTES)).toEqual(p) // determinista: aceptar ve lo mismo
  })
})

describe('material en casa (multipresa_en_casa)', () => {
  const SIN = ['multipresa-resistencia', 'multipresa-maxima', 'multipresa-resistencia-fuerza', 'evaluacion-dedos', 'campus']
  const tipos = (p: Preparacion): string[] => {
    const pr = propuestaDe(p).propuesta
    return [pr.principal, ...pr.alternativas].flatMap((o) => (o ? [o.sesion.tipo] : []))
  }
  const sinMultipresa = datosVacios({ perfil: { ...datosVacios().perfil, multipresa_en_casa: false } })
  const conMultipresa = datosVacios({ perfil: { ...datosVacios().perfil, multipresa_en_casa: true } })
  // cada día de la temporada, en casa y solo
  const dias: string[] = []
  for (let f = '2026-11-02'; f < '2027-05-01'; f = sumarDias(f, 1)) dias.push(f)
  const enCasa = (fecha: string): EntradaPeticion => ({ fecha, horaInicio: 19, contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 60 } })

  it('sin multipresa en casa nunca propone multipresa, test de dedos ni campus en casa', () => {
    for (const f of dias) for (const t of tipos(prepararPropuesta(sinMultipresa, enCasa(f)))) expect(SIN).not.toContain(t)
  })
  it('con multipresa en casa sigue pudiendo proponerla', () => {
    const vistos = new Set(dias.flatMap((f) => tipos(prepararPropuesta(conMultipresa, enCasa(f)))))
    expect(SIN.some((t) => vistos.has(t))).toBe(true)
  })
  it('los huecos de casa de la semana llevan la misma regla (no lanza y no propone material que falta)', () => {
    const huecos = [huecoFila(uuid(1), '2026-11-05', '19:00'), huecoFila(uuid(2), '2026-11-07', '10:00')]
    const d = { ...sinMultipresa, huecos }
    for (const t of tipos(prepararPropuesta(d, { ...MARTES, fecha: '2026-11-03' }))) expect(t).toBeTruthy()
    expect(() => prepararPropuesta(d, MARTES)).not.toThrow()
  })
})
