import { explicarContexto } from './explicacion'
import { TIPOS_SESION, type Contexto, type Lugar, type Sesion, type TipoSesion, type Violacion } from './tipos'

const NECESITA_COMPANIA: ReadonlySet<TipoSesion> = new Set<TipoSesion>(['via-cuerda-limite', 'pegues-proyecto'])
const CASA_O_ROCODROMO: readonly Lugar[] = ['casa', 'rocodromo']

const LUGARES: Record<TipoSesion, readonly Lugar[]> = {
  'via-cuerda-limite': ['rocodromo', 'roca'],
  'pegues-proyecto': ['roca'],
  'via-autoasegurada': ['rocodromo'],
  'bloque-limite': ['rocodromo'],
  'bloque-suave': ['rocodromo'],
  board: ['rocodromo', 'casa'],
  tecnica: ['rocodromo'],
  arc: ['rocodromo'],
  'resistencia-4x4': ['rocodromo'],
  'multipresa-resistencia': CASA_O_ROCODROMO,
  'multipresa-maxima': CASA_O_ROCODROMO,
  dominadas: CASA_O_ROCODROMO,
  hombro: CASA_O_ROCODROMO,
  campus: CASA_O_ROCODROMO,
  descanso: ['rocodromo', 'roca', 'casa'],
}

function comprobarContexto(ctx: Contexto): void {
  if (!Number.isFinite(ctx.minutosDisponibles) || ctx.minutosDisponibles <= 0) {
    throw new Error(`minutosDisponibles debe ser un número positivo: ${ctx.minutosDisponibles}`)
  }
}

export function tiposPosibles(ctx: Contexto): TipoSesion[] {
  comprobarContexto(ctx)
  return TIPOS_SESION.filter(
    (t) => LUGARES[t].includes(ctx.lugar) && (!NECESITA_COMPANIA.has(t) || ctx.compania === 'con-gente'),
  ).sort()
}

export function validarContexto(sesion: Sesion, ctx: Contexto): Violacion[] {
  comprobarContexto(ctx)
  const out: Violacion[] = []
  if (!LUGARES[sesion.tipo].includes(ctx.lugar)) {
    const motivo = `La sesión ${sesion.tipo} no se puede hacer en este lugar (${ctx.lugar}).`
    out.push({
      regla: 'contexto.lugar',
      sesionIds: [sesion.id],
      mensaje: motivo,
      explicacion: explicarContexto('contexto.lugar', motivo),
    })
  }
  if (NECESITA_COMPANIA.has(sesion.tipo) && ctx.compania === 'solo') {
    const motivo = `Sin compañero no se puede hacer ${sesion.tipo}: hace falta alguien que asegure.`
    out.push({
      regla: 'contexto.sin-cuerda',
      sesionIds: [sesion.id],
      mensaje: motivo,
      explicacion: explicarContexto('contexto.sin-cuerda', motivo),
    })
  }
  if (sesion.duracionMin > ctx.minutosDisponibles) {
    const motivo = `La sesión dura ${sesion.duracionMin} min y solo hay ${ctx.minutosDisponibles} min disponibles.`
    out.push({
      regla: 'contexto.tiempo',
      sesionIds: [sesion.id],
      mensaje: motivo,
      explicacion: explicarContexto('contexto.tiempo', motivo),
    })
  }
  return out
}
