// Las claves `cronometro:<id>` y `cronometro:<id>:test` que el navegador guarda por sesión. Puro.
const CLAVE = /^cronometro:([^:]+)(:test)?$/

// De las claves del almacenamiento, las del cronómetro cuya sesión ya no está entre las pendientes de hoy.
export function clavesObsoletas(claves: readonly string[], pendientesHoy: readonly string[]): string[] {
  const vigentes = new Set(pendientesHoy)
  return claves.filter((c) => {
    const m = CLAVE.exec(c)
    return m !== null && !vigentes.has(m[1]!)
  })
}
