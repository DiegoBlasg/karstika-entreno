import { describe, expect, it } from 'vitest'
import {
  diaNumero, esCargaAlta, esIntensaDedos, estadoAtleta, faseEnFecha, fechaDesdeDia, objetivoRpe, planificarTemporada, proponerSesion,
  validarSesion,
} from './index'
import { conDominadas } from './seguridad'
import type { Contexto, EvaluacionDedos, Hueco, RegistroSesion, Sesion, TipoSesion } from './index'

// 16 semanas con los huecos reales de Diego (2026-10-27): mañanas de lunes a jueves en casa, tardes de lunes y jueves
// solo en el rocódromo y martes por la tarde con gente; viernes a domingo, nada. En casa solo hay barra de dominadas (sin
// multipresa: ni suspensiones, ni test, ni campus en casa). En cada hueco se pide la sesión con
// los huecos que quedan de la semana, se acepta la principal y se registra con el RPE objetivo.
const perfil = { pesoKg: 72, anosEscalando: 1.5, lesiones: [] }
const temporada = planificarTemporada('2026-11-02', '2027-10-04')
const CASA: Contexto = { compania: 'solo', lugar: 'casa', minutosDisponibles: 60, multipresaEnCasa: false }
const SOLO: Contexto = { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 90 }
const AMIGOS: Contexto = { compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120 }
const PATRON: { off: number; hora: number; contexto: Contexto }[] = [
  { off: 0, hora: 9, contexto: CASA }, { off: 0, hora: 19, contexto: SOLO },
  { off: 1, hora: 9, contexto: CASA }, { off: 1, hora: 19, contexto: AMIGOS },
  { off: 2, hora: 9, contexto: CASA },
  { off: 3, hora: 9, contexto: CASA }, { off: 3, hora: 19, contexto: SOLO },
]

const NECESITA_MULTIPRESA: readonly TipoSesion[] = [
  'multipresa-resistencia', 'multipresa-maxima', 'multipresa-resistencia-fuerza', 'evaluacion-dedos', 'campus',
]

interface Semana { lunes: string; fase: string; descarga: boolean; sesiones: { hueco: Hueco; sesion: Sesion | null }[] }
const semanas: Semana[] = []
const historial: Sesion[] = []
// Los bloques de hombro (sesión o complemento) de cada sesión aceptada, en orden.
const bloquesHombro: { fecha: string; fichas: (string | undefined)[] }[] = []
const registros: RegistroSesion[] = []
let evaluacion: EvaluacionDedos | undefined

for (const s of temporada.semanas.slice(0, 16)) {
  const huecos: Hueco[] = PATRON.map((x) => ({ fecha: fechaDesdeDia(diaNumero(s.lunes) + x.off), horaInicio: x.hora, contexto: x.contexto }))
  const semana: Semana = { lunes: s.lunes, fase: s.faseId, descarga: s.descarga, sesiones: [] }
  huecos.forEach((h, i) => {
    const seguimiento = { registros: [...registros], chequeos: [], altas: [] }
    const { descargasAdelantadas } = estadoAtleta(historial, seguimiento, h.fecha)
    const r = proponerSesion({
      fecha: h.fecha, horaInicio: h.horaInicio, contexto: h.contexto, perfil, historial: [...historial],
      fase: faseEnFecha(temporada, h.fecha, { descargasAdelantadas }), seguimiento, huecos: huecos.slice(i + 1),
      ...(evaluacion ? { evaluacion } : {}),
    })
    const sesion = r.principal ? { ...r.principal.sesion, id: `h${historial.length}` } : null
    semana.sesiones.push({ hueco: h, sesion })
    if (!sesion) return
    historial.push(sesion)
    for (const b of r.principal!.bloques.filter((x) => x.nombre === 'Hombro y antagonistas' || x.nombre === 'Complemento: hombro y antagonistas')) {
      bloquesHombro.push({ fecha: h.fecha, fichas: b.ejercicios.map((e) => e.ficha) })
    }
    registros.push({ sesionId: sesion.id, fecha: h.fecha, rpe: objetivoRpe(sesion) ?? 5, duracionMin: sesion.duracionMin, molestias: [] })
    if (sesion.tipo === 'evaluacion-dedos') evaluacion = { fecha: h.fecha, pesoCorporalKg: 72, lastreKg: 15 }
  })
  semanas.push(semana)
}

if (process.env.SIMULACION) {
  for (const s of semanas) {
    const t = s.sesiones.map((x) => `${x.hueco.fecha.slice(8)}${x.hueco.horaInicio < 14 ? 'm' : 't'}:${x.sesion ? `${x.sesion.tipo}${(x.sesion.incluye ?? []).map((t) => `+${t}`).join('')}${esCargaAlta(x.sesion) ? '*' : ''}` : '—'}`)
    console.log(`${s.lunes} ${s.fase}${s.descarga ? '(d)' : ''} ${t.join(' ')}`)
  }
}

describe('simulación de 16 semanas con huecos (P-67)', () => {
  it('en la fuerza sin descarga ni test, el martes por la tarde es la vía al límite', () => {
    const fuerza = semanas.filter((s) => s.fase === 'fuerza' && !s.descarga && !s.sesiones.some((x) => x.sesion?.tipo === 'evaluacion-dedos'))
    expect(fuerza.length).toBeGreaterThan(3)
    for (const s of fuerza) {
      const martes = s.sesiones.find((x) => x.hueco.contexto === AMIGOS)!
      expect(martes.sesion?.tipo, s.lunes).toBe('via-cuerda-limite')
    }
  })
  it('nunca dos sesiones de carga alta el mismo día y ninguna regla de seguridad rota', () => {
    const porDia = new Map<string, number>()
    for (const s of historial.filter(esCargaAlta)) porDia.set(s.fecha, (porDia.get(s.fecha) ?? 0) + 1)
    expect([...porDia.entries()].filter(([, n]) => n > 1)).toEqual([])
    for (const s of historial) expect(validarSesion(s, historial.filter((x) => x.id !== s.id), perfil), s.id).toEqual([])
  })
  it('como mucho 3 días intensos de dedos por semana (tope de novel, P-12)', () => {
    for (const s of semanas) {
      const dias = new Set(s.sesiones.filter((x) => x.sesion && esIntensaDedos(x.sesion)).map((x) => x.hueco.fecha))
      expect(dias.size, s.lunes).toBeLessThanOrEqual(3)
    }
  })
  it('las dominadas salen como sesión en casa, como mucho 1 por semana y nunca el día de dedos intensos (P-39)', () => {
    const todas = semanas.flatMap((s) => s.sesiones)
    expect(todas.some((x) => x.sesion?.tipo === 'dominadas' && x.hueco.contexto === CASA)).toBe(true)
    for (const s of semanas) {
      const con = s.sesiones.filter((x) => x.sesion && conDominadas(x.sesion))
      expect(con.length, s.lunes).toBeLessThanOrEqual(1)
      const diasDedos = new Set(s.sesiones.filter((x) => x.sesion && esIntensaDedos(x.sesion)).map((x) => x.hueco.fecha))
      for (const x of con) expect(diasDedos.has(x.hueco.fecha), `${s.lunes} ${x.hueco.fecha}`).toBe(false)
      if (s.descarga) expect(con, s.lunes).toEqual([])
    }
  })
  it('fuera de las descargas, el hombro nunca cae en días seguidos (P-41)', () => {
    for (const s of semanas.filter((x) => !x.descarga)) {
      const dias = [...new Set(s.sesiones.filter((x) => x.sesion && (x.sesion.tipo === 'hombro' || (x.sesion.incluye ?? []).includes('hombro'))).map((x) => diaNumero(x.hueco.fecha)))]
      expect(dias.filter((d) => dias.includes(d + 1)), s.lunes).toEqual([])
    }
  })
  it('la rutina de hombro alterna A y B a lo largo de la temporada (P-41, decisión de diseño)', () => {
    expect(bloquesHombro.length).toBeGreaterThan(10)
    const letras = bloquesHombro.map((b) => (b.fichas[0] === 'retracciones-escapulares' ? 'A' : b.fichas[0] === 'face-pull-banda' ? 'B' : '?'))
    expect(letras).toEqual(letras.map((_, i) => (i % 2 === 0 ? 'A' : 'B')))
  })
  it('sin multipresa en casa, ninguna multipresa, test ni campus cae en casa: van al rocódromo', () => {
    const todas = semanas.flatMap((s) => s.sesiones)
    const conMultipresa = todas.filter((x) => x.sesion && NECESITA_MULTIPRESA.includes(x.sesion.tipo))
    expect(conMultipresa.length).toBeGreaterThan(0)
    for (const x of conMultipresa) expect(x.hueco.contexto.lugar, `${x.hueco.fecha} ${x.sesion!.tipo}`).toBe('rocodromo')
    // Tampoco como complemento dentro de una sesión de casa.
    for (const x of todas.filter((y) => y.hueco.contexto === CASA && y.sesion)) {
      expect((x.sesion!.incluye ?? []).filter((t) => (NECESITA_MULTIPRESA as readonly string[]).includes(t)), x.hueco.fecha).toEqual([])
    }
  })
})
