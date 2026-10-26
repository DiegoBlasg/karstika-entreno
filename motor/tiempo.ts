import { TIPOS_SESION, type Sesion } from './tipos'

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_POR_DIA = 86_400_000

export function diaNumero(fecha: string): number {
  const m = FECHA.exec(fecha)
  if (!m) throw new Error(`Fecha mal formada (se espera AAAA-MM-DD): ${fecha}`)
  const año = Number(m[1])
  const mes = Number(m[2])
  const dia = Number(m[3])
  const ms = Date.UTC(año, mes - 1, dia)
  const d = new Date(ms)
  if (d.getUTCFullYear() !== año || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) {
    throw new Error(`La fecha no existe: ${fecha}`)
  }
  return ms / MS_POR_DIA
}

export function inicioHoras(s: Sesion): number {
  return diaNumero(s.fecha) * 24 + s.horaInicio
}

export function finHoras(s: Sesion): number {
  return inicioHoras(s) + s.duracionMin / 60
}

export function validarEntrada(sesiones: readonly Sesion[]): void {
  const vistos = new Set<string>()
  for (const s of sesiones) {
    if (vistos.has(s.id)) throw new Error(`Id de sesión duplicado: ${s.id}`)
    vistos.add(s.id)
    try {
      diaNumero(s.fecha)
    } catch (e) {
      throw new Error(`Fecha inválida en ${s.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
    if (!Number.isFinite(s.horaInicio) || s.horaInicio < 0 || s.horaInicio >= 24) {
      throw new Error(`horaInicio fuera de [0, 24) en ${s.id}: ${s.horaInicio}`)
    }
    if (!Number.isFinite(s.duracionMin) || s.duracionMin <= 0) {
      throw new Error(`duracionMin debe ser positiva y finita en ${s.id}: ${s.duracionMin}`)
    }
    if (!(TIPOS_SESION as readonly string[]).includes(s.tipo)) throw new Error(`tipo desconocido en ${s.id}: ${s.tipo}`)
    if (s.intensidad !== 'alta' && s.intensidad !== 'suave') {
      throw new Error(`intensidad desconocida en ${s.id}: ${s.intensidad}`)
    }
  }
}
