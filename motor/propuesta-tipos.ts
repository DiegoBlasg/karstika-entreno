import type { Explicacion } from './explicacion'
import type { Contexto, Perfil, Sesion, TipoSesion } from './tipos'

export interface Fase {
  id: string
  nombre: string
  cupos: Partial<Record<TipoSesion, number>>      // sesiones deseadas por cada 7 días
  prioridad: TipoSesion[]                         // de más a menos preferida
  prohibidos: TipoSesion[]
}

export interface EvaluacionDedos {
  fecha: string                                   // 'AAAA-MM-DD'
  pesoCorporalKg: number
  lastreKg: number                                // mejor intento de 10 s; negativo si fue con descarga
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
  proximaVentanaIntensa?: { fecha: string; hora: number }
}
