import { restriccionesDe } from './autorregulacion'
import { explicar, type Explicacion } from './explicacion'
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

function minutosBloqueMultipresa(seriesPorBloque: number = VALORES['P-03'].seriesPorBloque): number {
  const { trabajoS, descansoS } = VALORES['P-02']
  const { repeticionesPorSerie } = VALORES['P-03']
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

const TIPOS_MULTIPRESA_PROGRESION: readonly TipoSesion[] = ['multipresa-resistencia', 'multipresa-resistencia-fuerza']

// Progresión común a las multipresas. Solo cuentan las anteriores al día de la petición (no las futuras ya
// planificadas). Una sola subida cada vez (P-11): primero el volumen (1 → 2 bloques, P-04) y, otras tantas
// sesiones después, la carga (70 % → 80 %). Decisión de diseño en la dirección segura.
// Con seguimiento (tramo 2d), solo cuentan las sesiones válidas (P-11: registradas, dentro del RPE objetivo y sin
// dolor en dedos o muñeca). Tras una molestia en dedos o muñeca se vuelve al escalón anterior al de ese momento
// (P-46) y desde ahí se progresa de nuevo. Escalones: 0 = 1 bloque al 70 %, 1 = 2 bloques al 70 %, 2 = 80 %.
function progresionMultipresa(p: Peticion, tipos: readonly TipoSesion[] = TIPOS_MULTIPRESA_PROGRESION) {
  const hoy = diaNumero(p.fecha)
  const noValidas = new Set(p.estado?.sesionesNoValidas ?? [])
  const lista = p.historial.filter((s) => tipos.includes(s.tipo) && diaNumero(s.fecha) < hoy && !noValidas.has(s.id))
  const sesionesConUnBloque = VALORES['P-04'].semanasConUnBloque * VALORES['P-07'].sesionesPorSemana
  let previas = lista.length
  let retornoP46 = false
  const retorno = p.estado?.retornoP46
  if (retorno) {
    const f = diaNumero(retorno.fecha)
    const antes = lista.filter((s) => diaNumero(s.fecha) <= f).length
    const escalon = antes < sesionesConUnBloque ? 0 : antes < 2 * sesionesConUnBloque ? 1 : 2
    const efectivas = Math.max(0, escalon - 1) * sesionesConUnBloque + (lista.length - antes)
    if (efectivas < previas) {
      previas = efectivas
      retornoP46 = true
    }
  }
  const inicial = previas < 2 * sesionesConUnBloque
  const fraccion = inicial ? FRACCION_INICIAL_REPEATERS : VALORES['P-06'].fraccionMaximaRepeaters
  const kg = evaluacionVigente(p.evaluacion, p.fecha) ? lastreRepeaters(p.evaluacion!, fraccion) : undefined
  return { previas, sesionesConUnBloque, inicial, kg, porcentaje: Math.round(fraccion * 100), retornoP46 }
}

const TEXTO_P46 = ' Tras tu última molestia en dedos o muñeca, la progresión vuelve un escalón atrás y sube de nuevo con sesiones sin dolor (P-46).'

function notasCarga(kg: number | undefined, porcentaje: number): string {
  return kg === undefined
    ? 'No hay test vigente: carga por esfuerzo percibido. Completa todas las repeticiones sin llegar al fallo. Si aparece dolor, para.'
    : `Carga al ${porcentaje} % de tu test. Completa todas las repeticiones sin llegar al fallo. Si aparece dolor, para.`
}

function construirMultipresa(p: Peticion): SesionPlan | null {
  const { previas, sesionesConUnBloque, inicial, kg, porcentaje, retornoP46 } = progresionMultipresa(p)
  const { bloquesIniciales, bloquesDespues } = VALORES['P-04']
  const { trabajoS, descansoS } = VALORES['P-02']
  const { repeticionesPorSerie } = VALORES['P-03']
  // Descarga (P-48): un solo bloque con la mitad de series, misma carga y frecuencia.
  const seriesPorBloque = p.fase.descarga ? VALORES['P-03'].seriesPorBloque / 2 : VALORES['P-03'].seriesPorBloque
  // En descarga y en la fase de rendimiento (mantenimiento) basta un bloque.
  const unBloque = p.fase.descarga || p.fase.id === 'rendimiento'
  const deseados = unBloque ? 1 : previas < sesionesConUnBloque ? bloquesIniciales : bloquesDespues
  const bloqueMin = minutosBloqueMultipresa(seriesPorBloque)
  const total = (n: number): number => CALENTAMIENTO_MIN + n * bloqueMin + (n - 1) * PAUSA_ENTRE_BLOQUES_MIN
  let n = deseados
  while (n >= 1 && total(n) > p.contexto.minutosDisponibles) n--
  if (n < 1) return null
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
          notas: notasCarga(kg, porcentaje),
        },
      ],
      explicacion: explicar(
        'plantilla.multipresa',
        [
          ...(p.fase.descarga
            ? (['P-01', 'P-02', 'P-03', 'P-05', 'P-06', 'P-09', 'P-10', 'P-48'] as const)
            : (['P-01', 'P-02', 'P-03', 'P-04', 'P-05', 'P-06', 'P-09', 'P-10', 'P-11'] as const)),
          ...(retornoP46 ? (['P-46'] as const) : []),
        ],
        `${p.fase.descarga ? 'Semana de descarga: la mitad de series en un solo bloque. ' : ''}Repeaters submáximos 7 s colgado : 3 s descanso, ${seriesPorBloque} series de 7 repeticiones, 2,5 min entre series, en regleta de 20 mm semiarqueado, ${
          kg === undefined
            ? 'por esfuerzo percibido porque no hay un test vigente'
            : `al ${porcentaje} % de tu test (${inicial ? `durante las primeras ${2 * sesionesConUnBloque} sesiones, por prudencia` : 'el tope de P-06'})`
        }. Volumen y carga suben de uno en uno: primero de 1 a 2 bloques y después del 70 % al 80 %.${retornoP46 ? TEXTO_P46 : ''}`,
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

// Resistencia de fuerza en multipresa (P-36, A): 10 s : 5 s, 5 repeticiones, 4 series, 60 s entre series. En
// descarga, la mitad de series. Misma progresión de carga que los repeaters.
function construirMultipresaResistenciaFuerza(p: Peticion): SesionPlan | null {
  // Protocolo nuevo, progresión propia (P-11): vuelve a empezar al 70 % aunque haya repeaters previos.
  const { kg, porcentaje, retornoP46 } = progresionMultipresa(p, ['multipresa-resistencia-fuerza'])
  const { trabajoS, descansoS, repeticiones, descansoSeriesS } = VALORES['P-36']
  const series = p.fase.descarga ? VALORES['P-36'].series / 2 : VALORES['P-36'].series
  const segundos = series * repeticiones * (trabajoS + descansoS) + (series - 1) * descansoSeriesS
  const bloqueMin = Math.max(5, Math.ceil(segundos / 60 / 5) * 5)
  const total = CALENTAMIENTO_MIN + bloqueMin
  if (total > p.contexto.minutosDisponibles) return null
  const bloques: Bloque[] = [
    bloqueCalentamiento(),
    {
      nombre: 'Resistencia de fuerza en multipresa',
      minutos: bloqueMin,
      ejercicios: [
        {
          nombre: `Suspensiones ${trabajoS} s : ${descansoS} s en regleta de ${REGLETA_MM} mm, agarre semiarqueado`,
          series,
          repeticiones,
          trabajoS,
          descansoS,
          descansoSeriesS,
          ...(kg !== undefined ? { cargaKg: kg } : {}),
          cargaTexto: cargaMultipresa(kg),
          notas: notasCarga(kg, porcentaje),
        },
      ],
      explicacion: explicar(
        'plantilla.multipresa-resistencia-fuerza',
        [...(p.fase.descarga ? (['P-36', 'P-06', 'P-09', 'P-10', 'P-48'] as const) : (['P-36', 'P-06', 'P-09', 'P-10', 'P-11'] as const)), ...(retornoP46 ? (['P-46'] as const) : [])],
        `${p.fase.descarga ? 'Semana de descarga: la mitad de series. ' : ''}Resistencia de fuerza: ${trabajoS} s colgado : ${descansoS} s de descanso, ${repeticiones} repeticiones, ${series} series y 1 min entre series, en regleta de 20 mm semiarqueado. La carga (70 % y después 80 % del test) es la de los repeaters (P-06): P-36 no fija intensidad para este perfil.${retornoP46 ? TEXTO_P46 : ''}`,
      ),
    },
  ]
  return plan(
    sesionDe('multipresa-resistencia-fuerza', p, total, 'alta', {
      regletaMm: REGLETA_MM, agarre: 'semiarqueado', conCarga: kg !== undefined && kg > 0,
    }),
    bloques,
  )
}

// 4x4 (P-37, diseño): 4 bloques fáciles, 4 vueltas, 4 min entre vueltas (cada vuelta ≈ 4 min). En descarga, 2 vueltas.
function construir4x4(p: Peticion): SesionPlan | null {
  const { bloques: nBloques, descansoVueltaMin } = VALORES['P-37']
  const vueltas = p.fase.descarga ? VALORES['P-37'].vueltas / 2 : VALORES['P-37'].vueltas
  const minutosVuelta = nBloques // unos 1 min por bloque fácil
  const principal = Math.ceil((vueltas * minutosVuelta + (vueltas - 1) * descansoVueltaMin) / 5) * 5
  const total = CALENTAMIENTO_MIN + PROGRESIVOS_BLOQUE_MIN + principal
  if (total > p.contexto.minutosDisponibles) return null
  const bloques: Bloque[] = [
    bloqueCalentamiento(),
    {
      nombre: 'Bloques progresivos',
      minutos: PROGRESIVOS_BLOQUE_MIN,
      ejercicios: [{ nombre: '3-4 bloques por debajo de tu nivel, de menos a más', cargaTexto: 'Esfuerzo percibido 5–7 de 10' }],
      explicacion: explicar('plantilla.progresivos', ['P-49'], 'Antes del 4x4 se sube la intensidad poco a poco.'),
    },
    {
      nombre: '4x4',
      minutos: principal,
      ejercicios: [
        {
          nombre: `${nBloques} bloques fáciles para tu nivel encadenados, ${vueltas} vueltas`,
          series: vueltas,
          repeticiones: nBloques,
          descansoSeriesS: descansoVueltaMin * 60,
          cargaTexto: 'Esfuerzo alto por el bombeo, 7–8 de 10',
          notas: 'Bloques fáciles: el objetivo es el bombeo acumulado, no la dificultad. Para ante cualquier dolor.',
        },
      ],
      explicacion: explicar(
        'plantilla.4x4',
        p.fase.descarga ? ['P-37', 'P-48'] : ['P-37'],
        `${p.fase.descarga ? 'Semana de descarga: la mitad de vueltas. ' : ''}4x4: ${nBloques} bloques fáciles, ${vueltas} vueltas y 4 min de descanso entre vueltas (decisión de diseño, sin estudio directo).`,
      ),
    },
  ]
  return plan(sesionDe('resistencia-4x4', p, total, 'alta'), bloques)
}

// Pegues a un proyecto en roca (P-61: como mucho 4 intentos; P-51: 20 min de recuperación activa entre ellos).
const CALENTAMIENTO_ROCA_MIN = 20

function construirPegues(p: Peticion): SesionPlan | null {
  const total = (n: number): number => CALENTAMIENTO_ROCA_MIN + n * INTENTO_VIA_MIN
  let n = VALORES['P-61'].maxIntentos
  while (n >= 1 && total(n) > p.contexto.minutosDisponibles) n--
  if (n < 1) return null
  const bloques: Bloque[] = [
    {
      nombre: 'Calentamiento en roca',
      minutos: CALENTAMIENTO_ROCA_MIN,
      ejercicios: [{ nombre: '2-3 vías fáciles de menos a más', cargaTexto: 'Esfuerzo percibido 3–6 de 10' }],
      explicacion: explicar('plantilla.calentamiento', ['P-49'], 'Calentamiento específico de menos a más antes de los pegues.'),
    },
  ]
  for (let i = 1; i <= n; i++) {
    bloques.push({
      nombre: `Pegue ${i} al proyecto`,
      minutos: INTENTO_VIA_MIN,
      ejercicios: [
        {
          nombre: 'Pegue a tu proyecto: trabaja las secuencias o intenta encadenar',
          cargaTexto: 'Esfuerzo máximo, 9–10 de 10',
          notas: `Lee la vía hasta ${VALORES['P-53'].minutosPrevisualizacion} min antes. En los reposos, sacude el brazo colgando. Después, 20 min de recuperación activa suave, no reposo pasivo.`,
        },
      ],
      explicacion: explicar(
        'plantilla.pegues',
        ['P-51', 'P-52', 'P-53', 'P-61'],
        `Hasta ${VALORES['P-61'].maxIntentos} pegues al límite por sesión, con lectura previa, reposos sacudiendo y al menos 20 min de recuperación activa entre ellos.`,
      ),
    })
  }
  return plan(sesionDe('pegues-proyecto', p, total(n), 'alta'), bloques)
}

// Ejemplo de la carga del test de resistencia con el último test vigente (la carga real sale del máximo de hoy).
function ejemploResistencia(p: Peticion, fraccion: number): string {
  if (!p.evaluacion || !evaluacionVigente(p.evaluacion, p.fecha)) return ''
  const { pesoCorporalKg: peso, lastreKg: lastre } = p.evaluacion
  const kg = Math.floor((fraccion * (peso + lastre) - peso) * 2 + 1e-9) / 2 + 0
  const texto = kg > 0 ? `+${fmt(kg)} kg de lastre` : kg < 0 ? `${fmt(-kg)} kg de descarga` : 'solo tu peso corporal'
  return `Con tu último test (${fmt(peso)} kg y ${fmt(lastre)} kg de lastre) serían ${texto}. `
}

// Tras el test máximo, si hay tiempo: 10 min de descanso y el test de resistencia intermitente (P-24). Las duraciones
// de los bloques son decisión de diseño.
const DESCANSO_ENTRE_TESTS_MIN = 10
const TEST_RESISTENCIA_MIN = 5

function construirEvaluacion(p: Peticion): SesionPlan | null {
  const subidaMin = 5
  const testMin = 15
  const soloMaximo = CALENTAMIENTO_MIN + subidaMin + testMin
  if (soloMaximo > p.contexto.minutosDisponibles) return null
  const conResistencia = soloMaximo + DESCANSO_ENTRE_TESTS_MIN + TEST_RESISTENCIA_MIN <= p.contexto.minutosDisponibles
  const total = conResistencia ? soloMaximo + DESCANSO_ENTRE_TESTS_MIN + TEST_RESISTENCIA_MIN : soloMaximo
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
  if (conResistencia) {
    const { trabajoS, descansoS, fraccion } = VALORES['P-24']
    bloques.push(
      {
        nombre: 'Descanso entre tests',
        minutos: DESCANSO_ENTRE_TESTS_MIN,
        ejercicios: [{ nombre: 'Descanso suave, sin colgarte', cargaTexto: 'Sin esfuerzo' }],
        explicacion: explicar('plantilla.descanso-tests', ['P-24'], 'Se descansa antes del test de resistencia para no mezclar la fatiga del máximo.'),
      },
      {
        nombre: 'Test de resistencia intermitente',
        minutos: TEST_RESISTENCIA_MIN,
        ejercicios: [
          {
            nombre: `Suspensiones ${trabajoS} s : ${descansoS} s al ${Math.round(fraccion * 100)} % de tu máximo de hoy, hasta el fallo`,
            trabajoS,
            descansoS,
            cargaTexto: `Carga total = ${fmt(fraccion)} × (tu peso + el lastre de tu mejor intento de hoy). Lastre = esa carga − tu peso; si sale negativo, quita ese peso con polea o banda`,
            notas: `${ejemploResistencia(p, fraccion)}Si necesitas descarga y no tienes polea, haz este test en el rocódromo. Apunta los segundos totales hasta no poder completar una repetición. Después, puntúa tu técnica de 1 a 7 (paso alto, drop knee, talón, pies precisos) sobre un vídeo tuyo.`,
          },
        ],
        explicacion: explicar(
          'plantilla.test-resistencia',
          ['P-24', 'P-27'],
          'Test intermitente 7 s : 3 s al 60 % de la fuerza máxima hasta el fallo (resultado en segundos) y autoevaluación técnica de 1 a 7.',
        ),
      },
    )
  }
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

// Modalidad de la práctica técnica según el contexto: en roca, vías por debajo del nivel; con compañero en el
// rocódromo, vías con cuerda; sin compañero, bloque y autoaseguradas (nunca cuerda).
function modalidadTecnica(p: Peticion): string {
  if (p.contexto.lugar === 'roca') return 'Vías por debajo de tu nivel en roca'
  if (p.contexto.compania === 'con-gente') return 'Vías con cuerda de nivel cómodo'
  return 'Bloque y vías autoaseguradas de nivel cómodo'
}

function construirTecnica(p: Peticion): SesionPlan | null {
  const modalidad = modalidadTecnica(p)
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

// Con 40 min o más se añaden antagonistas y movilidad (decisión del usuario: días en casa de la fase base).
const ANTAGONISTAS_MOVILIDAD_MIN = 20

const hombroSinCarga = (p: Peticion): boolean => p.estado !== undefined && restriccionesDe(p.estado).hombroSinCarga

const explicacionHombroSinCarga = (): Explicacion =>
  explicar(
    'plantilla.hombro-sin-carga',
    ['P-41', 'P-43', 'P-64'],
    'Por tu semáforo de dolor, el trabajo de hombro va sin carga: solo movilidad y activación suave, los mismos minutos. Si duele, para.',
  )

function construirHombro(p: Peticion): SesionPlan | null {
  const activacionMin = 5
  const corto = activacionMin + VALORES['P-41'].minutos
  if (corto > p.contexto.minutosDisponibles) return null
  if (hombroSinCarga(p)) {
    return plan(sesionDe('hombro', p, corto, 'suave', { conCarga: false }), [
      {
        nombre: 'Movilidad y activación',
        minutos: activacionMin,
        ejercicios: [{ nombre: 'Movilidad de hombro y activación escapular suave', cargaTexto: 'Esfuerzo percibido 1–2 de 10' }],
        explicacion: explicacionHombroSinCarga(),
      },
      {
        nombre: 'Movilidad sin carga',
        minutos: VALORES['P-41'].minutos,
        ejercicios: [{ nombre: 'Movilidad de hombro, cadera y muñecas, sin peso ni bandas', cargaTexto: 'Sin esfuerzo', notas: 'Solo rangos sin dolor.' }],
        explicacion: explicacionHombroSinCarga(),
      },
    ])
  }
  const largo = corto + ANTAGONISTAS_MOVILIDAD_MIN <= p.contexto.minutosDisponibles
  const total = largo ? corto + ANTAGONISTAS_MOVILIDAD_MIN : corto
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
    ...(largo
      ? [
          {
            nombre: 'Antagonistas y movilidad',
            minutos: ANTAGONISTAS_MOVILIDAD_MIN,
            ejercicios: [
              { nombre: 'Empujes y extensores de dedos con banda', cargaTexto: 'Esfuerzo percibido 4–5 de 10' },
              { nombre: 'Movilidad de cadera, hombro y muñecas', cargaTexto: 'Sin esfuerzo' },
            ],
            explicacion: explicar(
              'plantilla.antagonistas',
              ['P-41'],
              'Antagonistas (extensores de dedos opcionales, P-41). La movilidad y los 20 minutos son decisión de diseño para completar el día en casa sin cargar los dedos.',
            ),
          },
        ]
      : []),
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
      if (hombroSinCarga(p)) {
        return {
          nombre: 'Complemento: movilidad de hombro sin carga',
          minutos,
          ejercicios: [{ nombre: 'Movilidad de hombro y activación escapular, sin peso ni bandas', cargaTexto: 'Sin esfuerzo' }],
          explicacion: explicacionHombroSinCarga(),
        }
      }
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
      const modalidad = modalidadTecnica(p)
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
  'multipresa-resistencia-fuerza', 'pegues-proyecto', 'resistencia-4x4', 'tecnica', 'via-cuerda-limite',
]

export function construirSesion(tipo: TipoSesion, p: Peticion): SesionPlan | null {
  switch (tipo) {
    case 'via-cuerda-limite':
      return construirViaLimite(p)
    case 'multipresa-resistencia-fuerza':
      return construirMultipresaResistenciaFuerza(p)
    case 'resistencia-4x4':
      return construir4x4(p)
    case 'pegues-proyecto':
      return construirPegues(p)
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
