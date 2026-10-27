import { estadoAtleta, restriccionesDe } from './autorregulacion'
import type { Restricciones } from './autorregulacion-tipos'
import { tiposPosibles, validarContexto } from './contexto'
import { evaluacionVigente, fuerzaRelativa } from './evaluacion'
import { explicar, explicarContexto, type Explicacion } from './explicacion'
import { descargar } from './fases'
import { VALORES } from './parametros'
import { construirComplemento, construirSesion } from './plantillas'
import type { Bloque, Peticion, Propuesta, SesionPlan } from './propuesta-tipos'
import { esCargaAlta, esIntensaDedos, validarSesion } from './seguridad'
import { diaNumero, fechaDesdeDia, inicioHoras, validarEntrada } from './tiempo'
import { TIPOS_COMPLEMENTO, type Sesion, type TipoComplemento, type TipoSesion, type Violacion } from './tipos'

// Decisiones de diseño de la selección (no están en parametros.md).
const PESO_CUPO_PENDIENTE = 1000
const PESO_PRIORIDAD = 10
const PESO_FRACCION = 5        // menor que PESO_PRIORIDAD: la fracción pendiente solo desempata
const PENALIZACION_REPETIR = 30 // equivale a bajar tres puestos de prioridad
const DIAS_RECIENTES = 4
const SESIONES_RECIENTES_PARA_DESCANSO = 3
const DIAS_BUSQUEDA_VENTANA = 14
const REGLA_DESCANSO_DEDOS = 'seguridad.dedos-dia-descanso'
// Reglas que dependen de la carga reciente: cuando bloquean lo intenso, se calcula cuándo vuelve a caber.
const REGLAS_DE_CARGA: readonly string[] = [REGLA_DESCANSO_DEDOS, 'seguridad.dedos-7dias', 'seguridad.carga-alta-seguida']
const ID_PETICION = '__peticion__'
const PREFIJO_PROPUESTA = 'propuesta-'
// Con menos de 2 años, un test por encima de este % del peso corporal es casi seguro un error al teclear
// (un 6b suele estar en un 110-140 %). Decisión de diseño: se rechaza y se pide revisar el dato.
const FUERZA_RELATIVA_MAX_NOVEL = 160
// Si una sesión intensa de bloque no es segura hoy, se ofrece su versión suave en lugar de descartarla.
const SUSTITUTO_SUAVE: Partial<Record<TipoSesion, TipoSesion>> = { board: 'bloque-suave', 'bloque-limite': 'bloque-suave' }
// Complementos: el hombro se elige primero (es el único con un ensayo que reduce lesiones, P-41), pero se coloca
// siempre al final de la sesión; el orden de colocación es el de TIPOS_COMPLEMENTO (técnica, ARC, hombro).
const PRIORIDAD_COMPLEMENTOS: readonly TipoComplemento[] = ['hombro', 'tecnica', 'arc']
const RELLENO_SUAVE: readonly TipoComplemento[] = ['tecnica', 'arc']

interface Candidato {
  tipoPlan: TipoSesion       // el tipo de la fase (difiere de plan.sesion.tipo si se sustituyó por su versión suave)
  plan: SesionPlan
  violaciones: Violacion[]
  sustitucionPor?: Violacion[]
  sustitucionPorEstado?: boolean
}

// Sesiones al límite que quita un ámbar en «otra» zona (P-64): caídas, talones y esfuerzos máximos.
const AL_LIMITE: readonly TipoSesion[] = ['bloque-limite', 'via-cuerda-limite', 'pegues-proyecto', 'board']

// P-64 y P-65: lo que el estado del escalador impide hoy.
function bloqueadaPorEstado(s: Sesion, r: Restricciones | undefined): boolean {
  if (!r) return false
  if (r.soloDescanso) return true
  if (r.soloHombro) return s.tipo !== 'hombro'
  if (r.sinCargaAlta && esCargaAlta(s)) return true
  return r.sinLimite && AL_LIMITE.includes(s.tipo)
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
  const reservado = p.historial.find((s) => s.id === ID_PETICION || String(s.id).startsWith(PREFIJO_PROPUESTA))
  if (reservado) {
    throw new Error(
      `proponerSesion: el historial contiene el id reservado «${reservado.id}». Al guardar una sesión propuesta, asígnale un id propio.`,
    )
  }
  // Comprueba fecha y hora de la petición con una sesión ficticia y valida de paso todo el historial.
  validarEntrada([
    { id: ID_PETICION, tipo: 'descanso', intensidad: 'suave', fecha: p.fecha, horaInicio: p.horaInicio, duracionMin: 1 },
    ...p.historial,
  ])
  if (p.estado !== undefined) {
    throw new Error('proponerSesion: no pases `estado`; se calcula a partir de `seguimiento`')
  }
  if (p.evaluacion !== undefined) {
    const relativa = fuerzaRelativa(p.evaluacion) // lanza si el test no es plausible
    if (p.perfil.anosEscalando < VALORES['P-12'].anosMaximosPerfilNovel && relativa > FUERZA_RELATIVA_MAX_NOVEL) {
      throw new Error(
        `proponerSesion: un test del ${relativa.toFixed(1)} % del peso corporal (máximo plausible ${FUERZA_RELATIVA_MAX_NOVEL} %) es poco plausible con menos de 2 años escalando; revisa el dato antes de usarlo.`,
      )
    }
  }
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
  // Una sesión de hombro es corta y no lleva calentamiento de escalada: no se le añade escalada detrás.
  if (plan.sesion.tipo === 'hombro') return { plan, anadidos: [] }
  const libresIniciales = p.contexto.minutosDisponibles - plan.sesion.duracionMin
  let libres = libresIniciales
  const elegidos = new Map<TipoComplemento, Bloque>()
  const anadir = (t: TipoComplemento, exigirCupo: boolean): void => {
    if (elegidos.has(t) || t === plan.sesion.tipo || !posibles.has(t) || p.fase.prohibidos.includes(t)) return
    if (exigirCupo && !cupoPendiente(p, t)) return
    const bloque = construirComplemento(t, p, libres)
    if (!bloque) return
    elegidos.set(t, bloque)
    libres -= bloque.minutos
  }
  // Primero, los complementos con cupo pendiente; después, si sobra tiempo, volumen suave de técnica y ARC
  // (más práctica técnica es lo que más margen tiene con menos de 2 años). El hombro solo entra por cupo.
  for (const t of PRIORIDAD_COMPLEMENTOS) anadir(t, true)
  for (const t of RELLENO_SUAVE) anadir(t, false)
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
        : c.sustitucionPorEstado
          ? `Sustituye a ${c.tipoPlan} por tu estado de hoy (semáforo de dolor o chequeo).`
          : `Sustituye a ${c.tipoPlan}, que hoy no cumple una regla de seguridad.`,
    )
  }
  if (anadidos.length > 0) {
    partes.push(`Se completa con ${anadidos.join(', ')} (cupos pendientes de la fase y volumen suave para aprovechar el tiempo).`)
  }
  return explicar('generador.eleccion', ['P-30'], partes.join(' '))
}

// Primer día a partir de mañana en que el propio generador, con el mismo contexto, historial y fase, propondría
// alguna sesión intensa de dedos. Correcto por construcción: tiene en cuenta seguridad, cupos y la regla del test.
function ventanaIntensa(p: Peticion): { fecha: string } | undefined {
  const d = diaNumero(p.fecha)
  for (let x = d + 1; x <= d + DIAS_BUSQUEDA_VENTANA; x++) {
    const r = proponer({ ...p, fecha: fechaDesdeDia(x) }, false)
    if ([r.principal, ...r.alternativas].some((plan) => plan !== null && esIntensaDedos(plan.sesion))) {
      return { fecha: fechaDesdeDia(x) }
    }
  }
  return undefined
}

// Un test de dedos hecho en los últimos 70 días cuenta como reciente aunque no se haya guardado su resultado
// como evaluación: así no se vuelve a proponer cada semana. En la semana de reevaluación de una fase (P-26)
// vuelve a tocar si el último tiene al menos DIAS_MIN_REEVALUAR días.
const DIAS_MIN_REEVALUAR = 21 // decisión de diseño: no repetir el test máximo con menos de 3 semanas

function testReciente(p: Peticion): boolean {
  const d = diaNumero(p.fecha)
  const maximo = VALORES['P-08'].semanasMaximasSinReevaluar * 7
  const hace = [
    ...(p.evaluacion && evaluacionVigente(p.evaluacion, p.fecha) ? [d - diaNumero(p.evaluacion.fecha)] : []),
    ...p.historial.filter((s) => s.tipo === 'evaluacion-dedos').map((s) => d - diaNumero(s.fecha)),
  ].filter((x) => x >= 0 && x <= maximo)
  if (hace.length === 0) return false
  return !(p.fase.reevaluar && Math.min(...hace) >= DIAS_MIN_REEVALUAR)
}

// Los mejores `n` de tipos distintos, en el orden ya calculado.
function elegidosDe(validos: readonly Valido[], n: number): Valido[] {
  const out: Valido[] = []
  for (const v of validos) {
    if (out.length === n) break
    if (out.some((e) => e.plan.sesion.tipo === v.plan.sesion.tipo)) continue
    out.push(v)
  }
  return out
}

export function proponerSesion(p: Peticion): Propuesta {
  validarPeticion(p)
  return proponer(p, true)
}

function proponer(recibida: Peticion, conVentana: boolean): Propuesta {
  // Tramo 2d: el estado se recalcula para cada fecha (el chequeo de hoy no vale para mañana) y puede adelantar
  // la descarga (P-50).
  const estado = recibida.seguimiento ? estadoAtleta(recibida.historial, recibida.seguimiento, recibida.fecha) : undefined
  const r = estado ? restriccionesDe(estado) : undefined
  const fase = estado?.descargaAdelantada && !recibida.fase.descarga ? descargar(recibida.fase) : recibida.fase
  const p: Peticion = { ...recibida, fase, ...(estado ? { estado } : {}) }
  const posibles = new Set(tiposPosibles(p.contexto))
  const vigente = testReciente(p)
  const tipos = p.fase.prioridad.filter(
    (t) =>
      t !== 'descanso' &&
      posibles.has(t) &&
      !p.fase.prohibidos.includes(t) &&
      (t !== 'evaluacion-dedos' || !vigente),
  )

  let huboDescansoDedos = false
  let huboBloqueoIntenso = false
  let huboBloqueoEstado = false
  const candidatos: Candidato[] = []
  for (const tipo of tipos) {
    let c = evaluar(tipo, p)
    if (!c) continue
    // Los cupos son también un tope: una sesión de carga alta (intensa de dedos, 4x4…) con el cupo semanal
    // cubierto no se propone.
    if (esCargaAlta(c.plan.sesion) && !cupoPendiente(p, tipo)) continue
    if (c.violaciones.some((v) => v.regla === REGLA_DESCANSO_DEDOS)) huboDescansoDedos = true
    // Solo cuenta como bloqueo por carga si las únicas reglas que lo impiden son de carga reciente
    // (p. ej. un test de dedos prematuro no se resuelve esperando un día).
    const deSeguridad = c.violaciones.filter((v) => v.regla.startsWith('seguridad.'))
    if (esIntensaDedos(c.plan.sesion) && deSeguridad.length > 0 && deSeguridad.every((v) => REGLAS_DE_CARGA.includes(v.regla))) {
      huboBloqueoIntenso = true
    }
    const sustituto = SUSTITUTO_SUAVE[tipo]
    const porEstado = bloqueadaPorEstado(c.plan.sesion, r)
    if (porEstado) huboBloqueoEstado = true
    if ((c.violaciones.length > 0 || porEstado) && sustituto && posibles.has(sustituto)) {
      const suave = evaluar(sustituto, p)
      if (suave) c = { ...suave, tipoPlan: tipo, sustitucionPor: c.violaciones, ...(porEstado ? { sustitucionPorEstado: true } : {}) }
    }
    if (c.violaciones.length === 0 && !bloqueadaPorEstado(c.plan.sesion, r)) candidatos.push(c)
  }

  const ultima = ultimaSesion(p)
  const validos: Valido[] = candidatos
    .map((c) => {
      // Orden: primero los tipos con cupo pendiente; entre ellos manda la prioridad de la fase; la fracción
      // pendiente solo desempata (vale menos que un puesto de prioridad).
      const cupo = p.fase.cupos[c.tipoPlan] ?? 0
      const hechas7d = hechasEn7Dias(p, c.tipoPlan)
      const fraccion = cupo > 0 ? Math.max(0, cupo - hechas7d) / cupo : 0
      const pendiente = (fraccion > 0 ? PESO_CUPO_PENDIENTE : 0) + PESO_FRACCION * fraccion
      const prioridad = PESO_PRIORIDAD * (p.fase.prioridad.length - p.fase.prioridad.indexOf(c.tipoPlan))
      // Variedad: se penaliza repetir el tipo de la última sesión solo si fue ayer u hoy; con un día de por
      // medio, repetir es justo lo que piden los cupos (p. ej. 2 multipresas por semana).
      const ayerOHoy = ultima !== undefined && diaNumero(p.fecha) - diaNumero(ultima.fecha) <= 1
      const repetir = ayerOHoy && ultima.tipo === c.plan.sesion.tipo ? PENALIZACION_REPETIR : 0
      return { ...c, hechas7d, puntuacion: pendiente + prioridad - repetir }
    })
    .sort((a, b) => b.puntuacion - a.puntuacion || comparar(a.plan.sesion.tipo, b.plan.sesion.tipo))

  const elegidos = elegidosDe(validos, 3)

  const terminar = (v: Valido): SesionPlan => {
    const { plan, anadidos } = completar(v.plan, p, posibles)
    return { ...plan, explicaciones: [explicacionEleccion(v, p, anadidos), ...plan.explicaciones] }
  }
  const conEstado = (prop: Propuesta): Propuesta => {
    if (!estado) return prop
    const principal = prop.principal
      ? { ...prop.principal, explicaciones: [prop.principal.explicaciones[0]!, ...estado.explicaciones, ...prop.principal.explicaciones.slice(1)] }
      : null
    return { ...prop, principal, estado }
  }

  // Rojo (P-43, P-46, P-64): la principal es el descanso; con rojo en dedos, muñeca o codo se ofrece movilidad de
  // hombro sin carga por si apetece moverse.
  if (r && (r.soloDescanso || r.soloHombro)) {
    const hombro = r.soloHombro && posibles.has('hombro') ? evaluar('hombro', p) : null
    const alternativa = hombro && hombro.violaciones.length === 0 ? [hombro.plan] : []
    return conEstado({
      principal: null,
      alternativas: alternativa,
      descanso: explicar(
        'autorregulacion.rojo',
        ['P-43', 'P-44', 'P-46', 'P-64'],
        `Tienes una zona en rojo: hoy toca descanso${alternativa.length > 0 ? ' (o, si quieres moverte, movilidad de hombro sin carga)' : ''}. La carga de la zona queda bloqueada hasta que un fisioterapeuta te dé el alta; pide valoración profesional. El motor no diagnostica.`,
      ),
    })
  }

  let descanso: Explicacion | undefined
  if (validos.length === 0 && huboBloqueoEstado) {
    descanso = explicar(
      'autorregulacion.sin-opciones',
      ['P-64', 'P-65'],
      'Con tu estado de hoy (semáforo de dolor o chequeo) no queda ninguna sesión posible en este contexto: hoy toca descanso.',
    )
  } else if (validos.length === 0) {
    descanso = huboDescansoDedos
      ? explicar(
          'generador.descanso',
          ['P-14', 'P-15'],
          'Hoy no hay ninguna sesión posible: falta un día completo de descanso respecto a una sesión intensa de dedos de tu historial (hecha o planificada).',
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

  // Solo tiene sentido avisar si hoy no queda ninguna sesión intensa de dedos válida.
  const hayIntensaValida = validos.some((v) => esIntensaDedos(v.plan.sesion))
  const ventana = conVentana && huboBloqueoIntenso && !hayIntensaValida ? ventanaIntensa(recibida) : undefined

  // Cuando se recomienda descansar, el descanso es la principal (decisión del usuario) y las alternativas son
  // las dos mejores sesiones suaves, por si apetece moverse.
  let principal: SesionPlan | null
  let alternativas: SesionPlan[]
  if (descanso?.regla === 'generador.descanso-recomendado') {
    principal = null
    alternativas = elegidosDe(validos.filter((v) => !esCargaAlta(v.plan.sesion)), 2).map(terminar)
  } else {
    principal = elegidos[0] ? terminar(elegidos[0]) : null
    alternativas = elegidos.slice(1).map(terminar)
  }
  return conEstado({
    principal,
    alternativas,
    ...(descanso ? { descanso } : {}),
    ...(ventana ? { proximaVentanaIntensa: ventana } : {}),
  })
}
