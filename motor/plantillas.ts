import { explicar } from './explicacion'
import { evaluacionVigente, lastreRepeaters } from './evaluacion'
import { VALORES } from './parametros'
import type { Bloque, Peticion, SesionPlan } from './propuesta-tipos'
import type { Sesion, TipoSesion } from './tipos'

const fmt = (x: number): string => String(x).replace('.', ',')

const CALENTAMIENTO_MIN = VALORES['P-49'].minutos
// Decisión de diseño de este tramo (no está en parametros.md): pausa entre los dos bloques de multipresa.
const PAUSA_ENTRE_BLOQUES_MIN = 5
const REGLETA_MM = VALORES['P-12'].regletaMinimaMm

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
  const previas = p.historial.filter((s) => s.tipo === 'multipresa-resistencia').length
  const { semanasConUnBloque, bloquesIniciales, bloquesDespues } = VALORES['P-04']
  const sesionesConUnBloque = semanasConUnBloque * VALORES['P-07'].sesionesPorSemana
  const deseados = previas < sesionesConUnBloque ? bloquesIniciales : bloquesDespues
  const bloqueMin = minutosBloqueMultipresa()
  const total = (n: number): number => CALENTAMIENTO_MIN + n * bloqueMin + (n - 1) * PAUSA_ENTRE_BLOQUES_MIN
  let n = deseados
  while (n >= 1 && total(n) > p.contexto.minutosDisponibles) n--
  if (n < 1) return null

  const kg = evaluacionVigente(p.evaluacion, p.fecha) ? lastreRepeaters(p.evaluacion!) : undefined
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
          notas: 'Completa todas las repeticiones sin llegar al fallo. Si aparece dolor, para.',
        },
      ],
      explicacion: explicar(
        'plantilla.multipresa',
        ['P-01', 'P-02', 'P-03', 'P-05', 'P-06', 'P-09', 'P-10'],
        'Repeaters submáximos 7 s colgado : 3 s descanso, 6 series de 7 repeticiones, 2,5 min entre series, en regleta de 20 mm semiarqueado y como mucho al 80 % de tu test.',
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

export function construirSesion(tipo: TipoSesion, p: Peticion): SesionPlan | null {
  switch (tipo) {
    case 'multipresa-resistencia':
      return construirMultipresa(p)
    case 'evaluacion-dedos':
      return construirEvaluacion(p)
    default:
      return null
  }
}
