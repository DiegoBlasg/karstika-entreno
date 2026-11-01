import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import type { FilaEvaluacion, FilaRegistro } from './filas'
import { vistaPerfil } from './perfil-limitantes'

const registro = (id: string): FilaRegistro => ({ sesion_id: id, rpe: 8, duracion_min: 60, molestias: [], registrado_en: '2026-11-03 20:00:00+00' })
const conFrenos = (n: number, freno: FilaRegistro['freno']) => {
  const sesiones = Array.from({ length: n }, (_, i) => sesionFila(uuid(i + 1), `2026-11-0${i + 3}`))
  return datosVacios({ sesiones, registros: sesiones.map((s) => ({ ...registro(s.id), freno })) })
}

describe('vistaPerfil', () => {
  it('sin datos: orden general en neutro, sin fortaleza, pista para llenarlo y «si no cambia»', () => {
    const v = vistaPerfil(datosVacios(), '2026-11-10')!
    expect(v.limita).toEqual({ cualidad: 'fuerza-dedos', origen: 'Orden general de los estudios, no un diagnóstico tuyo', general: true })
    expect(v.fuerte).toBeNull()
    expect(v.pista?.startsWith('Responde «¿Qué te frenó hoy?»')).toBe(true)
    expect(v.plan).toMatch(/^Si no cambia, en el ciclo 2 \(desde el .+\): 10 semanas de fuerza y 4 de resistencia\.$/)
  })
  it('con 4 respuestas: dice cuántas lleva, no que no haya datos', () => {
    expect(vistaPerfil(conFrenos(4, 'cabeza'), '2026-11-10')!.pista).toBe('Tus respuestas aún no deciden: llevas 4 de 6 en las últimas 8 semanas.')
  })
  it('con 6 respuestas de miedo: limita la cabeza, según tus respuestas, sin pista y con su «¿Por qué?»', () => {
    const v = vistaPerfil(conFrenos(6, 'cabeza'), '2026-11-10')!
    expect(v.limita).toEqual({ cualidad: 'cabeza', origen: 'Según lo que respondes al terminar', general: false })
    expect(v.pista).toBeNull()
    expect(v.plan).toMatch(/^Si sigue así, .+8 semanas de fuerza y 6 de resistencia\.$/)
    expect(v.explicaciones.map((e) => e.regla)).toEqual(['diagnostico.limitantes', 'diagnostico.fortaleza'])
  })
  it('después del lunes del ciclo 2, dice a qué apuntó el reparto fijado', () => {
    expect(vistaPerfil(datosVacios(), '2027-05-10')!.plan)
      .toMatch(/^El ciclo 2 se fijó el .+ apuntando a la fuerza de dedos: 10 semanas de fuerza y 4 de resistencia\.$/)
  })
  it('un test apuntado después del lunes del ciclo 2 con fecha anterior no cambia el reparto fijado', () => {
    const ev = (n: number, fecha: string, lastre: number, resistencia: number, creada: string): FilaEvaluacion =>
      ({ id: uuid(100 + n), fecha, peso_corporal_kg: 70, lastre_kg: lastre, resistencia_s: null, colgado_30_s: resistencia, tecnica: null, creada_en: creada })
    // Fuerza sube y resistencia no: con los tres tests, el reparto sería 6 + 8 (resistencia).
    const antes = '2027-01-01 10:00:00+00'
    const tres = [ev(1, '2026-12-28', 0, 80, antes), ev(2, '2027-02-22', 10, 81, antes), ev(3, '2027-04-12', 14, 80, '2027-05-02 10:00:00.123456+00')]
    // El tercero se apuntó el 2 de mayo: el 19 de abril solo había dos tests y no había veredicto → 10 + 4.
    expect(vistaPerfil(datosVacios({ evaluaciones: tres }), '2027-05-10')!.plan).toMatch(/10 semanas de fuerza y 4 de resistencia/)
    const todosAntes = tres.map((e) => ({ ...e, creada_en: antes }))
    expect(vistaPerfil(datosVacios({ evaluaciones: todosAntes }), '2027-05-10')!.plan).toMatch(/6 semanas de fuerza y 8 de resistencia/)
  })
})
