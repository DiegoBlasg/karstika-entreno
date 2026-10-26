import { VALORES } from './parametros'
import type { EvaluacionDedos } from './propuesta-tipos'
import { diaNumero } from './tiempo'

// Rangos de plausibilidad (decisión de diseño): protegen de errores al teclear el test, que harían prescribir
// el 80 % de un valor absurdo. Fuera de rango se rechaza y la interfaz debe pedir que se repita o corrija.
const PESO_MIN_KG = 30
const PESO_MAX_KG = 200
const LASTRE_MIN_FRACCION = -0.6   // descarga de hasta el 60 % del peso
const LASTRE_MAX_FRACCION = 1.0    // lastre de hasta el 100 % del peso (200 % del peso colgado)

function comprobar(e: EvaluacionDedos): void {
  if (!Number.isFinite(e.pesoCorporalKg) || e.pesoCorporalKg <= 0) {
    throw new Error(`pesoCorporalKg debe ser un número finito positivo: ${e.pesoCorporalKg}`)
  }
  if (!Number.isFinite(e.lastreKg)) throw new Error(`lastreKg debe ser un número finito: ${e.lastreKg}`)
  if (e.pesoCorporalKg < PESO_MIN_KG || e.pesoCorporalKg > PESO_MAX_KG) {
    throw new Error(`pesoCorporalKg fuera de rango plausible (${PESO_MIN_KG}-${PESO_MAX_KG} kg): ${e.pesoCorporalKg}`)
  }
  const min = LASTRE_MIN_FRACCION * e.pesoCorporalKg
  const max = LASTRE_MAX_FRACCION * e.pesoCorporalKg
  if (e.lastreKg < min || e.lastreKg > max) {
    throw new Error(`lastreKg fuera de rango plausible para ${e.pesoCorporalKg} kg (${min} a ${max} kg): ${e.lastreKg}`)
  }
}

// Resultado del test en % del peso corporal (P-17): (peso + lastre) / peso × 100.
export function fuerzaRelativa(e: EvaluacionDedos): number {
  comprobar(e)
  return ((e.pesoCorporalKg + e.lastreKg) / e.pesoCorporalKg) * 100
}

// Vigente si tiene a lo sumo 10 semanas (P-08: nunca más de 10 seguidas sin reevaluar).
export function evaluacionVigente(e: EvaluacionDedos | undefined, fecha: string): boolean {
  if (!e) return false
  const dias = diaNumero(fecha) - diaNumero(e.fecha)
  return dias >= 0 && dias <= VALORES['P-08'].semanasMaximasSinReevaluar * 7
}

// Lastre de los repeaters: `fraccion` de (peso + lastre del test) menos el peso, redondeado hacia abajo a 0,5 kg.
// La fracción nunca puede superar el tope de P-06 (80 %). Negativo significa descarga (banda o polea).
export function lastreRepeaters(e: EvaluacionDedos, fraccion: number = VALORES['P-06'].fraccionMaximaRepeaters): number {
  comprobar(e)
  if (!Number.isFinite(fraccion) || fraccion <= 0 || fraccion > VALORES['P-06'].fraccionMaximaRepeaters) {
    throw new Error(`La fracción de carga debe estar entre 0 y ${VALORES['P-06'].fraccionMaximaRepeaters}: ${fraccion}`)
  }
  const total = fraccion * (e.pesoCorporalKg + e.lastreKg)
  return Math.floor((total - e.pesoCorporalKg) * 2 + 1e-9) / 2 + 0
}
