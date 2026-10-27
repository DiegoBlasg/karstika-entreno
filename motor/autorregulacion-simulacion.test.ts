import { describe, expect, it } from 'vitest'
import {
  diaNumero, elegirConsejos, esCargaAlta, faseEnFecha, fechaDesdeDia, objetivoRpe, planificarTemporada, proponerSesion,
  validarContexto, validarSesion,
} from './index'
import type { Chequeo, Contexto, EvaluacionDedos, Molestia, Propuesta, RegistroSesion, Sesion, SesionPlan } from './index'

// Base y primeras 8 semanas de fuerza con la semana real del usuario (martes con gente, jueves solo, sábado en casa),
// con un chequeo en cada petición y un registro de cada sesión hecha. Guion:
// - fuerza, semana 3: el jueves acaba con dolor 2 en dedos; el sábado sigue en 2; el martes siguiente, 0.
// - fuerza, semana 6: tres chequeos bajos seguidos (martes, jueves y sábado).
const perfil = { pesoKg: 72, anosEscalando: 1.5, lesiones: [] }
const temporada = planificarTemporada('2026-11-02', '2027-10-04')
const inicioFuerza = temporada.semanas.findIndex((s) => s.faseId === 'fuerza')
const semanas = temporada.semanas.slice(0, inicioFuerza + 8)
const patron: { off: number; ctx: Contexto; hora: number }[] = [
  { off: 1, ctx: { compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120 }, hora: 19 },
  { off: 3, ctx: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 90 }, hora: 19 },
  { off: 5, ctx: { compania: 'solo', lugar: 'casa', minutosDisponibles: 60 }, hora: 10 },
]
const lunesFuerza = (n: number) => diaNumero(temporada.semanas[inicioFuerza + n - 1]!.lunes)
const JUEVES_MOLESTIA = fechaDesdeDia(lunesFuerza(3) + 3)
const SABADO_MOLESTIA = fechaDesdeDia(lunesFuerza(3) + 5)
const MARTES_VERDE = fechaDesdeDia(lunesFuerza(4) + 1)
const BAJOS = new Set([1, 3, 5].map((o) => fechaDesdeDia(lunesFuerza(6) + o)))
const AL_LIMITE = ['bloque-limite', 'via-cuerda-limite', 'pegues-proyecto', 'board']

interface Paso { fecha: string; r: Propuesta; historial: Sesion[]; ctx: Contexto }
const pasos: Paso[] = []
const historial: Sesion[] = []
const registros: RegistroSesion[] = []
const chequeos: Chequeo[] = []
const mostrados: { id: string; fecha: string }[] = []
let evaluacion: EvaluacionDedos | undefined
for (const s of semanas) {
  for (const x of patron) {
    const fecha = fechaDesdeDia(diaNumero(s.lunes) + x.off)
    const molestiaHoy: Molestia[] = fecha === SABADO_MOLESTIA ? [{ zona: 'dedos', dolor: 2 }] : []
    chequeos.push({ fecha, sueno: BAJOS.has(fecha) ? 2 : 4, fatiga: BAJOS.has(fecha) ? 2 : 4, ganas: BAJOS.has(fecha) ? 2 : 4, molestias: molestiaHoy })
    const peticion = {
      fecha, horaInicio: x.hora, contexto: x.ctx, perfil, historial: [...historial], fase: faseEnFecha(temporada, fecha),
      seguimiento: { registros: [...registros], chequeos: [...chequeos], altas: [] },
      consejosMostrados: [...mostrados],
      ...(evaluacion ? { evaluacion } : {}),
    }
    const r = proponerSesion(peticion)
    for (const c of elegirConsejos(peticion, r)) mostrados.push({ id: c.id, fecha })
    pasos.push({ fecha, r, historial: [...historial], ctx: x.ctx })
    if (!r.principal) continue
    const sesion: Sesion = { ...r.principal.sesion, id: `h${historial.length}` }
    historial.push(sesion)
    const objetivo = objetivoRpe(sesion)
    registros.push({
      sesionId: sesion.id, fecha, rpe: objetivo === undefined ? 9 : objetivo - 1, duracionMin: sesion.duracionMin,
      molestias: fecha === JUEVES_MOLESTIA ? [{ zona: 'dedos', dolor: 2 }] : [],
    })
    if (sesion.tipo === 'evaluacion-dedos') evaluacion = { fecha, pesoCorporalKg: 72, lastreKg: 15 }
  }
}

const planes = (r: Propuesta): SesionPlan[] => [r.principal, ...r.alternativas].filter((x): x is SesionPlan => x !== null)
const repeaters = (plan: SesionPlan) => {
  const bloques = plan.bloques.filter((b) => b.nombre.startsWith('Bloque de repeaters'))
  return `${bloques.length}x${/(\d+) %/.exec(bloques[0]!.ejercicios[0]!.notas!)?.[1] ?? '?'}`
}

describe('simulación con seguimiento: base y 8 semanas de fuerza', () => {
  it('ninguna propuesta viola contexto ni seguridad', () => {
    for (const paso of pasos) {
      for (const plan of planes(paso.r)) {
        expect(validarSesion(plan.sesion, paso.historial, perfil), `${paso.fecha} ${plan.sesion.tipo}`).toEqual([])
        expect(validarContexto(plan.sesion, paso.ctx), `${paso.fecha} ${plan.sesion.tipo}`).toEqual([])
      }
    }
  })
  it('mientras los dedos están en ámbar no se propone nada de carga alta, y el martes siguiente sí', () => {
    const ambar = pasos.filter((p) => p.fecha === SABADO_MOLESTIA)
    expect(ambar).toHaveLength(1)
    expect(ambar[0]!.r.estado?.zonas.dedos).toBe('ambar')
    for (const plan of planes(ambar[0]!.r)) expect(esCargaAlta(plan.sesion), plan.sesion.tipo).toBe(false)
    const verde = pasos.find((p) => p.fecha === MARTES_VERDE)!
    expect(verde.r.estado?.zonas.dedos).toBe('verde')
    expect(esCargaAlta(verde.r.principal!.sesion)).toBe(true)
  })
  it('la multipresa progresa y, tras el ámbar, vuelve un escalón atrás antes de volver a subir', () => {
    // Antes: 4 sesiones válidas de 1 bloque y la quinta (la del jueves con molestia) con 2 bloques. Después, la
    // primera multipresa fuera de descarga vuelve a 1 bloque por P-46: sin la molestia habría 6 válidas (2 bloques).
    const multipresas = pasos.filter((p) => p.r.principal?.sesion.tipo === 'multipresa-resistencia')
    expect(repeaters(multipresas.find((p) => p.fecha === JUEVES_MOLESTIA)!.r.principal!)).toBe('2x70')
    const tras = multipresas.find((p) => p.fecha > SABADO_MOLESTIA && !p.r.principal!.explicaciones[0]!.motivo.includes('(descarga)'))!
    expect(repeaters(tras.r.principal!)).toBe('1x70')
    expect(tras.r.principal!.bloques.find((b) => b.nombre.startsWith('Bloque de repeaters'))!.explicacion.parametros).toContain('P-46')
  })
  it('los tres chequeos bajos adelantan 7 días de descarga, sin nada al límite', () => {
    const tercero = [...BAJOS].sort().at(-1)!
    const enDescarga = pasos.filter((p) => p.r.estado?.descargaAdelantada?.motivo === 'bienestar')
    expect(enDescarga[0]!.fecha).toBe(tercero)
    expect(enDescarga.at(-1)!.r.estado!.descargaAdelantada!.hasta).toBe(fechaDesdeDia(diaNumero(tercero) + 6))
    for (const p of enDescarga) for (const plan of planes(p.r)) expect(AL_LIMITE, `${p.fecha} ${plan.sesion.tipo}`).not.toContain(plan.sesion.tipo)
  })
  it('con el chequeo bajo no hay dominadas', () => {
    for (const p of pasos.filter((x) => BAJOS.has(x.fecha))) {
      for (const plan of planes(p.r)) expect(plan.sesion.incluye ?? [], p.fecha).not.toContain('dominadas')
    }
  })
  it('cada sesión lleva como mucho 2 consejos y ninguno general se repite en 7 días', () => {
    const porFecha = new Map<string, number>()
    for (const m of mostrados) porFecha.set(m.fecha, (porFecha.get(m.fecha) ?? 0) + 1)
    for (const n of porFecha.values()) expect(n).toBeLessThanOrEqual(2)
    const seguridad = new Set(['fisio-rojo', 'vigilar-ambar'])
    for (const [i, m] of mostrados.entries()) {
      if (seguridad.has(m.id)) continue
      const previo = mostrados.slice(0, i).filter((x) => x.id === m.id).at(-1)
      if (previo) expect(diaNumero(m.fecha) - diaNumero(previo.fecha), m.id).toBeGreaterThanOrEqual(7)
    }
  })
})
