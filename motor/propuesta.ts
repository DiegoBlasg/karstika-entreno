import { tiposPosibles, validarContexto } from './contexto'
import { evaluacionVigente } from './evaluacion'
import { explicar, explicarContexto, type Explicacion } from './explicacion'
import { VALORES } from './parametros'
import { construirComplemento, construirSesion } from './plantillas'
import type { Bloque, Peticion, Propuesta, SesionPlan } from './propuesta-tipos'
import { esIntensaDedos, validarSesion } from './seguridad'
import { diaNumero, fechaDesdeDia, inicioHoras, validarEntrada } from './tiempo'
import { TIPOS_COMPLEMENTO, type Sesion, type TipoComplemento, type TipoSesion, type Violacion } from './tipos'

// Decisiones de diseño de la selección (no están en parametros.md).
const PENALIZACION_REPETIR = 30
const DIAS_RECIENTES = 4
const SESIONES_RECIENTES_PARA_DESCANSO = 3
const DIAS_BUSQUEDA_VENTANA = 14
const REGLA_DESCANSO_DEDOS = 'seguridad.dedos-dia-descanso'
// Si una sesión intensa de bloque no es segura hoy, se ofrece su versión suave en lugar de descartarla.
const SUSTITUTO_SUAVE: Partial<Record<TipoSesion, TipoSesion>> = { board: 'bloque-suave', 'bloque-limite': 'bloque-suave' }
// Complementos: el hombro se elige primero (es el único con un ensayo que reduce lesiones, P-41), pero se coloca
// siempre al final de la sesión; el orden de colocación es el de TIPOS_COMPLEMENTO (técnica, ARC, hombro).
const PRIORIDAD_COMPLEMENTOS: readonly TipoComplemento[] = ['hombro', 'tecnica', 'arc']

interface Candidato {
  tipoPlan: TipoSesion       // el tipo de la fase (difiere de plan.sesion.tipo si se sustituyó por su versión suave)
  plan: SesionPlan
  violaciones: Violacion[]
  sustitucionPor?: Violacion[]
}

interface Valido extends Candidato {
  puntuacion: number
  hechas7d: number
}

const comparar = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

function validarPeticion(p: Peticion): void {
  if (p == null) throw new Error('proponerSesion: la petición es obligatoria')
  if (p.fase == null) throw new Error('proponerSesion: la fase es obligatoria')
  if (p.contexto == null) throw new Error('proponerSesion: el contexto es obligatorio')
  if (p.perfil == null) throw new Error('proponerSesion: el perfil es obligatorio')
  if (!Array.isArray(p.historial)) throw new Error('proponerSesion: el historial debe ser un array')
  // Comprueba fecha y hora de la petición con una sesión ficticia y valida de paso todo el historial.
  validarEntrada([
    { id: 'peticion', tipo: 'descanso', intensidad: 'suave', fecha: p.fecha, horaInicio: p.horaInicio, duracionMin: 1 },
    ...p.historial,
  ])
}

function evaluar(tipo: TipoSesion, p: Peticion): Candidato | null {
  const plan = construirSesion(tipo, p)
  if (!plan) return null
  return { tipoPlan: tipo, plan, violaciones: validarPlan(plan.sesion, p) }
}

function validarPlan(sesion: Sesion, p: Peticion): Violacion[] {
  return [...validarContexto(sesion, p.contexto), ...validarSesion(sesion, p.historial, p.perfil)]
}

// Una sesión cuenta para el cupo de un tipo si es de ese tipo o lo incluye como complemento.
const cuentaPara = (s: Sesion, tipo: TipoSesion): boolean =>
  s.tipo === tipo || (s.incluye ?? []).some((t) => t === tipo)

function hechasEn7Dias(p: Peticion, tipo: TipoSesion): number {
  const d = diaNumero(p.fecha)
  return p.historial.filter((s) => {
    const x = diaNumero(s.fecha)
    return cuentaPara(s, tipo) && x >= d - 6 && x <= d
  }).length
}

const cupoPendiente = (p: Peticion, tipo: TipoSesion): boolean => {
  const cupo = p.fase.cupos[tipo] ?? 0
  return cupo > 0 && hechasEn7Dias(p, tipo) < cupo
}

function ultimaSesion(p: Peticion): Sesion | undefined {
  return [...p.historial].sort((a, b) => inicioHoras(a) - inicioHoras(b) || comparar(a.id, b.id)).at(-1)
}

// Rellena el tiempo libre con complementos suaves cuyo cupo de la fase sigue pendiente.
function completar(plan: SesionPlan, p: Peticion, posibles: ReadonlySet<TipoSesion>): { plan: SesionPlan; anadidos: TipoComplemento[] } {
  const libresIniciales = p.contexto.minutosDisponibles - plan.sesion.duracionMin
  let libres = libresIniciales
  const elegidos = new Map<TipoComplemento, Bloque>()
  for (const t of PRIORIDAD_COMPLEMENTOS) {
    if (t === plan.sesion.tipo || !posibles.has(t) || p.fase.prohibidos.includes(t) || !cupoPendiente(p, t)) continue
    const bloque = construirComplemento(t, p, libres)
    if (!bloque) continue
    elegidos.set(t, bloque)
    libres -= bloque.minutos
  }
  if (elegidos.size === 0) return { plan, anadidos: [] }
  const anadidos = TIPOS_COMPLEMENTO.filter((t) => elegidos.has(t))
  const bloques = [...plan.bloques, ...anadidos.map((t) => elegidos.get(t)!)]
  const sesion: Sesion = {
    ...plan.sesion,
    duracionMin: plan.sesion.duracionMin + (libresIniciales - libres),
    incluye: anadidos,
  }
  // Se revalida la sesión compuesta; si algo fallara, se devuelve sin complementos (falla cerrado).
  if (validarPlan(sesion, p).length > 0) return { plan, anadidos: [] }
  return { plan: { sesion, bloques, explicaciones: bloques.map((b) => b.explicacion) }, anadidos }
}

function explicacionEleccion(c: Valido, p: Peticion, anadidos: readonly TipoComplemento[]): Explicacion {
  const cupo = p.fase.cupos[c.tipoPlan] ?? 0
  const partes = [
    cupo > 0
      ? `La fase «${p.fase.nombre}» pide ${cupo} sesión(es) de ${c.tipoPlan} cada 7 días y llevas ${c.hechas7d}.`
      : `Opción válida según la prioridad de la fase «${p.fase.nombre}».`,
  ]
  if (c.plan.sesion.tipo !== c.tipoPlan) {
    const porDescanso = (c.sustitucionPor ?? []).some((v) => v.regla === REGLA_DESCANSO_DEDOS)
    partes.push(
      porDescanso
        ? `Sustituye a ${c.tipoPlan}, porque falta un día completo de descanso entre sesiones intensas de dedos.`
        : `Sustituye a ${c.tipoPlan}, que hoy no cumple una regla de seguridad.`,
    )
  }
  if (anadidos.length > 0) partes.push(`Se completa con ${anadidos.join(', ')}, que tienen cupo pendiente en la fase.`)
  return explicar('generador.eleccion', ['P-30'], partes.join(' '))
}

// Primer día a partir de mañana sin conflicto con ninguna sesión intensa de dedos del historial (pasada o futura).
function ventanaIntensa(p: Peticion): { fecha: string } | undefined {
  const minimo = VALORES['P-14'].diasMinimosEntreSesionesIntensasDedos
  const intensos = p.historial.filter(esIntensaDedos).map((s) => diaNumero(s.fecha))
  const d = diaNumero(p.fecha)
  for (let x = d + 1; x <= d + DIAS_BUSQUEDA_VENTANA; x++) {
    if (intensos.every((y) => Math.abs(x - y) >= minimo)) return { fecha: fechaDesdeDia(x) }
  }
  return undefined
}

export function proponerSesion(p: Peticion): Propuesta {
  validarPeticion(p)
  const posibles = new Set(tiposPosibles(p.contexto))
  const vigente = evaluacionVigente(p.evaluacion, p.fecha)
  const tipos = p.fase.prioridad.filter(
    (t) =>
      t !== 'descanso' &&
      posibles.has(t) &&
      !p.fase.prohibidos.includes(t) &&
      (t !== 'evaluacion-dedos' || !vigente),
  )

  let huboDescansoDedos = false
  const candidatos: Candidato[] = []
  for (const tipo of tipos) {
    let c = evaluar(tipo, p)
    if (!c) continue
    if (c.violaciones.some((v) => v.regla === REGLA_DESCANSO_DEDOS)) huboDescansoDedos = true
    const sustituto = SUSTITUTO_SUAVE[tipo]
    if (c.violaciones.length > 0 && sustituto && posibles.has(sustituto)) {
      const suave = evaluar(sustituto, p)
      if (suave) c = { ...suave, tipoPlan: tipo, sustitucionPor: c.violaciones }
    }
    if (c.violaciones.length === 0) candidatos.push(c)
  }

  const ultima = ultimaSesion(p)
  const validos: Valido[] = candidatos
    .map((c) => {
      const cupo = p.fase.cupos[c.tipoPlan] ?? 0
      const hechas7d = hechasEn7Dias(p, c.tipoPlan)
      const pendiente = cupo > 0 ? (100 * Math.max(0, cupo - hechas7d)) / cupo : 0
      const prioridad = p.fase.prioridad.length - p.fase.prioridad.indexOf(c.tipoPlan)
      const repetir = ultima && ultima.tipo === c.plan.sesion.tipo ? PENALIZACION_REPETIR : 0
      return { ...c, hechas7d, puntuacion: pendiente + prioridad - repetir }
    })
    .sort((a, b) => b.puntuacion - a.puntuacion || comparar(a.plan.sesion.tipo, b.plan.sesion.tipo))

  const elegidos: Valido[] = []
  for (const v of validos) {
    if (elegidos.length === 3) break
    if (elegidos.some((e) => e.plan.sesion.tipo === v.plan.sesion.tipo)) continue
    elegidos.push(v)
  }

  const terminar = (v: Valido): SesionPlan => {
    const { plan, anadidos } = completar(v.plan, p, posibles)
    return { ...plan, explicaciones: [explicacionEleccion(v, p, anadidos), ...plan.explicaciones] }
  }
  const principal = elegidos[0] ? terminar(elegidos[0]) : null
  const alternativas = elegidos.slice(1).map(terminar)

  let descanso: Explicacion | undefined
  if (validos.length === 0) {
    descanso = huboDescansoDedos
      ? explicar(
          'generador.descanso',
          ['P-14', 'P-15'],
          'Hoy no hay ninguna sesión posible: falta un día completo de descanso desde tu última sesión intensa de dedos.',
        )
      : explicarContexto('contexto.sin-opciones', 'Con este contexto y esta fase no hay ninguna sesión posible hoy.')
  } else {
    const d = diaNumero(p.fecha)
    const recientes = p.historial.filter((s) => {
      const x = diaNumero(s.fecha)
      return x >= d - DIAS_RECIENTES && x <= d - 1
    }).length
    const cuposCubiertos = validos.every((v) => !cupoPendiente(p, v.tipoPlan))
    if (recientes >= SESIONES_RECIENTES_PARA_DESCANSO && cuposCubiertos) {
      descanso = explicar(
        'generador.descanso-recomendado',
        ['P-16'],
        `Llevas ${recientes} sesiones en los últimos ${DIAS_RECIENTES} días y los cupos de la fase están cubiertos: hoy es buen día para descansar.`,
      )
    }
  }

  const ventana = huboDescansoDedos ? ventanaIntensa(p) : undefined
  return {
    principal,
    alternativas,
    ...(descanso ? { descanso } : {}),
    ...(ventana ? { proximaVentanaIntensa: ventana } : {}),
  }
}
