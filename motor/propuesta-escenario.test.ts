import { describe, expect, it } from 'vitest'
import { BASE_OCTUBRE, perfilNovel, ses } from './_fabrica'
import { FASE_BASE, FASE_FUERZA, proponerSesion } from './index'
import type { Peticion } from './index'

// El usuario: 6b, menos de 2 años. Martes con amigos (vías con cuerda), jueves solo (bloque, autoasegurada, board).
const martesContexto = { compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120 } as const
const juevesContexto = { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 120 } as const
const base = (extra: Partial<Peticion>): Peticion => ({
  fecha: '2026-10-27', horaInicio: 19, contexto: martesContexto, perfil: perfilNovel,
  historial: [], fase: FASE_BASE, ...extra,
})

describe('escenario real: primeras semanas', () => {
  it('martes con gente: vías con cuerda a tu límite, con hombro al final', () => {
    const r = proponerSesion(base({}))
    expect(r.principal!.sesion.tipo).toBe('via-cuerda-limite')
    expect(r.principal!.bloques[2]!.ejercicios[0]!.nombre).toMatch(/con cuerda/)
    expect(r.principal!.sesion.incluye).toEqual(['hombro'])
  })
  it('jueves solo tras el martes: bloque al límite, sin nada de cuerda', () => {
    const martes = ses('martes', '2026-10-27', 19, { tipo: 'via-cuerda-limite', duracionMin: 100, incluye: ['hombro'] })
    const r = proponerSesion(base({ fecha: '2026-10-29', contexto: juevesContexto, historial: [martes] }))
    expect(r.principal!.sesion.tipo).toBe('bloque-limite')
    for (const b of r.principal!.bloques) for (const e of b.ejercicios) expect(e.nombre).not.toMatch(/con cuerda/)
  })
  it('antes de 28 días de base nunca se ofrece el test máximo', () => {
    const primera = ses('p', '2026-10-06', 19, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 })
    const r = proponerSesion(base({ historial: [primera] }))
    expect([r.principal, ...r.alternativas].map((x) => x!.sesion.tipo)).not.toContain('evaluacion-dedos')
  })
  it('a los 28 días de base, con al menos 6 sesiones, el test de dedos pasa a ser la principal', () => {
    const primera = ses('p', '2026-09-29', 19, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 })
    const r = proponerSesion(base({ historial: [primera, ...BASE_OCTUBRE] }))
    expect(r.principal!.sesion.tipo).toBe('evaluacion-dedos')
    expect(r.principal!.bloques[2]!.ejercicios[0]).toMatchObject({ series: 3, trabajoS: 10, descansoSeriesS: 180 })
  })
})

describe('escenario real: fase de fuerza con el test hecho (jueves solo: día de multipresa)', () => {
  const primera = ses('p', '2026-09-01', 19, { tipo: 'arc', intensidad: 'suave', duracionMin: 50 })
  const evaluacion = { fecha: '2026-10-13', pesoCorporalKg: 72, lastreKg: 28 }
  const fechasMp = ['2026-09-08', '2026-09-10', '2026-09-15', '2026-09-17', '2026-09-22', '2026-09-24', '2026-09-29', '2026-10-01']
  const multipresas = fechasMp.map((f, i) =>
    ses(`mp${i}`, f, 19, { tipo: 'multipresa-resistencia', duracionMin: 30, detalle: { regletaMm: 20, agarre: 'semiarqueado' } }),
  )

  it('las primeras semanas la multipresa va al 70 % del test: con 100 % del peso en el test, 2 kg de descarga', () => {
    const r = proponerSesion(base({ fase: FASE_FUERZA, contexto: juevesContexto, historial: [primera], evaluacion }))
    expect(r.principal!.sesion.tipo).toBe('multipresa-resistencia')
    const e = r.principal!.bloques[1]!.ejercicios[0]!
    expect(e.cargaKg).toBe(-2) // 0,7 × 100 − 72
    expect(e.cargaTexto).toBe('descarga de 2 kg')
    expect(e.series).toBe(6)
    expect(e.repeticiones).toBe(7)
  })
  // Una sesión de técnica después de las multipresas, para que la última sesión no sea multipresa
  // (si lo fuera, la penalización por repetir tipo la dejaría por detrás de la vía al límite).
  const tecnica = ses('t', '2026-10-20', 19, { tipo: 'tecnica', intensidad: 'suave', duracionMin: 45 })
  const repeaters = (r: ReturnType<typeof proponerSesion>) =>
    r.principal!.bloques.filter((b) => b.nombre.startsWith('Bloque de repeaters'))

  it('tras 4 sesiones sube primero el volumen (2 bloques) y mantiene la carga al 70 %', () => {
    const r = proponerSesion(base({ fase: FASE_FUERZA, contexto: juevesContexto, historial: [primera, ...multipresas.slice(0, 4), tecnica], evaluacion }))
    expect(r.principal!.sesion.tipo).toBe('multipresa-resistencia')
    expect(repeaters(r)).toHaveLength(2)
    expect(repeaters(r)[0]!.ejercicios[0]!.cargaKg).toBe(-2)
  })
  it('tras 8 sesiones sube la carga al tope del 80 %: 8 kg de lastre', () => {
    const r = proponerSesion(base({ fase: FASE_FUERZA, contexto: juevesContexto, historial: [primera, ...multipresas, tecnica], evaluacion }))
    expect(r.principal!.sesion.tipo).toBe('multipresa-resistencia')
    expect(repeaters(r)).toHaveLength(2)
    expect(repeaters(r)[0]!.ejercicios[0]!.cargaKg).toBe(8) // 0,8 × 100 − 72
  })
})
