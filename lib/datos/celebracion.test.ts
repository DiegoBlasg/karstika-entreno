import { describe, expect, it } from 'vitest'
import { datosVacios, sesionFila, uuid } from './_fabrica'
import { resumenRegistro, resumenReunion, textoEsfuerzo } from './celebracion'
import type { FilaEvaluacion, FilaRegistro } from './filas'

const registro = (id: string, rpe = 4): FilaRegistro => ({ sesion_id: id, rpe, duracion_min: 60, molestias: [], registrado_en: '2026-11-03 20:00:00+00' })

// Temporada de prueba: empieza el lunes 2026-11-02 (base). Objetivos de RPE (P-63): suave 5, alta 8.
describe('resumenRegistro', () => {
  const HOY = '2026-11-03'

  it('sesión inexistente o sin registrar → null', () => {
    const d = datosVacios({ sesiones: [sesionFila(uuid(1), '2026-11-03')] })
    expect(resumenRegistro(d, uuid(9), HOY)).toBeNull()
    expect(resumenRegistro(d, uuid(1), HOY)).toBeNull()
  })

  it('devuelve la sesión, el registro y el largo de la fecha de la sesión', () => {
    const d = datosVacios({ sesiones: [sesionFila(uuid(1), '2026-11-03')], registros: [registro(uuid(1), 4)] })
    const r = resumenRegistro(d, uuid(1), HOY)!
    expect(r.sesion.id).toBe(uuid(1))
    expect(r.registro.rpe).toBe(4)
    expect(r.largo).toMatchObject({ largo: 1, faseId: 'base', semanaDeFase: 1, sesionesHechas: 1 })
  })

  describe('esfuerzo (lo que ha entendido el motor)', () => {
    const con = (extra: Parameters<typeof sesionFila>[2], rpe: number, reg: Partial<FilaRegistro> = {}) =>
      resumenRegistro(
        datosVacios({ sesiones: [sesionFila(uuid(1), '2026-11-03', extra)], registros: [{ ...registro(uuid(1), rpe), ...reg }] }), uuid(1), HOY,
      )!.esfuerzo

    it('lo previsto: entre objetivo − 2 y el objetivo; cuenta y la carga sigue su curso', () => {
      const e = con({ tipo: 'tecnica', intensidad: 'suave' }, 4)
      expect(e).toEqual({ rpe: 4, objetivo: 5, valoracion: 'previsto', veredicto: 'cuenta', sinSubida: false })
      expect(textoEsfuerzo(e)).toBe('Esfuerzo 4/10: lo previsto (máximo 5). La carga sigue su curso.')
      expect(con({ tipo: 'tecnica', intensidad: 'suave' }, 3).valoracion).toBe('previsto')
      expect(con({ tipo: 'multipresa-resistencia', intensidad: 'alta' }, 8).valoracion).toBe('previsto')
      expect(con({ tipo: 'multipresa-resistencia', intensidad: 'alta' }, 6).valoracion).toBe('previsto')
    })

    it('más duro: por encima del objetivo; no cuenta y la carga no sube en la próxima', () => {
      const e = con({ tipo: 'tecnica', intensidad: 'suave' }, 7)
      expect(e).toMatchObject({ rpe: 7, objetivo: 5, valoracion: 'mas-duro', veredicto: 'por-encima', sinSubida: true })
      expect(textoEsfuerzo(e)).toBe('Esfuerzo 7/10: más duro de lo previsto (máximo 5). Esta sesión no cuenta para subir la carga y el entrenador no la subirá en la próxima.')
      expect(con({ tipo: 'multipresa-resistencia', intensidad: 'alta' }, 9).valoracion).toBe('mas-duro')
    })

    it('RPE normal pero más minutos de los previstos: el motor la ve por encima (RPE × minutos)', () => {
      const e = con({ tipo: 'tecnica', intensidad: 'suave', duracionMin: 60 }, 5, { duracion_min: 90 })
      expect(e).toMatchObject({ valoracion: 'previsto', veredicto: 'por-encima', sinSubida: true })
      const t = textoEsfuerzo(e)
      expect(t).not.toContain('La carga sigue su curso')
      expect(t).toBe('Esfuerzo 5/10: lo previsto (máximo 5). Pero con los minutos que duró, la carga pasó de la prevista. Esta sesión no cuenta para subir la carga y el entrenador no la subirá en la próxima.')
    })

    it('incompleta (menos minutos de los previstos): no cuenta para subir la carga', () => {
      const e = con({ tipo: 'tecnica', intensidad: 'suave', duracionMin: 60 }, 4, { duracion_min: 30 })
      expect(e).toMatchObject({ valoracion: 'previsto', veredicto: 'incompleta' })
      const t = textoEsfuerzo(e)
      expect(t).not.toContain('La carga sigue su curso')
      expect(t).toBe('Esfuerzo 4/10: lo previsto (máximo 5). Quedó por debajo de los minutos previstos: no cuenta para subir la carga.')
    })

    it('con molestia en dedos (P-46): no cuenta para subir la carga', () => {
      const e = con({ tipo: 'tecnica', intensidad: 'suave' }, 4, { molestias: [{ zona: 'dedos', dolor: 3 }] })
      expect(e).toMatchObject({ valoracion: 'previsto', veredicto: 'molestia', sinSubida: true })
      const t = textoEsfuerzo(e)
      expect(t).not.toContain('La carga sigue su curso')
      expect(t).toBe('Esfuerzo 4/10: lo previsto (máximo 5). Con molestias en dedos o muñeca no cuenta para subir la carga.')
    })

    it('cuenta, pero otra zona en ámbar frena la subida: no dice que la carga sigue su curso', () => {
      const e = con({ tipo: 'tecnica', intensidad: 'suave' }, 4, { molestias: [{ zona: 'hombro', dolor: 3 }] })
      expect(e).toMatchObject({ veredicto: 'cuenta', sinSubida: true })
      expect(textoEsfuerzo(e)).toBe('Esfuerzo 4/10: lo previsto (máximo 5). Cuenta, pero de momento la carga no sube (por una molestia o por otra sesión por encima de lo previsto).')
    })

    it('más suave: más de 2 por debajo del objetivo', () => {
      const e = con({ tipo: 'multipresa-resistencia', intensidad: 'alta' }, 5)
      expect(e).toMatchObject({ rpe: 5, objetivo: 8, valoracion: 'mas-suave', veredicto: 'cuenta' })
      expect(textoEsfuerzo(e)).toBe('Esfuerzo 5/10: más suave de lo previsto. La carga sigue su curso.')
      expect(con({ tipo: 'tecnica', intensidad: 'suave' }, 2).valoracion).toBe('mas-suave')
    })

    it('sin objetivo (test de dedos)', () => {
      const e = con({ tipo: 'evaluacion-dedos', intensidad: 'alta' }, 9)
      expect(e).toMatchObject({ rpe: 9, objetivo: null, valoracion: 'sin-objetivo' })
      expect(textoEsfuerzo(e)).toBe('Esfuerzo 9/10.')
    })
  })

  describe('siguiente', () => {
    it('la primera sin registrar posterior: el mismo día más tarde cuenta; anteriores y registradas no', () => {
      const d = datosVacios({
        sesiones: [
          sesionFila(uuid(1), '2026-11-03', { horaInicio: 18 }),  // la registrada ahora
          sesionFila(uuid(2), '2026-11-02'),                      // anterior, sin registrar
          sesionFila(uuid(3), '2026-11-03', { horaInicio: 12 }),  // mismo día, antes
          sesionFila(uuid(4), '2026-11-04'),                      // posterior pero registrada
          sesionFila(uuid(5), '2026-11-06'),                      // más tarde
          sesionFila(uuid(6), '2026-11-03', { horaInicio: 20 }),  // mismo día, más tarde: la siguiente
        ],
        registros: [registro(uuid(1)), registro(uuid(4))],
      })
      expect(resumenRegistro(d, uuid(1), HOY)!.siguiente?.id).toBe(uuid(6))
    })

    it('al registrar tarde una sesión, nunca propone una ya pasada', () => {
      const d = datosVacios({
        sesiones: [sesionFila(uuid(1), '2026-11-03'), sesionFila(uuid(2), '2026-11-05'), sesionFila(uuid(3), '2026-11-12')],
        registros: [registro(uuid(1))],
      })
      expect(resumenRegistro(d, uuid(1), '2026-11-10')!.siguiente?.id).toBe(uuid(3))
    })

    it('null si no queda ninguna', () => {
      const d = datosVacios({ sesiones: [sesionFila(uuid(1), '2026-11-03')], registros: [registro(uuid(1))] })
      expect(resumenRegistro(d, uuid(1), HOY)!.siguiente).toBeNull()
    })
  })

  describe('logrosNuevos (solo los que este registro hace conseguir hoy; nunca uno que luego pueda desaparecer)', () => {
    const titulos = (d: ReturnType<typeof datosVacios>, id: string, hoy: string) => resumenRegistro(d, id, hoy)!.logrosNuevos.map((l) => l.titulo)

    it('registrar las sesiones de la semana en curso no anuncia nada de semanas (aún no ha terminado)', () => {
      const sesiones = [sesionFila(uuid(1), '2026-11-03'), sesionFila(uuid(2), '2026-11-05')]
      expect(titulos(datosVacios({ sesiones, registros: [registro(uuid(1))] }), uuid(1), '2026-11-03')).toEqual([])
      expect(titulos(datosVacios({ sesiones, registros: [registro(uuid(1)), registro(uuid(2))] }), uuid(2), '2026-11-05')).toEqual([])
    })

    it('registrar tarde la sesión que completa una semana pasada anuncia «Primera semana cumplida»', () => {
      const sesiones = [sesionFila(uuid(1), '2026-11-03'), sesionFila(uuid(2), '2026-11-05')]
      const d = datosVacios({ sesiones, registros: [registro(uuid(1)), registro(uuid(2))] })
      expect(titulos(d, uuid(2), '2026-11-10')).toEqual(['Primera semana cumplida'])
    })

    it('la semana anterior ya cumplida no se anuncia al registrar en la siguiente (no depende de este registro)', () => {
      const sesiones = [sesionFila(uuid(1), '2026-11-03'), sesionFila(uuid(2), '2026-11-10')]
      const d = datosVacios({ sesiones, registros: [registro(uuid(1)), registro(uuid(2))] })
      expect(titulos(d, uuid(2), '2026-11-10')).toEqual([])
    })
  })

  describe('conTest', () => {
    const ev = (fecha: string): FilaEvaluacion => ({ id: uuid(100), fecha, peso_corporal_kg: 70, lastre_kg: 10, resistencia_s: null, tecnica: null })
    const sesiones = [sesionFila(uuid(1), '2026-11-03', { tipo: 'evaluacion-dedos', intensidad: 'alta' })]

    it('el id de la evaluación de ese día si la sesión es el test de dedos', () => {
      const d = datosVacios({ sesiones, registros: [registro(uuid(1), 9)], evaluaciones: [ev('2026-11-03')] })
      expect(resumenRegistro(d, uuid(1), HOY)!.conTest).toBe(uuid(100))
    })

    it('null sin evaluación de ese día o si no es un test', () => {
      expect(resumenRegistro(datosVacios({ sesiones, registros: [registro(uuid(1), 9)], evaluaciones: [ev('2026-11-04')] }), uuid(1), HOY)!.conTest).toBeNull()
      const otra = datosVacios({ sesiones: [sesionFila(uuid(1), '2026-11-03')], registros: [registro(uuid(1))], evaluaciones: [ev('2026-11-03')] })
      expect(resumenRegistro(otra, uuid(1), HOY)!.conTest).toBeNull()
    })
  })
})

describe('resumenReunion', () => {
  const ev = (n: number, fecha: string, lastre: number, peso = 70): FilaEvaluacion =>
    ({ id: uuid(200 + n), fecha, peso_corporal_kg: peso, lastre_kg: lastre, resistencia_s: null, tecnica: null })
  const hoy = '2027-02-01'

  it('id inexistente → null', () => {
    expect(resumenReunion(datosVacios({ evaluaciones: [ev(1, '2026-11-10', 10)] }), uuid(999), hoy)).toBeNull()
  })

  it('primer test → primera, sin anterior ni diferencia', () => {
    const r = resumenReunion(datosVacios({ evaluaciones: [ev(1, '2026-11-10', 10)] }), uuid(201), hoy)!
    expect(r.mejora).toBe('primera')
    expect(r.anterior).toBeNull()
    expect(r.diferencia).toBeNull()
    expect(r.test).toMatchObject({ id: uuid(201), fecha: '2026-11-10', lastreKg: 10 })
    expect(r.logrosNuevos.map((l) => l.id)).not.toContain('record-fuerza')
  })

  it('segundo test mejor → sube, con la diferencia exacta y el récord de fuerza', () => {
    const d = datosVacios({ evaluaciones: [ev(1, '2026-11-10', 10), ev(2, '2026-12-10', 15)] })
    const r = resumenReunion(d, uuid(202), hoy)!
    expect(r.mejora).toBe('sube')
    expect(r.anterior).toMatchObject({ fecha: '2026-11-10', lastreKg: 10 })
    expect(r.diferencia).toBeCloseTo((85 / 70 - 80 / 70) * 100, 5)
    expect(r.logrosNuevos.map((l) => l.id)).toContain('record-fuerza')
  })

  it('el récord sigue siendo de ese test aunque haya otros después', () => {
    const d = datosVacios({ evaluaciones: [ev(1, '2026-11-10', 10), ev(2, '2026-12-10', 15), ev(3, '2027-01-10', 12)] })
    expect(resumenReunion(d, uuid(202), hoy)!.logrosNuevos.map((l) => l.id)).toContain('record-fuerza')
    const ultimo = resumenReunion(d, uuid(203), hoy)!
    expect(ultimo.mejora).toBe('baja')
    expect(ultimo.anterior).toMatchObject({ lastreKg: 15 })
  })

  it('peor → baja, sin récord', () => {
    const d = datosVacios({ evaluaciones: [ev(1, '2026-11-10', 15), ev(2, '2026-12-10', 10)] })
    const r = resumenReunion(d, uuid(202), hoy)!
    expect(r.mejora).toBe('baja')
    expect(r.diferencia!).toBeLessThan(-1)
    expect(r.logrosNuevos.map((l) => l.id)).not.toContain('record-fuerza')
  })

  it('casi igual (menos de 1 punto) → igual', () => {
    const d = datosVacios({ evaluaciones: [ev(1, '2026-11-10', 10), ev(2, '2026-12-10', 10.5)] })
    const r = resumenReunion(d, uuid(202), hoy)!
    expect(r.mejora).toBe('igual')
    expect(r.logrosNuevos.map((l) => l.id)).not.toContain('record-fuerza') // «Te mantienes» sin «Récord»
  })

  it('un test de la semana de test de 2027-01-18: es esa reunión y el siguiente largo es Resistencia de fuerza', () => {
    const d = datosVacios({ evaluaciones: [ev(1, '2027-01-20', 10)] })
    const r = resumenReunion(d, uuid(201), hoy)!
    expect(r.reunion).toEqual({ numero: 1, lunes: '2027-01-18', fase: 'Fuerza de dedos' })
    expect(r.siguienteLargo).toMatchObject({ numero: 3, fase: 'Resistencia de fuerza' })
    expect(r.siguienteLargo!.semanas).toBeGreaterThan(0)
    expect(r.siguienteLargo!.objetivo).not.toBe('')
  })

  it('un test que no es de ninguna reunión: reunion null', () => {
    const r = resumenReunion(datosVacios({ evaluaciones: [ev(1, '2026-11-10', 10)] }), uuid(201), hoy)!
    expect(r.reunion).toBeNull()
  })

  it('repeaters con el último test vigente', () => {
    const r = resumenReunion(datosVacios({ evaluaciones: [ev(1, '2027-01-20', 10)] }), uuid(201), '2027-01-21')!
    expect(r.repeaters!.lastreMaximo).toBeGreaterThan(r.repeaters!.lastreInicial)
  })
})
