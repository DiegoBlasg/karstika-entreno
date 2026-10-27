// Identidad de una base de Neon: servidor (sin el sufijo -pooler de la primera etiqueta) y nombre de la base.
// Dos URLs con la misma identidad apuntan a la misma base aunque difieran en pooler o en parámetros.
export function identidadBd(url: string): string {
  const u = new URL(url)
  const [primera = '', ...resto] = u.hostname.toLowerCase().split('.')
  const host = [primera.replace(/-pooler$/, ''), ...resto].join('.')
  return `${host}/${decodeURIComponent(u.pathname.replace(/^\//, '')).toLowerCase()}`
}
