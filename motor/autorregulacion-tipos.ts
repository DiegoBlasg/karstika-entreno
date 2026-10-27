import type { Explicacion } from './explicacion'

// Zonas de molestia (P-64), sin lado: una molestia en una mano ya limita la sesión entera.
export const ZONAS = ['dedos', 'muneca', 'codo', 'hombro', 'otra'] as const
export type Zona = (typeof ZONAS)[number]

export interface Molestia {
  zona: Zona
  dolor: number              // entero 0-10 (P-42)
  alarma?: boolean           // alguna señal de P-44: chasquido, hinchazón, pérdida de fuerza o de función…
}

// Lo que se apunta al terminar una sesión del historial.
export interface RegistroSesion {
  sesionId: string
  fecha: string              // la de la sesión
  rpe: number                // CR-10, 0-10 (P-34)
  duracionMin: number        // minutos reales
  molestias: Molestia[]      // solo las zonas con molestia; una zona no listada cuenta como dolor 0
}

// Chequeo al pedir sesión (P-65).
export interface Chequeo {
  fecha: string
  sueno: number              // 1-5 (5 = muy bien)
  fatiga: number             // 1-5 (5 = nada cansado)
  ganas: number              // 1-5
  molestias: Molestia[]
}

// Alta profesional: lo único que levanta un rojo (P-46).
export interface Alta {
  zona: Zona
  fecha: string
}

export interface Seguimiento {
  registros: RegistroSesion[]
  chequeos: Chequeo[]
  altas: Alta[]
}

export type Semaforo = 'verde' | 'ambar' | 'rojo'

export interface EstadoAtleta {
  zonas: Record<Zona, Semaforo>
  sinSubida: boolean                 // P-11 / P-43: última sesión por encima del objetivo, o alguna zona en ámbar
  descargaAdelantada?: { desde: string; hasta: string; motivo: 'rpe' | 'bienestar' }   // P-50
  chequeoBajoHoy: boolean            // P-65
  sesionesNoValidas: string[]        // no cuentan para progresar (P-11): sin registro, por encima o con dolor en dedos o muñeca
  retornoP46?: { fecha: string }     // última molestia (dolor 2 o más, o alarma) en dedos o muñeca
  explicaciones: Explicacion[]
}

// Lo que el estado impide hoy (P-64, P-65).
export interface Restricciones {
  sinCargaAlta: boolean      // ámbar en dedos, muñeca, codo u hombro, o chequeo de hoy bajo
  sinLimite: boolean         // ámbar en otra: sin sesiones al límite
  soloHombro: boolean        // rojo en dedos, muñeca o codo: quedan descanso y hombro sin carga
  soloDescanso: boolean      // rojo en hombro u otra
  hombroSinCarga: boolean    // ámbar en hombro, o soloHombro
  sinDominadas: boolean      // alguna de dedos, muñeca, codo u hombro no está en verde, o hay algún rojo
}
