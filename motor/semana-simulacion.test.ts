import { describe, expect, it } from 'vitest'
import {
  diaNumero, esCargaAlta, esIntensaDedos, estadoAtleta, faseEnFecha, fechaDesdeDia, objetivoRpe, planificarTemporada, proponerSesion,
  validarSesion,
} from './index'
import type { Contexto, EvaluacionDedos, Hueco, RegistroSesion, Sesion } from './index'

// 16 semanas con los huecos reales de Diego (2026-10-27): mañanas de lunes a jueves en casa, tardes de lunes y jueves
// solo en el rocódromo y martes por la tarde con gente; viernes a domingo, nada. En cada hueco se pide la sesión con
// los huecos que quedan de la semana, se acepta la principal y se registra con el RPE objetivo.
const perfil = { pesoKg: 72, anosEscalando: 1.5, lesiones: [] }
const temporada = planificarTemporada('2026-11-02', '2027-10-04')
const CASA: Contexto = { compania: 'solo', lugar: 'casa', minutosDisponibles: 60 }
const SOLO: Contexto = { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 90 }
const AMIGOS: Contexto = { compania: 'con-gente', lugar: 'rocodromo', minutosDisponibles: 120 }
const PATRON: { off: number; hora: number; contexto: Contexto }[] = [
  { off: 0, hora: 9, contexto: CASA }, { off: 0, hora: 19, contexto: SOLO },
  { off: 1, hora: 9, contexto: CASA }, { off: 1, hora: 19, contexto: AMIGOS },
  { off: 2, hora: 9, contexto: CASA },
  { off: 3, hora: 9, contexto: CASA }, { off: 3, hora: 19, contexto: SOLO },
]

interface Semana { lunes: string; fase: string; descarga: boolean; sesiones: { hueco: Hueco; sesion: Sesion | null }[] }
const semanas: Semana[] = []
const historial: Sesion[] = []
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
    registros.push({ sesionId: sesion.id, fecha: h.fecha, rpe: objetivoRpe(sesion) ?? 5, duracionMin: sesion.duracionMin, molestias: [] })
    if (sesion.tipo === 'evaluacion-dedos') evaluacion = { fecha: h.fecha, pesoCorporalKg: 72, lastreKg: 15 }
  })
  semanas.push(semana)
}

if (process.env.SIMULACION) {
  for (const s of semanas) {
    const t = s.sesiones.map((x) => `${x.hueco.fecha.slice(8)}${x.hueco.horaInicio < 14 ? 'm' : 't'}:${x.sesion ? `${x.sesion.tipo}${esCargaAlta(x.sesion) ? '*' : ''}` : '—'}`)
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
})
