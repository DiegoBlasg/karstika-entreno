import { explicar, type Explicacion } from './explicacion'
import type { ParametroId } from './metadatos'
import { VALORES } from './parametros'
import type { Peticion, Propuesta } from './propuesta-tipos'
import { esCargaAlta } from './seguridad'
import { diaNumero } from './tiempo'
import type { TipoSesion } from './tipos'

export interface Consejo {
  id: string
  texto: string
  explicacion: Explicacion
}

type Grupo = 'seguridad' | 'sesion' | 'general'

interface Definicion {
  id: string
  grupo: Grupo
  parametros: ParametroId[]
  aplica: (p: Peticion, r: Propuesta) => boolean
  texto: (p: Peticion) => string
}

const tipoPrincipal = (r: Propuesta): TipoSesion | undefined => r.principal?.sesion.tipo
const principalEs = (...tipos: TipoSesion[]) => (_p: Peticion, r: Propuesta): boolean => {
  const t = tipoPrincipal(r)
  return t !== undefined && tipos.includes(t)
}
const hayZona = (r: Propuesta, nivel: 'ambar' | 'rojo'): boolean =>
  r.estado !== undefined && Object.values(r.estado.zonas).includes(nivel)

// Catálogo fijo. Dentro de cada grupo, el orden desempata entre consejos que nunca se han mostrado (o igual de
// recientes): primero lo más específico de la sesión.
export const CONSEJOS: readonly Definicion[] = [
  {
    id: 'fisio-rojo',
    grupo: 'seguridad',
    parametros: ['P-43', 'P-44', 'P-46'],
    aplica: (_p, r) => hayZona(r, 'rojo'),
    texto: () => 'Con una zona en rojo, pide valoración a un fisioterapeuta antes de volver a cargarla. El motor no diagnostica.',
  },
  {
    id: 'vigilar-ambar',
    grupo: 'seguridad',
    parametros: ['P-43', 'P-45'],
    aplica: (_p, r) => hayZona(r, 'ambar') && !hayZona(r, 'rojo'),
    texto: () =>
      'Tienes una molestia en ámbar: no subas la carga de esa zona y para si el dolor aumenta. Si se repite en la próxima sesión o dura más de 7 días, pasa a rojo y toca fisioterapeuta.',
  },
  {
    id: 'miedo-caer',
    grupo: 'sesion',
    parametros: ['P-62'],
    aplica: (p, r) => p.limitantePrincipal === 'cabeza' && principalEs('via-cuerda-limite', 'pegues-proyecto')(p, r),
    texto: () =>
      'Si el miedo a caer te frena, practica caídas de forma gradual (cortas al principio, con quien te asegura avisado) y usa siempre la misma rutina de lectura antes de cada intento. No hay un protocolo probado: es un consejo, no una prescripción.',
  },
  {
    id: 'lectura-via',
    grupo: 'sesion',
    parametros: ['P-53'],
    aplica: principalEs('via-cuerda-limite', 'pegues-proyecto'),
    texto: () =>
      `Antes de cada intento a vista o del primer pegue, lee la vía hasta ${VALORES['P-53'].minutosPrevisualizacion} min: secuencia de pasos y dónde reposar.`,
  },
  {
    id: 'descanso-pegues',
    grupo: 'sesion',
    parametros: ['P-51', 'P-61'],
    aplica: principalEs('pegues-proyecto', 'via-cuerda-limite', 'bloque-limite'),
    texto: () =>
      `Entre intentos al límite deja al menos 20 min con recuperación activa suave (caminar o pedalear), y no pases de ${VALORES['P-61'].maxIntentos} intentos al límite en la sesión.`,
  },
  {
    id: 'reposos-via',
    grupo: 'sesion',
    parametros: ['P-52'],
    aplica: principalEs('via-cuerda-limite', 'resistencia-4x4', 'pegues-proyecto'),
    texto: () => 'En los reposos, sacude el antebrazo con el brazo colgando; no apoyes la mano en la presa.',
  },
  {
    id: 'video-tecnica',
    grupo: 'sesion',
    parametros: ['P-55'],
    aplica: principalEs('tecnica'),
    texto: () => 'Grábate en alguna vía y compara tu ejecución con la de alguien que la hace bien.',
  },
  {
    id: 'calentamiento',
    grupo: 'sesion',
    parametros: ['P-49'],
    aplica: (_p, r) => r.principal !== null && esCargaAlta(r.principal.sesion),
    texto: () => `No te saltes el calentamiento: unos ${VALORES['P-49'].minutos} min de menos a más antes de lo intenso.`,
  },
  {
    id: 'sueno',
    grupo: 'general',
    parametros: ['P-56'],
    aplica: () => true,
    texto: () => 'Prioriza dormir bien, sobre todo alrededor de las sesiones intensas. No hay una cifra de horas probada en escaladores.',
  },
  {
    id: 'proteina',
    grupo: 'general',
    parametros: ['P-57'],
    aplica: () => true,
    texto: (p) => {
      const g = Math.round((VALORES['P-57'].gramosPorKg * p.perfil.pesoKg) / 5) * 5
      return `Como orientación, no como prescripción: unos ${String(VALORES['P-57'].gramosPorKg).replace('.', ',')} g de proteína por kg al día en total (con tu peso, unos ${g} g).`
    },
  },
  {
    id: 'peso',
    grupo: 'general',
    parametros: ['P-58'],
    aplica: () => true,
    texto: () => 'El plan no te pone ningún objetivo de peso ni de grasa corporal: explican muy poco del rendimiento en escalada.',
  },
  {
    id: 'suplementos',
    grupo: 'general',
    parametros: ['P-59'],
    aplica: () => true,
    texto: () =>
      'El plan no prescribe suplementos: la cafeína no mejoró el rendimiento en escaladores y la creatina no está estudiada en escalada.',
  },
]

const ORDEN_GRUPO: Record<Grupo, number> = { seguridad: 0, sesion: 1, general: 2 }

// P-66: como mucho 2 consejos. Primero los de seguridad (se repiten siempre que apliquen); después los de la
// sesión y los generales, saltando los mostrados en los últimos 7 días y empezando por los que hace más que no ves.
export function elegirConsejos(p: Peticion, propuesta: Propuesta): Consejo[] {
  const hoy = diaNumero(p.fecha)
  const { maxConsejos, diasSinRepetir } = VALORES['P-66']
  const ultimaVez = new Map<string, number>()
  for (const m of p.consejosMostrados ?? []) {
    const d = diaNumero(m.fecha)
    if (d <= hoy && d > (ultimaVez.get(m.id) ?? -Infinity)) ultimaVez.set(m.id, d)
  }
  return CONSEJOS.map((c, i) => ({ c, i, ultima: ultimaVez.get(c.id) }))
    .filter(({ c, ultima }) => c.aplica(p, propuesta) && (c.grupo === 'seguridad' || ultima === undefined || hoy - ultima >= diasSinRepetir))
    .sort(
      (a, b) =>
        ORDEN_GRUPO[a.c.grupo] - ORDEN_GRUPO[b.c.grupo] ||
        (a.c.grupo === 'seguridad' ? 0 : (a.ultima ?? -Infinity) - (b.ultima ?? -Infinity)) ||
        a.i - b.i,
    )
    .slice(0, maxConsejos)
    .map(({ c }) => {
      const texto = c.texto(p)
      return { id: c.id, texto, explicacion: explicar(`consejo.${c.id}`, c.parametros, texto) }
    })
}
