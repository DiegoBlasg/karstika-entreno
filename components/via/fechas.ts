import { sumarDias } from '@/lib/fecha'

// Fechas cortas de la vía («12 ene»).
const CORTA = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
export const corta = (fecha: string): string => CORTA.format(new Date(`${fecha}T12:00:00Z`))

// Del lunes de la primera semana al domingo de la última: «12 ene – 22 feb».
export const rango = (primerLunes: string, ultimoLunes: string): string => `${corta(primerLunes)} – ${corta(sumarDias(ultimoLunes, 6))}`

export const sesiones = (n: number): string => (n === 1 ? '1 sesión' : `${n} sesiones`)
export const semanas = (n: number): string => (n === 1 ? '1 semana' : `${n} semanas`)
