import { describe, expect, it } from 'vitest'
import { peticion, ses } from './_fabrica'
import { construirSesion } from './plantillas'
import type { EvaluacionDedos } from './propuesta-tipos'

const evaluacion: EvaluacionDedos = { fecha: '2026-10-20', pesoCorporalKg: 70, lastreKg: 30 }
const multipresasPrevias = (n: number) =>
  Array.from({ length: n }, (_, i) =>
    ses(`m${i}`, `2026-09-${String(1 + i * 3).padStart(2, '0')}`, 18, { tipo: 'multipresa-resistencia' }),
  )
const suma = (p: NonNullable<ReturnType<typeof construirSesion>>) => p.bloques.reduce((a, b) => a + b.minutos, 0)

describe('construirSesion: invariantes', () => {
  it('un tipo sin plantilla devuelve null', () => {
    expect(construirSesion('descanso', peticion())).toBeNull()
    expect(construirSesion('campus', peticion())).toBeNull()
  })
})

describe('multipresa-resistencia', () => {
  const base = () => peticion({ evaluacion, contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 120 } })

  it('al empezar (menos de 4 sesiones de multipresa) es 1 bloque: 10 + 20 = 30 min', () => {
    const plan = construirSesion('multipresa-resistencia', base())!
    expect(plan.sesion).toMatchObject({
      id: 'propuesta-multipresa-resistencia', tipo: 'multipresa-resistencia', intensidad: 'alta',
      fecha: '2026-10-27', horaInicio: 19, duracionMin: 30,
      detalle: { regletaMm: 20, agarre: 'semiarqueado', conCarga: true },
    })
    expect(plan.bloques.map((b) => b.minutos)).toEqual([10, 20])
    expect(suma(plan)).toBe(plan.sesion.duracionMin)
  })
  it('con 3 sesiones previas sigue siendo 1 bloque y con 4 pasa a 2: 10 + 20 + 5 + 20 = 55 min', () => {
    const tres = construirSesion('multipresa-resistencia', { ...base(), historial: multipresasPrevias(3) })!
    expect(tres.sesion.duracionMin).toBe(30)
    const cuatro = construirSesion('multipresa-resistencia', { ...base(), historial: multipresasPrevias(4) })!
    expect(cuatro.sesion.duracionMin).toBe(55)
    expect(cuatro.bloques.map((b) => b.minutos)).toEqual([10, 20, 5, 20])
    expect(suma(cuatro)).toBe(55)
  })
  it('si dos bloques no caben usa uno, y si ni uno cabe devuelve null', () => {
    const justo = { ...base(), historial: multipresasPrevias(4), contexto: { ...base().contexto, minutosDisponibles: 54 } }
    expect(construirSesion('multipresa-resistencia', justo)!.sesion.duracionMin).toBe(30)
    expect(construirSesion('multipresa-resistencia', { ...justo, contexto: { ...justo.contexto, minutosDisponibles: 55 } })!.sesion.duracionMin).toBe(55)
    expect(construirSesion('multipresa-resistencia', { ...justo, contexto: { ...justo.contexto, minutosDisponibles: 29 } })).toBeNull()
  })
  it('el bloque de repeaters usa las cifras de los parámetros', () => {
    const bloque = construirSesion('multipresa-resistencia', base())!.bloques[1]!
    const e = bloque.ejercicios[0]!
    expect(e).toMatchObject({ series: 6, repeticiones: 7, trabajoS: 7, descansoS: 3, descansoSeriesS: 150 })
    expect(e.nombre).toMatch(/20 mm/)
    expect(e.nombre).toMatch(/semiarqueado/)
  })
  it('con evaluación vigente la carga es el lastre calculado', () => {
    const e = construirSesion('multipresa-resistencia', base())!.bloques[1]!.ejercicios[0]!
    expect(e.cargaKg).toBe(10)
    expect(e.cargaTexto).toBe('+10 kg de lastre')
  })
  it('un lastre fraccionario se escribe con coma y uno negativo es descarga', () => {
    const fraccion = { ...base(), evaluacion: { ...evaluacion, lastreKg: 31 } }
    expect(construirSesion('multipresa-resistencia', fraccion)!.bloques[1]!.ejercicios[0]!.cargaTexto).toBe('+10,5 kg de lastre')
    const descarga = { ...base(), evaluacion: { ...evaluacion, lastreKg: -5 } }
    const plan = construirSesion('multipresa-resistencia', descarga)!
    expect(plan.bloques[1]!.ejercicios[0]!.cargaTexto).toBe('descarga de 18 kg')
    expect(plan.sesion.detalle?.conCarga).toBe(false)
  })
  it('lastre cero se escribe como peso corporal', () => {
    const cero = { ...base(), evaluacion: { ...evaluacion, pesoCorporalKg: 60, lastreKg: 15 } }
    expect(construirSesion('multipresa-resistencia', cero)!.bloques[1]!.ejercicios[0]!.cargaTexto).toBe('Solo tu peso corporal')
  })
  it('sin evaluación vigente va por esfuerzo percibido y sin cargaKg', () => {
    for (const ev of [undefined, { ...evaluacion, fecha: '2026-08-01' }]) {
      const plan = construirSesion('multipresa-resistencia', { ...base(), evaluacion: ev })!
      const e = plan.bloques[1]!.ejercicios[0]!
      expect(e.cargaKg).toBeUndefined()
      expect(e.cargaTexto).toMatch(/6–7/)
      expect(plan.sesion.detalle?.conCarga).toBe(false)
    }
  })
  it('cada bloque trae su explicación con parámetros y la sesión las reúne', () => {
    const plan = construirSesion('multipresa-resistencia', { ...base(), historial: multipresasPrevias(4) })!
    for (const b of plan.bloques) expect(b.explicacion.parametros.length).toBeGreaterThan(0)
    expect(plan.explicaciones).toEqual(plan.bloques.map((b) => b.explicacion))
    expect(plan.bloques[0]!.explicacion.parametros).toContain('P-49')
    expect(plan.bloques[1]!.explicacion.parametros).toEqual(expect.arrayContaining(['P-01', 'P-02', 'P-03', 'P-05', 'P-06']))
  })
  it('no muta la petición', () => {
    const p = { ...base(), historial: multipresasPrevias(4) }
    const antes = structuredClone(p)
    construirSesion('multipresa-resistencia', p)
    expect(p).toEqual(antes)
  })
})

describe('evaluacion-dedos', () => {
  const base = () => peticion({ contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 120 } })

  it('dura 30 min: calentamiento 10, subida progresiva 5 y test 15', () => {
    const plan = construirSesion('evaluacion-dedos', base())!
    expect(plan.sesion).toMatchObject({
      id: 'propuesta-evaluacion-dedos', tipo: 'evaluacion-dedos', intensidad: 'alta', duracionMin: 30,
      detalle: { regletaMm: 20, agarre: 'semiarqueado', conCarga: true },
    })
    expect(plan.bloques.map((b) => b.minutos)).toEqual([10, 5, 15])
    expect(suma(plan)).toBe(30)
  })
  it('el test son 3 intentos de 10 s con 180 s de descanso', () => {
    const e = construirSesion('evaluacion-dedos', base())!.bloques[2]!.ejercicios[0]!
    expect(e).toMatchObject({ series: 3, trabajoS: 10, descansoSeriesS: 180 })
    expect(e.notas).toMatch(/dolor/)
  })
  it('cita los parámetros del test', () => {
    const plan = construirSesion('evaluacion-dedos', base())!
    expect(plan.bloques[2]!.explicacion.parametros).toEqual(expect.arrayContaining(['P-17', 'P-18']))
  })
  it('devuelve null si no caben 30 min', () => {
    const corto = { ...base(), contexto: { ...base().contexto, minutosDisponibles: 29 } }
    expect(construirSesion('evaluacion-dedos', corto)).toBeNull()
  })
})
