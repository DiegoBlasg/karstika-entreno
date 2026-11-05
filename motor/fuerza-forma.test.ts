import { describe, expect, it } from 'vitest'
import { peticion, ses } from './_fabrica'
import { elegirConsejos } from './consejos'
import { descargar, FASE_BASE } from './fases'
import { construirSesion } from './plantillas'
import { proponerSesion } from './propuesta'
import { esCargaAlta } from './seguridad'

const casa = (extra: Parameters<typeof peticion>[0] = {}) =>
  peticion({ fecha: '2026-10-28', horaInicio: 10, contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 60, multipresaEnCasa: false }, objetivoEstetico: true, ...extra })
const tipos = (r: ReturnType<typeof proponerSesion>) => [r.principal, ...r.alternativas].map((o) => o?.sesion.tipo)

describe('plantilla de Fuerza y forma (P-77)', () => {
  const plan = construirSesion('fuerza-forma', casa())!
  it('35 min, suave para los dedos: calentamiento, empuje y abdominales', () => {
    expect(plan.sesion).toMatchObject({ tipo: 'fuerza-forma', intensidad: 'suave', duracionMin: 35 })
    expect(esCargaAlta(plan.sesion)).toBe(false)
    expect(plan.bloques.map((b) => [b.nombre, b.minutos])).toEqual([['Calentamiento', 5], ['Empuje', 15], ['Abdominales y core', 15]])
  })
  it('3 series de 6-15 a 1-3 del fallo; sin tirón ni piernas', () => {
    const ejercicios = plan.bloques.flatMap((b) => b.ejercicios)
    expect(ejercicios.find((e) => e.ficha === 'flexiones-progresion')).toMatchObject({ series: 3 })
    expect(ejercicios.find((e) => e.ficha === 'flexiones-progresion')!.cargaTexto).toMatch(/6-15 repeticiones, a 1-3 del fallo/)
    const nombres = ejercicios.map((e) => e.nombre).join(' ')
    expect(nombres).not.toMatch(/dominada|remo|sentadilla|zancada/i)
  })
  it('no cabe en menos de 35 min', () => {
    expect(construirSesion('fuerza-forma', casa({ contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 30 } }))).toBeNull()
  })
})

describe('plantilla de cardio suave (P-78)', () => {
  it('45 min con 45 o más, 30 con menos, nunca con menos de 30', () => {
    expect(construirSesion('cardio', casa())!.sesion).toMatchObject({ tipo: 'cardio', intensidad: 'suave', duracionMin: 45 })
    expect(construirSesion('cardio', casa({ contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 40 } }))!.sesion.duracionMin).toBe(30)
    expect(construirSesion('cardio', casa({ contexto: { compania: 'solo', lugar: 'casa', minutosDisponibles: 25 } }))).toBeNull()
  })
})

describe('cuándo se propone Fuerza y forma', () => {
  it('con el objetivo, en casa, va de principal en lugar de hombro, dominadas o core', () => {
    const r = proponerSesion(casa())
    expect(r.principal?.sesion.tipo).toBe('fuerza-forma')
    expect(r.alternativas.length).toBeLessThanOrEqual(2)
    expect(tipos(proponerSesion(casa({ objetivoEstetico: false })))).not.toContain('fuerza-forma')
  })
  it('como mucho 2 en la semana natural, contando las planificadas', () => {
    const ff = (id: string, fecha: string) => ses(id, fecha, 10, { tipo: 'fuerza-forma', intensidad: 'suave', duracionMin: 35 })
    expect(tipos(proponerSesion(casa({ historial: [ff('a', '2026-10-26')] })))).toContain('fuerza-forma')
    expect(tipos(proponerSesion(casa({ historial: [ff('a', '2026-10-26'), ff('b', '2026-10-31')] })))).not.toContain('fuerza-forma')
  })
  it('no el mismo día ni el día antes de una sesión de carga alta', () => {
    const alta = (fecha: string) => ses('x', fecha, 19, { tipo: 'bloque-limite', intensidad: 'alta', duracionMin: 90 })
    expect(tipos(proponerSesion(casa({ historial: [alta('2026-10-29')] })))).not.toContain('fuerza-forma')
    expect(tipos(proponerSesion(casa({ historial: [alta('2026-10-28')], horaInicio: 8 })))).not.toContain('fuerza-forma')
  })
  it('no en descarga ni fuera de casa', () => {
    expect(tipos(proponerSesion(casa({ fase: descargar(FASE_BASE) })))).not.toContain('fuerza-forma')
    expect(tipos(proponerSesion(casa({ contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 90 } })))).not.toContain('fuerza-forma')
  })
  it('con el chequeo bajo no', () => {
    const seguimiento = { registros: [], chequeos: [{ fecha: '2026-10-28', sueno: 2, fatiga: 2, ganas: 2, molestias: [] }], altas: [] }
    expect(tipos(proponerSesion(casa({ seguimiento })))).not.toContain('fuerza-forma')
  })
})

describe('cuándo se propone el cardio suave', () => {
  const descanso = ses('d', '2026-10-27', 19, { tipo: 'bloque-limite', intensidad: 'alta', duracionMin: 90 })
  it('en un día de descanso, primera alternativa (en roca y solo: andar por el monte)', () => {
    const r = proponerSesion(casa({ objetivoEstetico: false, historial: [descanso], contexto: { compania: 'solo', lugar: 'roca', minutosDisponibles: 60 } }))
    expect(r.principal).toBeNull()
    expect(r.alternativas[0]?.sesion.tipo).toBe('cardio')
    expect(r.alternativas[0]?.explicaciones[0]?.regla).toBe('generador.cardio')
  })
  it('no si ya no quedaría ningún día libre en la semana', () => {
    const dias = ['2026-10-26', '2026-10-27', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'].map((f, i) =>
      ses(`s${i}`, f, 19, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 60 }))
    expect(tipos(proponerSesion(casa({ objetivoEstetico: false, historial: dias })))).not.toContain('cardio')
  })
})

describe('consejos con el objetivo estético', () => {
  it('el de definición sustituye al de «ningún objetivo de peso» y no da cifras de peso ni de calorías', () => {
    const p = casa()
    const r = proponerSesion(p)
    const textos = elegirConsejos(p, r).map((c) => c.texto).join(' ')
    const conObjetivo = elegirConsejos({ ...p, consejosMostrados: [] }, r)
    expect(conObjetivo.every((c) => c.id !== 'peso')).toBe(true)
    expect(textos).not.toMatch(/kcal|calor/i)
  })
})
