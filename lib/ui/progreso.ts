export function fraccionSegura(valor: number): number {
  if (Number.isNaN(valor)) return 0
  return Math.min(1, Math.max(0, valor))
}

export const porcentaje = (valor: number): number => Math.round(fraccionSegura(valor) * 100)
