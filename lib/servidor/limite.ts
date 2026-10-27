// Espera tras varios fallos seguidos de contraseña desde la misma IP. En memoria: basta para un solo usuario (se
// reinicia con cada despliegue o instancia nueva).
export function crearLimitador(max = 5, esperaMs = 60_000) {
  const fallos = new Map<string, { n: number; ultimo: number }>()
  return {
    bloqueado(ip: string, ahoraMs: number): boolean {
      const f = fallos.get(ip)
      return f !== undefined && f.n >= max && ahoraMs - f.ultimo < esperaMs
    },
    fallo(ip: string, ahoraMs: number): void {
      const f = fallos.get(ip)
      const previos = f && ahoraMs - f.ultimo < esperaMs ? f.n : 0
      fallos.set(ip, { n: previos + 1, ultimo: ahoraMs })
    },
    exito(ip: string): void {
      fallos.delete(ip)
    },
  }
}
