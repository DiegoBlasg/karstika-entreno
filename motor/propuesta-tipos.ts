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

export interface Peticion {
  fecha: string
  horaInicio: number
  contexto: Contexto
  perfil: Perfil
  historial: Sesion[]
  fase: Fase
  evaluacion?: EvaluacionDedos
}

export interface Propuesta {
  principal: SesionPlan | null
  alternativas: SesionPlan[]                      // 0 a 2, de tipos distintos entre sí y de la principal
  descanso?: Explicacion
  proximaVentanaIntensa?: { fecha: string }       // primer día en que vuelve a caber una sesión intensa de dedos
}
