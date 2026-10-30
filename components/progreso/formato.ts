// Formatos cortos de la pantalla Progreso (fechas «30 oct», cifras con coma decimal).
const CORTA = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export function fechaCorta(fecha: string): string {
  return CORTA.format(new Date(`${fecha}T12:00:00Z`)).replace('.', '').replace(' ', ' ') // «5 ago» nunca se parte
}

const CIFRA = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 })

export function cifra(n: number): string {
  return CIFRA.format(n)
}

export function plural(n: number, singular: string, varios: string): string {
  return `${n} ${n === 1 ? singular : varios}`
}
