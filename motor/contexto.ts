import { explicarContexto } from './explicacion'
import { TIPOS_SESION, type Contexto, type Lugar, type Sesion, type TipoSesion, type Violacion } from './tipos'

const NECESITA_COMPANIA: ReadonlySet<TipoSesion> = new Set<TipoSesion>(['via-cuerda-limite', 'pegues-proyecto'])
// Sesiones que necesitan multipresa (el campus, su tabla): sin ella en casa solo quedan la barra y el descanso.
const NECESITA_MULTIPRESA: ReadonlySet<TipoSesion> = new Set<TipoSesion>([
  'multipresa-resistencia', 'multipresa-maxima', 'multipresa-resistencia-fuerza', 'evaluacion-dedos', 'campus',
])
const CASA_O_ROCODROMO: readonly Lugar[] = ['casa', 'rocodromo']

const LUGARES: Record<TipoSesion, readonly Lugar[]> = {
  'via-cuerda-limite': ['rocodromo', 'roca'],
  'pegues-proyecto': ['roca'],
  'via-autoasegurada': ['rocodromo'],
  'bloque-limite': ['rocodromo'],
  'bloque-suave': ['rocodromo'],
  board: ['rocodromo'],   // en casa como mucho hay multipresa y barra, nunca un board
  tecnica: ['rocodromo', 'roca'],   // en roca: vías por debajo del nivel (segundo día de un viaje)
  arc: ['rocodromo'],
  'resistencia-4x4': ['rocodromo'],
  'multipresa-resistencia': CASA_O_ROCODROMO,
  'multipresa-maxima': CASA_O_ROCODROMO,
  'multipresa-resistencia-fuerza': CASA_O_ROCODROMO,
  'evaluacion-dedos': CASA_O_ROCODROMO,
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

// En roca toda la escalada es con cuerda: cualquier sesión salvo el descanso necesita compañero.
const necesitaCompania = (t: TipoSesion, lugar: Lugar): boolean =>
  NECESITA_COMPANIA.has(t) || (lugar === 'roca' && t !== 'descanso')

// Fail-closed solo cuando el usuario dice explícitamente que no tiene multipresa en casa; ausente = sí la tiene.
const sinMaterial = (t: TipoSesion, ctx: Contexto): boolean =>
  ctx.lugar === 'casa' && ctx.multipresaEnCasa === false && NECESITA_MULTIPRESA.has(t)

export function tiposPosibles(ctx: Contexto): TipoSesion[] {
  comprobarContexto(ctx)
  return TIPOS_SESION.filter(
    (t) => LUGARES[t].includes(ctx.lugar) && !sinMaterial(t, ctx) && (!necesitaCompania(t, ctx.lugar) || ctx.compania === 'con-gente'),
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
  if (sinMaterial(sesion.tipo, ctx)) {
    const motivo = `Sin multipresa en casa no se puede hacer ${sesion.tipo} en casa: hazla en el rocódromo.`
    out.push({
      regla: 'contexto.material',
      sesionIds: [sesion.id],
      mensaje: motivo,
      explicacion: explicarContexto('contexto.material', motivo),
    })
  }
  if (necesitaCompania(sesion.tipo, ctx.lugar) && ctx.compania === 'solo') {
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
