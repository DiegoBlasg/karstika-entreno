// Sesión de acceso: una cookie "<caducidad en s>.<HMAC-SHA256 de la caducidad>" en base64url. Web Crypto, para que
// funcione igual en proxy.ts y en las Server Actions.
const codificador = new TextEncoder()

export const NOMBRE_COOKIE = 'entreno_sesion'
export const DURACION_SESION_S = 90 * 24 * 3600

function comprobarSecreto(secreto: string): void {
  if (secreto.length < 32) throw new Error('SECRETO_SESION debe tener al menos 32 caracteres')
}

function clave(secreto: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', codificador.encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

function aBase64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function desdeBase64url(s: string): Uint8Array<ArrayBuffer> {
  const binario = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4))
  return Uint8Array.from(binario, (c) => c.charCodeAt(0))
}

export async function firmarSesion(secreto: string, ahoraS: number): Promise<string> {
  comprobarSecreto(secreto)
  const caduca = String(Math.floor(ahoraS) + DURACION_SESION_S)
  const firma = await crypto.subtle.sign('HMAC', await clave(secreto), codificador.encode(caduca))
  return `${caduca}.${aBase64url(firma)}`
}

export async function sesionValida(valor: string | undefined, secreto: string, ahoraS: number): Promise<boolean> {
  comprobarSecreto(secreto)
  if (!valor) return false
  const partes = valor.split('.')
  const [caduca, firma] = partes
  if (partes.length !== 2 || !caduca || !firma || !/^\d+$/.test(caduca) || Number(caduca) <= ahoraS) return false
  let bytes: Uint8Array<ArrayBuffer>
  try {
    bytes = desdeBase64url(firma)
  } catch {
    return false
  }
  return crypto.subtle.verify('HMAC', await clave(secreto), bytes, codificador.encode(caduca))
}

// Compara los resúmenes SHA-256 byte a byte, sin cortar en el primer carácter distinto.
export async function claveCorrecta(recibida: string, esperada: string): Promise<boolean> {
  if (esperada === '') return false
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', codificador.encode(recibida)),
    crypto.subtle.digest('SHA-256', codificador.encode(esperada)),
  ])
  const x = new Uint8Array(a)
  const y = new Uint8Array(b)
  let diferencia = 0
  for (let i = 0; i < x.length; i++) diferencia |= x[i]! ^ y[i]!
  return diferencia === 0
}
