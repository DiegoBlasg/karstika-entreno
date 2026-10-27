import type { EstadoAtleta, Seguimiento } from './autorregulacion-tipos'
import type { Limitante } from './diagnostico'
import type { Explicacion } from './explicacion'
import type { Contexto, Perfil, Sesion, TipoSesion } from './tipos'

export type FaseId = 'base' | 'fuerza' | 'resistencia' | 'rendimiento' | 'transicion'

export interface Fase {
  id: FaseId
  nombre: string
  cupos: Partial<Record<TipoSesion, number>>      // sesiones deseadas por cada 7 días
  prioridad: TipoSesion[]                         // de más a menos preferida
  prohibidos: TipoSesion[]
  descarga?: boolean                              // semana de descarga (P-47, P-48): mitad de volumen, nada al límite
  reevaluar?: boolean                             // última semana de fase: toca repetir los tests (P-26)
  descargaSustituida?: boolean                    // la descarga programada de esta semana la cubrió una adelantada (P-50)
}

export interface EvaluacionDedos {
  fecha: string                                   // 'AAAA-MM-DD'
  pesoCorporalKg: number
  lastreKg: number                                // mejor intento de 10 s; negativo si fue con descarga
  resistenciaS?: number                           // test intermitente 7 s : 3 s al 60 % hasta el fallo (P-24)
  tecnica?: number                                // autoevaluación técnica de 1 a 7 sobre un vídeo (P-27)
}

export interface Ejercicio {
  nombre: string
  series?: number
  repeticiones?: number
  trabajoS?: number
  descansoS?: number
  descansoSeriesS?: number
  cargaKg?: number                                // lastre (negativo = descarga); ausente si va por sensación
  cargaTexto: string
  notas?: string
}

export interface Bloque {
  nombre: string
  minutos: number
  ejercicios: Ejercicio[]
  explicacion: Explicacion
}

export interface SesionPlan {
  sesion: Sesion                                  // para validar y guardar en el historial
  bloques: Bloque[]                               // la suma de minutos = sesion.duracionMin
  explicaciones: Explicacion[]                    // porqué de la elección + una por bloque
}

// Un hueco disponible más adelante en la semana (tramo 2e, P-67).
export interface Hueco {
  fecha: string                                   // 'AAAA-MM-DD'
  horaInicio: number
  contexto: Contexto
}

export interface Peticion {
  fecha: string
  horaInicio: number
  contexto: Contexto
  perfil: Perfil
  historial: Sesion[]
  fase: Fase
  evaluacion?: EvaluacionDedos
  seguimiento?: Seguimiento                       // registros, chequeos y altas (tramo 2d)
  // Lo calcula proponerSesion a partir de `seguimiento` para cada fecha que evalúa; no lo pases tú.
  estado?: EstadoAtleta
  limitantePrincipal?: Limitante                  // de diagnosticar (activa el consejo de miedo a caer)
  consejosMostrados?: { id: string; fecha: string }[]   // para no repetir consejos en 7 días (P-66)
  huecos?: Hueco[]                                // huecos posteriores hasta el domingo: el motor planifica la semana (P-67)
}

export interface Propuesta {
  principal: SesionPlan | null
  alternativas: SesionPlan[]                      // 0 a 2, de tipos distintos entre sí y de la principal
  descanso?: Explicacion
  proximaVentanaIntensa?: { fecha: string }       // primer día en que vuelve a caber una sesión intensa de dedos
  estado?: EstadoAtleta                           // con `seguimiento`: semáforo, freno, descarga adelantada y chequeo
  semana?: { hueco: Hueco; sesion: Sesion | null }[]   // con `huecos`: el plan del resto de la semana (P-67)
}
