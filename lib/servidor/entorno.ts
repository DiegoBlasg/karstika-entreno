export function variable(nombre: 'DATABASE_URL' | 'CLAVE_ACCESO' | 'SECRETO_SESION'): string {
  const v = process.env[nombre]
  if (!v) throw new Error(`Falta la variable de entorno ${nombre}`)
  return v
}
