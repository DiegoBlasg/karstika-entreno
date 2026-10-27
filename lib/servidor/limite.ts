// Espera tras varios intentos seguidos de contraseña desde la misma IP. En memoria y por instancia: basta para un solo
// usuario (se reinicia con cada despliegue o instancia nueva); lo que de verdad protege es una CLAVE_ACCESO larga.
//
// El intento se cuenta ANTES de comprobar la contraseña (intentar reserva un hueco de forma síncrona), así que las
// peticiones en paralelo no pueden pasar todas a la vez: como mucho `max` por ventana. Un acierto lo pone a cero.
export function crearLimitador(max = 5, esperaMs = 60_000) {
  const intentos = new Map<string, { n: number; ultimo: number }>()
  return {
    intentar(ip: string, ahoraMs: number): boolean {
      const f = intentos.get(ip)
      const previos = f && ahoraMs - f.ultimo < esperaMs ? f.n : 0
      if (previos >= max) return false
      intentos.set(ip, { n: previos + 1, ultimo: ahoraMs })
      return true
    },
    exito(ip: string): void {
      intentos.delete(ip)
    },
  }
}
