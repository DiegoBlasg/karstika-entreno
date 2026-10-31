import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import type { FilaRegistro } from './filas'
import { vistaPerfil } from './perfil-limitantes'

const registro = (id: string): FilaRegistro => ({ sesion_id: id, rpe: 8, duracion_min: 60, molestias: [], registrado_en: '2026-11-03 20:00:00+00' })

describe('vistaPerfil', () => {
  it('sin datos: orden general, sin fortaleza, aviso de cómo llenarlo y lo que haría el ciclo 2', () => {
    const v = vistaPerfil(datosVacios(), '2026-11-10')!
    expect(v.limita).toEqual({ cualidad: 'fuerza-dedos', origen: 'Orden general de los estudios: aún no hay datos tuyos' })
    expect(v.fuerte).toBeNull()
    expect(v.sinDatos).toBe(true)
    expect(v.plan).toMatch(/^Si sigue así, en el ciclo 2 \(desde el .+\): 10 semanas de fuerza y 4 de resistencia\.$/)
  })
  it('con 6 respuestas de miedo: limita la cabeza, según tus respuestas', () => {
    const sesiones = [3, 4, 5, 6, 7, 8].map((n) => sesionFila(uuid(n), `2026-11-0${n}`))
    const d = datosVacios({ sesiones, registros: sesiones.map((s) => ({ ...registro(s.id), freno: 'cabeza' as const })) })
    const v = vistaPerfil(d, '2026-11-10')!
    expect(v.limita).toEqual({ cualidad: 'cabeza', origen: 'Según lo que respondes al terminar' })
    expect(v.sinDatos).toBe(false)
    expect(v.plan).toMatch(/8 semanas de fuerza y 6 de resistencia\.$/)
  })
  it('después del lunes del ciclo 2, el reparto es el fijado', () => {
    expect(vistaPerfil(datosVacios(), '2027-05-10')!.plan).toBe('El ciclo 2 lleva 10 semanas de fuerza y 4 de resistencia.')
  })
})
