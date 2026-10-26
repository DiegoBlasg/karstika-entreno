import { describe, expect, it } from 'vitest'
import { peticion, ses } from './_fabrica'
import { construirComplemento, construirSesion, TIPOS_CON_PLANTILLA } from './plantillas'
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
      // Al 70 % de un test de 70 + 30 kg la carga es el peso corporal: no hay lastre añadido.
      detalle: { regletaMm: 20, agarre: 'semiarqueado', conCarga: false },
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
  it('la carga es el 70 % del test durante 8 sesiones y después el tope del 80 %', () => {
    const inicial = construirSesion('multipresa-resistencia', { ...base(), evaluacion: { ...evaluacion, lastreKg: 40 } })!
    const e1 = inicial.bloques[1]!.ejercicios[0]!
    expect(e1.cargaKg).toBe(7) // 0,7 × 110 − 70
    expect(e1.cargaTexto).toBe('+7 kg de lastre')
    expect(e1.notas).toMatch(/70 %/)
    expect(inicial.bloques[1]!.explicacion.parametros).toContain('P-04')
    const despues = construirSesion('multipresa-resistencia', { ...base(), historial: multipresasPrevias(8) })!
    const e2 = despues.bloques[1]!.ejercicios[0]!
    expect(e2.cargaKg).toBe(10) // 0,8 × 100 − 70
    expect(e2.cargaTexto).toBe('+10 kg de lastre')
    expect(e2.notas).toMatch(/80 %/)
    expect(despues.sesion.detalle?.conCarga).toBe(true)
  })
  it('un lastre fraccionario se escribe con coma y uno negativo es descarga', () => {
    const cuatro = { ...base(), historial: multipresasPrevias(8) }
    const fraccion = { ...cuatro, evaluacion: { ...evaluacion, lastreKg: 31 } }
    expect(construirSesion('multipresa-resistencia', fraccion)!.bloques[1]!.ejercicios[0]!.cargaTexto).toBe('+10,5 kg de lastre')
    const descarga = { ...cuatro, evaluacion: { ...evaluacion, lastreKg: -5 } }
    const plan = construirSesion('multipresa-resistencia', descarga)!
    expect(plan.bloques[1]!.ejercicios[0]!.cargaTexto).toBe('descarga de 18 kg')
    expect(plan.sesion.detalle?.conCarga).toBe(false)
    const descargaInicial = construirSesion('multipresa-resistencia', { ...base(), evaluacion: { ...evaluacion, lastreKg: -5 } })!
    expect(descargaInicial.bloques[1]!.ejercicios[0]!.cargaTexto).toBe('descarga de 24,5 kg') // 0,7 × 65 − 70
  })
  it('lastre cero se escribe como peso corporal', () => {
    const cero = { ...base(), evaluacion }
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

describe('board', () => {
  it('dura 45 min, es alta y cita P-38 (diseño)', () => {
    const plan = construirSesion('board', peticion())!
    expect(plan.sesion).toMatchObject({ id: 'propuesta-board', tipo: 'board', intensidad: 'alta', duracionMin: 45 })
    expect(plan.sesion.detalle).toBeUndefined()
    expect(plan.bloques.map((b) => b.minutos)).toEqual([10, 35])
    expect(plan.bloques[1]!.ejercicios[0]).toMatchObject({ series: 5, repeticiones: 3, descansoSeriesS: 180 })
    expect(plan.bloques[1]!.explicacion.parametros).toContain('P-38')
    expect(plan.bloques[1]!.explicacion.origen).toBe('diseno')
  })
  it('devuelve null si no caben 45 min', () => {
    expect(construirSesion('board', peticion({ contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 44 } }))).toBeNull()
  })
})

describe('bloque-suave', () => {
  it('dura 45 min y es suave', () => {
    const plan = construirSesion('bloque-suave', peticion())!
    expect(plan.sesion).toMatchObject({ tipo: 'bloque-suave', intensidad: 'suave', duracionMin: 45 })
    expect(plan.bloques.map((b) => b.minutos)).toEqual([10, 35])
    expect(plan.bloques[1]!.explicacion.parametros).toContain('P-54')
  })
})

describe('tecnica', () => {
  it('con gente en rocódromo usa vías con cuerda de nivel cómodo', () => {
    const plan = construirSesion('tecnica', peticion())!
    expect(plan.sesion).toMatchObject({ tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 })
    expect(plan.bloques[1]!.ejercicios[0]!.nombre).toMatch(/cuerda/)
  })
  it('solo usa bloque y vías autoaseguradas, nunca cuerda', () => {
    const plan = construirSesion('tecnica', peticion({ contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 120 } }))!
    const texto = plan.bloques[1]!.ejercicios.map((e) => e.nombre).join(' ')
    expect(texto).toMatch(/autoasegurad/)
    expect(texto).not.toMatch(/con cuerda/)
  })
  it('incluye previsualización de 3 min y vídeo, citando P-53, P-54 y P-55', () => {
    const plan = construirSesion('tecnica', peticion())!
    const textos = plan.bloques[1]!.ejercicios.map((e) => e.nombre).join(' ')
    expect(textos).toMatch(/3 min/)
    expect(textos).toMatch(/vídeo|graba/i)
    expect(plan.bloques[1]!.explicacion.parametros).toEqual(expect.arrayContaining(['P-53', 'P-54', 'P-55']))
  })
})

describe('arc', () => {
  it('con tiempo: 10 + 15 + 10 + 15 = 50 min', () => {
    const plan = construirSesion('arc', peticion())!
    expect(plan.sesion).toMatchObject({ tipo: 'arc', intensidad: 'suave', duracionMin: 50 })
    expect(plan.bloques.map((b) => b.minutos)).toEqual([10, 15, 10, 15])
  })
  it('con poco tiempo usa series de 10 min: 40 min', () => {
    const plan = construirSesion('arc', peticion({ contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 45 } }))!
    expect(plan.sesion.duracionMin).toBe(40)
    expect(plan.bloques.map((b) => b.minutos)).toEqual([10, 10, 10, 10])
  })
  it('devuelve null si no caben 40 min', () => {
    expect(construirSesion('arc', peticion({ contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 39 } }))).toBeNull()
  })
  it('cita P-35', () => {
    expect(construirSesion('arc', peticion())!.bloques[1]!.explicacion.parametros).toContain('P-35')
  })
})

describe('hombro', () => {
  it('dura 20 min: 5 de activación y 15 de ejercicios', () => {
    const plan = construirSesion('hombro', peticion())!
    expect(plan.sesion).toMatchObject({ tipo: 'hombro', intensidad: 'suave', duracionMin: 20 })
    expect(plan.bloques.map((b) => b.minutos)).toEqual([5, 15])
    expect(plan.bloques[1]!.explicacion.parametros).toContain('P-41')
  })
  it('devuelve null si no caben 20 min', () => {
    expect(construirSesion('hombro', peticion({ contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 19 } }))).toBeNull()
  })
})

describe('TIPOS_CON_PLANTILLA', () => {
  it('lista exactamente los tipos que construyen sesión', () => {
    expect([...TIPOS_CON_PLANTILLA].sort()).toEqual([
      'arc', 'bloque-limite', 'bloque-suave', 'board', 'evaluacion-dedos', 'hombro', 'multipresa-resistencia',
      'tecnica', 'via-cuerda-limite',
    ])
    for (const t of TIPOS_CON_PLANTILLA) {
      expect(construirSesion(t, peticion({ evaluacion: undefined }))).not.toBeNull()
    }
  })
  it('todas las sesiones suman sus minutos y traen explicación por bloque', () => {
    for (const t of TIPOS_CON_PLANTILLA) {
      const plan = construirSesion(t, peticion())!
      expect(plan.bloques.reduce((a, b) => a + b.minutos, 0)).toBe(plan.sesion.duracionMin)
      expect(plan.explicaciones).toHaveLength(plan.bloques.length)
    }
  })
})

describe('via-cuerda-limite', () => {
  it('con 120 min: calentamiento 10, progresivas 15 y 3 intentos de 25 = 100 min, alta', () => {
    const plan = construirSesion('via-cuerda-limite', peticion())!
    expect(plan.sesion).toMatchObject({ id: 'propuesta-via-cuerda-limite', tipo: 'via-cuerda-limite', intensidad: 'alta', duracionMin: 100 })
    expect(plan.bloques.map((b) => b.minutos)).toEqual([10, 15, 25, 25, 25])
  })
  it('recorta intentos según el tiempo: 75 min con 2, 50 con 1 y null por debajo', () => {
    const con = (m: number) => construirSesion('via-cuerda-limite', peticion({ contexto: { compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: m } }))
    expect(con(99)!.sesion.duracionMin).toBe(75)
    expect(con(50)!.sesion.duracionMin).toBe(50)
    expect(con(49)).toBeNull()
  })
  it('cada intento pide 20 min de recuperación activa, previsualización y sacudir, y cita P-51, P-52, P-53 y P-61', () => {
    const intento = construirSesion('via-cuerda-limite', peticion())!.bloques[2]!
    expect(intento.ejercicios[0]!.notas).toMatch(/20 min de recuperación activa/)
    expect(intento.ejercicios[0]!.notas).toMatch(/3 min/)
    expect(intento.ejercicios[0]!.notas).toMatch(/sacude/)
    expect(intento.explicacion.parametros).toEqual(['P-51', 'P-52', 'P-53', 'P-61'])
  })
  it('nunca más de 3 intentos aunque sobre tiempo (P-61 admite 4)', () => {
    const plan = construirSesion('via-cuerda-limite', peticion({ contexto: { compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 300 } }))!
    expect(plan.bloques.filter((b) => b.nombre.startsWith('Intento')).length).toBe(3)
  })
})

describe('bloque-limite', () => {
  it('50 min con tiempo (10 + 10 + 30) y 40 min con poco (10 + 10 + 20), alta', () => {
    const plan = construirSesion('bloque-limite', peticion())!
    expect(plan.sesion).toMatchObject({ tipo: 'bloque-limite', intensidad: 'alta', duracionMin: 50 })
    expect(plan.bloques.map((b) => b.minutos)).toEqual([10, 10, 30])
    const corto = construirSesion('bloque-limite', peticion({ contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 45 } }))!
    expect(corto.bloques.map((b) => b.minutos)).toEqual([10, 10, 20])
    expect(construirSesion('bloque-limite', peticion({ contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 39 } }))).toBeNull()
  })
  it('la dosis es decisión de diseño y lo dice', () => {
    const e = construirSesion('bloque-limite', peticion())!.bloques[2]!.explicacion
    expect(e.origen).toBe('diseno')
    expect(e.motivo).toMatch(/decisión de diseño/)
  })
})

describe('construirComplemento', () => {
  const p = peticion()
  it('hombro 15 min, ARC 15 o 10 min y técnica 30 min, sin calentamiento propio', () => {
    expect(construirComplemento('hombro', p, 15)!.minutos).toBe(15)
    expect(construirComplemento('hombro', p, 14)).toBeNull()
    expect(construirComplemento('arc', p, 20)!.minutos).toBe(15)
    expect(construirComplemento('arc', p, 12)!.minutos).toBe(10)
    expect(construirComplemento('arc', p, 9)).toBeNull()
    expect(construirComplemento('tecnica', p, 30)!.minutos).toBe(30)
    expect(construirComplemento('tecnica', p, 29)).toBeNull()
  })
  it('la técnica de complemento respeta la compañía: sin compañero nunca hay cuerda', () => {
    const solo = peticion({ contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 120 } })
    expect(construirComplemento('tecnica', solo, 30)!.ejercicios[0]!.nombre).not.toMatch(/con cuerda/)
    expect(construirComplemento('tecnica', p, 30)!.ejercicios[0]!.nombre).toMatch(/con cuerda/)
  })
  it('cada complemento trae su explicación con parámetros', () => {
    for (const t of ['hombro', 'arc', 'tecnica'] as const) {
      expect(construirComplemento(t, p, 60)!.explicacion.parametros.length).toBeGreaterThan(0)
    }
  })
})

describe('multipresa: una sola subida cada vez (P-11)', () => {
  const base = () => peticion({ evaluacion, contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 120 } })
  const bloquesYCarga = (n: number) => {
    const plan = construirSesion('multipresa-resistencia', { ...base(), historial: multipresasPrevias(n) })!
    return {
      bloques: plan.bloques.filter((b) => b.nombre.startsWith('Bloque de repeaters')).length,
      kg: plan.bloques[1]!.ejercicios[0]!.cargaKg,
    }
  }
  it('0-3 sesiones: 1 bloque al 70 %; 4-7: 2 bloques al 70 %; 8 o más: 2 bloques al 80 %', () => {
    expect(bloquesYCarga(3)).toEqual({ bloques: 1, kg: 0 })
    expect(bloquesYCarga(4)).toEqual({ bloques: 2, kg: 0 })
    expect(bloquesYCarga(7)).toEqual({ bloques: 2, kg: 0 })
    expect(bloquesYCarga(8)).toEqual({ bloques: 2, kg: 10 })
  })
  it('las multipresas futuras ya planificadas no cuentan para la progresión', () => {
    const futuras = Array.from({ length: 8 }, (_, i) =>
      ses(`f${i}`, `2026-11-${String(1 + i * 3).padStart(2, '0')}`, 18, { tipo: 'multipresa-resistencia' }),
    )
    const plan = construirSesion('multipresa-resistencia', { ...base(), historial: futuras })!
    expect(plan.bloques.filter((b) => b.nombre.startsWith('Bloque de repeaters')).length).toBe(1)
  })
  it('sin test vigente el texto dice que va por esfuerzo percibido, no por el test', () => {
    const plan = construirSesion('multipresa-resistencia', { ...base(), evaluacion: undefined })!
    expect(plan.bloques[1]!.ejercicios[0]!.notas).toMatch(/No hay test vigente/)
    expect(plan.bloques[1]!.ejercicios[0]!.notas).not.toMatch(/% de tu test/)
    expect(plan.bloques[1]!.explicacion.motivo).toMatch(/por esfuerzo percibido/)
    expect(plan.bloques[1]!.explicacion.parametros).toContain('P-11')
  })
})
