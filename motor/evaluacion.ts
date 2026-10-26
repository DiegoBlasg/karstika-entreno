import { VALORES } from './parametros'
import type { EvaluacionDedos } from './propuesta-tipos'
import { diaNumero } from './tiempo'

function comprobar(e: EvaluacionDedos): void {
  if (!Number.isFinite(e.pesoCorporalKg) || e.pesoCorporalKg <= 0) {
    throw new Error(`pesoCorporalKg debe ser un número finito positivo: ${e.pesoCorporalKg}`)
  }
  if (!Number.isFinite(e.lastreKg)) throw new Error(`lastreKg debe ser un número finito: ${e.lastreKg}`)
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

// Lastre de los repeaters: 80 % de (peso + lastre del test) menos el peso (P-06), redondeado hacia abajo a 0,5 kg
// para no superar nunca el 80 %. Negativo significa descarga (banda o polea).
export function lastreRepeaters(e: EvaluacionDedos): number {
  comprobar(e)
  const total = VALORES['P-06'].fraccionMaximaRepeaters * (e.pesoCorporalKg + e.lastreKg)
  return Math.floor((total - e.pesoCorporalKg) * 2 + 1e-9) / 2 + 0
}
