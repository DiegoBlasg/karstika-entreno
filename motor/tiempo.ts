import { TIPOS_COMPLEMENTO, TIPOS_SESION, type Sesion } from './tipos'

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
    if (typeof s.id !== 'string' || s.id === '') throw new Error(`id de sesión debe ser un texto no vacío: ${String(s.id)}`)
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
    validarDetalle(s)
    validarIncluye(s)
  }
}

function validarIncluye(s: Sesion): void {
  const inc: unknown = s.incluye
  if (inc === undefined) return
  if (!Array.isArray(inc)) throw new Error(`incluye debe ser una lista en ${s.id}`)
  const vistos = new Set<string>()
  for (const t of inc) {
    if (!(TIPOS_COMPLEMENTO as readonly unknown[]).includes(t)) {
      throw new Error(`incluye solo admite complementos (${TIPOS_COMPLEMENTO.join(', ')}) en ${s.id}: ${String(t)}`)
    }
    if (t === s.tipo) throw new Error(`incluye no puede repetir el tipo principal en ${s.id}: ${t}`)
    if (vistos.has(t)) throw new Error(`incluye tiene un complemento repetido en ${s.id}: ${t}`)
    vistos.add(t)
  }
}

const AGARRES: readonly string[] = ['abierto', 'semiarqueado', 'arqueado']

function validarDetalle(s: Sesion): void {
  const d: unknown = s.detalle
  if (d === undefined) return
  if (d === null || typeof d !== 'object' || Array.isArray(d)) throw new Error(`detalle debe ser un objeto en ${s.id}`)
  const { agarre, conCarga, regletaMm } = d as Record<string, unknown>
  if (agarre !== undefined && !(typeof agarre === 'string' && AGARRES.includes(agarre))) {
    throw new Error(`detalle.agarre desconocido en ${s.id}: ${String(agarre)}`)
  }
  if (conCarga !== undefined && typeof conCarga !== 'boolean') {
    throw new Error(`detalle.conCarga debe ser booleano en ${s.id}: ${String(conCarga)}`)
  }
  if (regletaMm !== undefined && !(typeof regletaMm === 'number' && Number.isFinite(regletaMm) && regletaMm > 0)) {
    throw new Error(`detalle.regletaMm debe ser un número finito mayor que 0 en ${s.id}: ${String(regletaMm)}`)
  }
}

export function fechaDesdeDia(dia: number): string {
  if (!Number.isInteger(dia)) throw new Error(`fechaDesdeDia necesita un número entero de días: ${dia}`)
  return new Date(dia * MS_POR_DIA).toISOString().slice(0, 10)
}
