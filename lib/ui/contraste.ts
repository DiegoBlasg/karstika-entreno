// Contraste WCAG 2.x entre dos colores #RRGGBB y lectura de los tokens de color de app/globals.css.

function canal(v: number): number {
  const s = v / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function luminancia(hex: string): number {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) throw new Error(`Color no válido: ${hex}`)
  const [r, g, b] = [m[1], m[2], m[3]].map((x) => canal(parseInt(x!, 16))) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number]
  return (claro + 0.05) / (oscuro + 0.05)
}

// Solo las declaraciones `--color-<nombre>: #RRGGBB;`.
export function tokensDeCss(css: string): Record<string, string> {
  const tokens: Record<string, string> = {}
  for (const m of css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) tokens[m[1]!] = m[2]!
  return tokens
}
