import { explicar } from './explicacion'
import { evaluacionVigente, lastreRepeaters } from './evaluacion'
import { VALORES } from './parametros'
import type { Bloque, Peticion, SesionPlan } from './propuesta-tipos'
import { diaNumero } from './tiempo'
import type { Sesion, TipoComplemento, TipoSesion } from './tipos'

const fmt = (x: number): string => String(x).replace('.', ',')

const CALENTAMIENTO_MIN = VALORES['P-49'].minutos
// Decisión de diseño de este tramo (no está en parametros.md): pausa entre los dos bloques de multipresa.
const PAUSA_ENTRE_BLOQUES_MIN = 5
const REGLETA_MM = VALORES['P-12'].regletaMinimaMm
// Decisión de diseño (dirección segura): las primeras semanas de multipresa se cuelga al 70 % del test; después,
// como mucho al tope del 80 % de P-06. El 80 % viene de escaladores avanzados y P-06 lo fija como techo, no como objetivo.
const FRACCION_INICIAL_REPEATERS = 0.7

function bloqueCalentamiento(): Bloque {
  return {
    nombre: 'Calentamiento específico',
    minutos: CALENTAMIENTO_MIN,
    ejercicios: [
      { nombre: 'Calentamiento de menos a más: movilidad, escalada fácil y agarres progresivos', cargaTexto: 'Esfuerzo percibido 2–4 de 10' },
    ],
    explicacion: explicar(
      'plantilla.calentamiento',
      ['P-49'],
      'Unos 10 minutos de calentamiento específico de escalada, de menos a más, antes de cualquier trabajo intenso.',
    ),
  }
}

function sesionDe(
  tipo: TipoSesion,
  p: Peticion,
  duracionMin: number,
  intensidad: Sesion['intensidad'],
  detalle?: Sesion['detalle'],
): Sesion {
  return {
    id: `propuesta-${tipo}`,
    tipo,
    intensidad,
    fecha: p.fecha,
    horaInicio: p.horaInicio,
    duracionMin,
    ...(detalle ? { detalle } : {}),
  }
}

function plan(sesion: Sesion, bloques: Bloque[]): SesionPlan {
  const suma = bloques.reduce((a, b) => a + b.minutos, 0)
  if (suma !== sesion.duracionMin) {
    throw new Error(`Los bloques de ${sesion.tipo} suman ${suma} min y la sesión dura ${sesion.duracionMin} min`)
  }
  return { sesion, bloques, explicaciones: bloques.map((b) => b.explicacion) }
}

function minutosBloqueMultipresa(): number {
  const { trabajoS, descansoS } = VALORES['P-02']
  const { repeticionesPorSerie, seriesPorBloque } = VALORES['P-03']
  const segundos =
    seriesPorBloque * repeticionesPorSerie * (trabajoS + descansoS) +
    (seriesPorBloque - 1) * VALORES['P-05'].descansoEntreSeriesS
  return Math.ceil(segundos / 60)
}

function cargaMultipresa(kg: number | undefined): string {
  if (kg === undefined) return 'Esfuerzo percibido 6–7 de 10, sin llegar al fallo'
  if (kg === 0) return 'Solo tu peso corporal'
  return kg > 0 ? `+${fmt(kg)} kg de lastre` : `descarga de ${fmt(-kg)} kg`
}

function construirMultipresa(p: Peticion): SesionPlan | null {
  // Solo cuentan las multipresas anteriores al día de la petición (no las futuras ya planificadas).
  const hoy = diaNumero(p.fecha)
  const previas = p.historial.filter((s) => s.tipo === 'multipresa-resistencia' && diaNumero(s.fecha) < hoy).length
  const { semanasConUnBloque, bloquesIniciales, bloquesDespues } = VALORES['P-04']
  const sesionesConUnBloque = semanasConUnBloque * VALORES['P-07'].sesionesPorSemana
  // Una sola subida cada vez (P-11): primero el volumen (1 → 2 bloques, P-04) y, otras tantas sesiones
  // después, la carga (70 % → 80 %). Decisión de diseño en la dirección segura.
  const deseados = previas < sesionesConUnBloque ? bloquesIniciales : bloquesDespues
  const inicial = previas < 2 * sesionesConUnBloque
  const bloqueMin = minutosBloqueMultipresa()
  const total = (n: number): number => CALENTAMIENTO_MIN + n * bloqueMin + (n - 1) * PAUSA_ENTRE_BLOQUES_MIN
  let n = deseados
  while (n >= 1 && total(n) > p.contexto.minutosDisponibles) n--
  if (n < 1) return null

  const fraccion = inicial ? FRACCION_INICIAL_REPEATERS : VALORES['P-06'].fraccionMaximaRepeaters
  const kg = evaluacionVigente(p.evaluacion, p.fecha) ? lastreRepeaters(p.evaluacion!, fraccion) : undefined
  const porcentaje = Math.round(fraccion * 100)
  const { trabajoS, descansoS } = VALORES['P-02']
  const { repeticionesPorSerie, seriesPorBloque } = VALORES['P-03']
  const bloques: Bloque[] = [bloqueCalentamiento()]
  for (let i = 1; i <= n; i++) {
    if (i > 1) {
      bloques.push({
        nombre: 'Pausa entre bloques',
        minutos: PAUSA_ENTRE_BLOQUES_MIN,
        ejercicios: [{ nombre: 'Descanso activo suave, sin colgarte', cargaTexto: 'Esfuerzo percibido 1–2 de 10' }],
        explicacion: explicar('plantilla.pausa', ['P-05'], 'Entre bloques de multipresa se descansa para llegar fresco al segundo.'),
      })
    }
    bloques.push({
      nombre: `Bloque de repeaters ${i}`,
      minutos: bloqueMin,
      ejercicios: [
        {
          nombre: `Repeaters en regleta de ${REGLETA_MM} mm, agarre semiarqueado`,
          series: seriesPorBloque,
          repeticiones: repeticionesPorSerie,
          trabajoS,
          descansoS,
          descansoSeriesS: VALORES['P-05'].descansoEntreSeriesS,
          ...(kg !== undefined ? { cargaKg: kg } : {}),
          cargaTexto: cargaMultipresa(kg),
          notas:
            kg === undefined
              ? 'No hay test vigente: carga por esfuerzo percibido. Completa todas las repeticiones sin llegar al fallo. Si aparece dolor, para.'
              : `Carga al ${porcentaje} % de tu test. Completa todas las repeticiones sin llegar al fallo. Si aparece dolor, para.`,
        },
      ],
      explicacion: explicar(
        'plantilla.multipresa',
        ['P-01', 'P-02', 'P-03', 'P-04', 'P-05', 'P-06', 'P-09', 'P-10', 'P-11'],
        `Repeaters submáximos 7 s colgado : 3 s descanso, 6 series de 7 repeticiones, 2,5 min entre series, en regleta de 20 mm semiarqueado, ${
          kg === undefined
            ? 'por esfuerzo percibido porque no hay un test vigente'
            : `al ${porcentaje} % de tu test (${inicial ? `durante las primeras ${2 * sesionesConUnBloque} sesiones, por prudencia` : 'el tope de P-06'})`
        }. Volumen y carga suben de uno en uno: primero de 1 a 2 bloques y después del 70 % al 80 %.`,
      ),
    })
  }
  const sesion = sesionDe('multipresa-resistencia', p, total(n), 'alta', {
    regletaMm: REGLETA_MM,
    agarre: 'semiarqueado',
    conCarga: kg !== undefined && kg > 0,
  })
  return plan(sesion, bloques)
}

function construirEvaluacion(p: Peticion): SesionPlan | null {
  const subidaMin = 5
  const testMin = 15
  const total = CALENTAMIENTO_MIN + subidaMin + testMin
  if (total > p.contexto.minutosDisponibles) return null
  const { duracionS, intentos, descansoS } = VALORES['P-18']
  const bloques: Bloque[] = [
    bloqueCalentamiento(),
    {
      nombre: 'Subida progresiva de carga',
      minutos: subidaMin,
      ejercicios: [
        {
          nombre: 'Suspensiones cortas y fáciles añadiendo lastre en escalones',
          cargaTexto: 'Esfuerzo percibido 3–6 de 10',
          notas: 'Prepara el test sin fatigarte.',
        },
      ],
      explicacion: explicar('plantilla.subida', ['P-18', 'P-49'], 'Antes del test se sube la carga en escalones tras el calentamiento.'),
    },
    {
      nombre: 'Test de fuerza máxima de dedos',
      minutos: testMin,
      ejercicios: [
        {
          nombre: `Suspensión máxima de ${duracionS} s en regleta de ${REGLETA_MM} mm, semiarqueado`,
          series: intentos,
          trabajoS: duracionS,
          descansoSeriesS: descansoS,
          cargaTexto: `Añade lastre en escalones hasta tu máximo de ${duracionS} s y apunta el mejor intento`,
          notas: 'Detente ante cualquier dolor. Vale el mejor intento completado.',
        },
      ],
      explicacion: explicar(
        'plantilla.evaluacion',
        ['P-17', 'P-18', 'P-09', 'P-10'],
        'Hasta 3 intentos de 10 s con 3 min de descanso, en regleta de 20 mm semiarqueado; el resultado se anota en % del peso corporal.',
      ),
    },
  ]
  const sesion = sesionDe('evaluacion-dedos', p, total, 'alta', {
    regletaMm: REGLETA_MM,
    agarre: 'semiarqueado',
    conCarga: true,
  })
  return plan(sesion, bloques)
}

// Decisiones de diseño de este tramo (duraciones de bloques que no están en parametros.md).
const BLOQUE_PRINCIPAL_MIN = 35

function bloquePrincipalMasCalentamiento(
  p: Peticion,
  nombre: string,
  ejercicios: Bloque['ejercicios'],
  explicacion: Bloque['explicacion'],
): { total: number; bloques: Bloque[] } | null {
  const total = CALENTAMIENTO_MIN + BLOQUE_PRINCIPAL_MIN
  if (total > p.contexto.minutosDisponibles) return null
  return {
    total,
    bloques: [bloqueCalentamiento(), { nombre, minutos: BLOQUE_PRINCIPAL_MIN, ejercicios, explicacion }],
  }
}

function construirBoard(p: Peticion): SesionPlan | null {
  const base = bloquePrincipalMasCalentamiento(
    p,
    'Bloques en board por debajo del máximo',
    [
      {
        nombre: '5 bloques en board, uno o dos grados por debajo de tu límite',
        series: 5,
        repeticiones: 3,
        descansoSeriesS: 180,
        cargaTexto: 'Esfuerzo percibido 6–7 de 10',
        notas: '3 intentos por bloque con 3 min de descanso. Para ante cualquier dolor.',
      },
    ],
    explicar(
      'plantilla.board',
      ['P-38', 'P-49'],
      'En la fase de fuerza, una sesión semanal de bloques en board por debajo del máximo; cuenta como sesión intensa de dedos.',
    ),
  )
  return base && plan(sesionDe('board', p, base.total, 'alta'), base.bloques)
}

function construirBloqueSuave(p: Peticion): SesionPlan | null {
  const base = bloquePrincipalMasCalentamiento(
    p,
    'Bloques cómodos',
    [
      {
        nombre: '4 bloques cómodos para tu nivel, variando tipos de presa',
        series: 4,
        cargaTexto: 'Esfuerzo percibido 3–5 de 10',
        notas: 'Sustituye a la sesión intensa cuando falta el día de descanso entre sesiones intensas de dedos.',
      },
    ],
    explicar('plantilla.bloque-suave', ['P-54'], 'Variar vías y tipos de presa mantiene la práctica técnica sin cargar los dedos.'),
  )
  return base && plan(sesionDe('bloque-suave', p, base.total, 'suave'), base.bloques)
}

function construirTecnica(p: Peticion): SesionPlan | null {
  const conCuerda = p.contexto.compania === 'con-gente' && p.contexto.lugar === 'rocodromo'
  const modalidad = conCuerda ? 'Vías con cuerda de nivel cómodo' : 'Bloque y vías autoaseguradas de nivel cómodo'
  const base = bloquePrincipalMasCalentamiento(
    p,
    'Práctica técnica',
    [
      { nombre: `${modalidad}, variando vías y tipos de presa`, series: 3, cargaTexto: 'Esfuerzo percibido 4–5 de 10' },
      {
        nombre: `Previsualiza la vía hasta ${VALORES['P-53'].minutosPrevisualizacion} min antes de cada intento`,
        cargaTexto: 'Sin esfuerzo',
      },
      { nombre: 'Graba al menos una vía en vídeo y revísala', cargaTexto: 'Sin esfuerzo' },
    ],
    explicar(
      'plantilla.tecnica',
      ['P-53', 'P-54', 'P-55'],
      'Práctica técnica variada, con lectura previa de hasta 3 min de la vía y vídeo para revisar la ejecución.',
    ),
  )
  return base && plan(sesionDe('tecnica', p, base.total, 'suave'), base.bloques)
}

function construirArc(p: Peticion): SesionPlan | null {
  const { series, minutosSerie, minutosSerieCorta, descansoMin } = VALORES['P-35']
  const total = (serieMin: number): number =>
    CALENTAMIENTO_MIN + series * serieMin + (series - 1) * descansoMin
  const serieMin = [minutosSerie, minutosSerieCorta].find((m) => total(m) <= p.contexto.minutosDisponibles)
  if (serieMin === undefined) return null
  const bloques: Bloque[] = [bloqueCalentamiento()]
  for (let i = 1; i <= series; i++) {
    if (i > 1) {
      bloques.push({
        nombre: 'Descanso entre series',
        minutos: descansoMin,
        ejercicios: [{ nombre: 'Descanso suave, hidrátate', cargaTexto: 'Sin esfuerzo' }],
        explicacion: explicar('plantilla.arc-descanso', ['P-35'], 'Entre las series de ARC se descansa 10 minutos.'),
      })
    }
    bloques.push({
      nombre: `Serie de ARC ${i}`,
      minutos: serieMin,
      ejercicios: [
        {
          nombre: `${serieMin} min de escalada continua sin bombeo marcado`,
          cargaTexto: 'Esfuerzo percibido 3–4 de 10',
          notas: 'Si notas bombeo, baja la dificultad.',
        },
      ],
      explicacion: explicar(
        'plantilla.arc',
        ['P-35'],
        'Capacidad: 2 series de 10-15 minutos de escalada continua sin bombeo marcado, con 10 minutos de descanso.',
      ),
    })
  }
  return plan(sesionDe('arc', p, total(serieMin), 'suave'), bloques)
}

function construirHombro(p: Peticion): SesionPlan | null {
  const activacionMin = 5
  const total = activacionMin + VALORES['P-41'].minutos
  if (total > p.contexto.minutosDisponibles) return null
  const bloques: Bloque[] = [
    {
      nombre: 'Movilidad y activación',
      minutos: activacionMin,
      ejercicios: [{ nombre: 'Movilidad de hombro y activación escapular suave', cargaTexto: 'Esfuerzo percibido 2–3 de 10' }],
      explicacion: explicar('plantilla.hombro-activacion', ['P-41'], 'Se activa el hombro antes del trabajo de fuerza.'),
    },
    {
      nombre: 'Hombro y antagonistas',
      minutos: VALORES['P-41'].minutos,
      ejercicios: [
        {
          nombre: 'Ejercicios de hombro en cadena cerrada, excéntricos y de fuerza',
          cargaTexto: 'Esfuerzo percibido 5–6 de 10',
          notas: 'Extensores de dedos: opcional.',
        },
      ],
      explicacion: explicar(
        'plantilla.hombro',
        ['P-41'],
        'Hombro en cadena cerrada, excéntricos y de fuerza, 2 veces por semana y 15 minutos (la dosis es decisión de diseño).',
      ),
    },
  ]
  return plan(sesionDe('hombro', p, total, 'suave'), bloques)
}

// Escalada al límite. Decisiones de diseño: 15 min de vías o bloques progresivos y, en vía, hasta 3 intentos
// (P-61 permite hasta 4) de unos 5 min, cada uno seguido de 20 min de recuperación activa (P-51).
const PROGRESIVAS_VIA_MIN = 15
const INTENTO_VIA_MIN = 25
const MAX_INTENTOS_VIA = 3
const PROGRESIVOS_BLOQUE_MIN = 10
const BLOQUES_LIMITE_MIN = [30, 20] as const

function construirViaLimite(p: Peticion): SesionPlan | null {
  const total = (n: number): number => CALENTAMIENTO_MIN + PROGRESIVAS_VIA_MIN + n * INTENTO_VIA_MIN
  let n = MAX_INTENTOS_VIA
  while (n >= 1 && total(n) > p.contexto.minutosDisponibles) n--
  if (n < 1) return null
  const bloques: Bloque[] = [
    bloqueCalentamiento(),
    {
      nombre: 'Vías progresivas',
      minutos: PROGRESIVAS_VIA_MIN,
      ejercicios: [
        { nombre: '2 vías con cuerda por debajo de tu nivel, de menos a más', series: 2, cargaTexto: 'Esfuerzo percibido 5–7 de 10' },
      ],
      explicacion: explicar('plantilla.progresivas', ['P-49'], 'Antes de los intentos al límite se sube la intensidad poco a poco.'),
    },
  ]
  for (let i = 1; i <= n; i++) {
    bloques.push({
      nombre: `Intento al límite ${i}`,
      minutos: INTENTO_VIA_MIN,
      ejercicios: [
        {
          nombre: 'Intento a una vía con cuerda en tu límite (una que no encadenas a vista)',
          cargaTexto: 'Esfuerzo máximo, 9–10 de 10',
          notas: `Lee la vía hasta ${VALORES['P-53'].minutosPrevisualizacion} min antes. En los reposos, sacude el brazo colgando. Después, 20 min de recuperación activa suave (pedalear o caminar), no reposo pasivo.`,
        },
      ],
      explicacion: explicar(
        'plantilla.via-limite',
        ['P-51', 'P-52', 'P-53', 'P-61'],
        'Intentos al límite con previsualización, reposos sacudiendo el antebrazo y al menos 20 min de recuperación activa entre intentos; como mucho 3 por sesión (P-61 admite 4).',
      ),
    })
  }
  return plan(sesionDe('via-cuerda-limite', p, total(n), 'alta'), bloques)
}

function construirBloqueLimite(p: Peticion): SesionPlan | null {
  const principal = BLOQUES_LIMITE_MIN.find(
    (m) => CALENTAMIENTO_MIN + PROGRESIVOS_BLOQUE_MIN + m <= p.contexto.minutosDisponibles,
  )
  if (principal === undefined) return null
  const bloques: Bloque[] = [
    bloqueCalentamiento(),
    {
      nombre: 'Bloques progresivos',
      minutos: PROGRESIVOS_BLOQUE_MIN,
      ejercicios: [{ nombre: '3-4 bloques por debajo de tu nivel, de menos a más', cargaTexto: 'Esfuerzo percibido 5–7 de 10' }],
      explicacion: explicar('plantilla.progresivos', ['P-49'], 'Antes de los bloques al límite se sube la intensidad poco a poco.'),
    },
    {
      nombre: 'Bloques al límite',
      minutos: principal,
      ejercicios: [
        {
          nombre: `Bloques cerca de tu límite durante ${principal} min`,
          cargaTexto: 'Esfuerzo alto, 8–9 de 10',
          notas: 'Hasta 4 intentos por bloque y 3-4 min de descanso entre intentos. Lee el bloque antes de cada intento. Para ante cualquier dolor.',
        },
      ],
      explicacion: explicar(
        'plantilla.bloque-limite',
        ['P-15', 'P-53'],
        'Bloque cerca del límite: cuenta como sesión intensa de dedos y se lee el problema antes de cada intento. La dosis es decisión de diseño.',
      ),
    },
  ]
  return plan(sesionDe('bloque-limite', p, CALENTAMIENTO_MIN + PROGRESIVOS_BLOQUE_MIN + principal, 'alta'), bloques)
}

// Bloques de complemento: sin calentamiento propio (la sesión ya está caliente). Devuelve null si no caben.
const TECNICA_COMPLEMENTO_MIN = 30

export function construirComplemento(tipo: TipoComplemento, p: Peticion, minutosLibres: number): Bloque | null {
  switch (tipo) {
    case 'hombro': {
      const minutos = VALORES['P-41'].minutos
      if (minutos > minutosLibres) return null
      return {
        nombre: 'Complemento: hombro y antagonistas',
        minutos,
        ejercicios: [{ nombre: 'Ejercicios de hombro en cadena cerrada, excéntricos y de fuerza', cargaTexto: 'Esfuerzo percibido 5–6 de 10' }],
        explicacion: explicar('plantilla.hombro', ['P-41'], 'Hombro en cadena cerrada, excéntricos y de fuerza, 15 minutos (la dosis es decisión de diseño).'),
      }
    }
    case 'arc': {
      const { minutosSerie, minutosSerieCorta } = VALORES['P-35']
      const minutos = [minutosSerie, minutosSerieCorta].find((m) => m <= minutosLibres)
      if (minutos === undefined) return null
      return {
        nombre: 'Complemento: ARC',
        minutos,
        ejercicios: [{ nombre: `${minutos} min de escalada continua sin bombeo marcado`, cargaTexto: 'Esfuerzo percibido 3–4 de 10' }],
        explicacion: explicar('plantilla.arc', ['P-35'], 'Una serie de escalada continua suave como volumen de capacidad al final de la sesión.'),
      }
    }
    case 'tecnica': {
      if (TECNICA_COMPLEMENTO_MIN > minutosLibres) return null
      const conCuerda = p.contexto.compania === 'con-gente' && p.contexto.lugar === 'rocodromo'
      const modalidad = conCuerda ? 'Vías con cuerda de nivel cómodo' : 'Bloque y vías autoaseguradas de nivel cómodo'
      return {
        nombre: 'Complemento: práctica técnica',
        minutos: TECNICA_COMPLEMENTO_MIN,
        ejercicios: [
          { nombre: `${modalidad}, variando vías y tipos de presa`, cargaTexto: 'Esfuerzo percibido 4–5 de 10' },
          { nombre: 'Graba al menos una vía en vídeo y revísala', cargaTexto: 'Sin esfuerzo' },
        ],
        explicacion: explicar('plantilla.tecnica', ['P-54', 'P-55'], 'Volumen técnico variado y con vídeo, a nivel cómodo.'),
      }
    }
  }
}

export const TIPOS_CON_PLANTILLA: readonly TipoSesion[] = [
  'arc', 'bloque-limite', 'bloque-suave', 'board', 'evaluacion-dedos', 'hombro', 'multipresa-resistencia',
  'tecnica', 'via-cuerda-limite',
]

export function construirSesion(tipo: TipoSesion, p: Peticion): SesionPlan | null {
  switch (tipo) {
    case 'via-cuerda-limite':
      return construirViaLimite(p)
    case 'bloque-limite':
      return construirBloqueLimite(p)
    case 'multipresa-resistencia':
      return construirMultipresa(p)
    case 'evaluacion-dedos':
      return construirEvaluacion(p)
    case 'board':
      return construirBoard(p)
    case 'bloque-suave':
      return construirBloqueSuave(p)
    case 'tecnica':
      return construirTecnica(p)
    case 'arc':
      return construirArc(p)
    case 'hombro':
      return construirHombro(p)
    default:
      return null
  }
}
