// Acceso a la base de pruebas (E2E_DATABASE_URL). Se niega a trabajar con una base sin la marca _base_de_pruebas,
// que solo pone `npm run migrar:pruebas`: así un vaciado nunca puede tocar la base de producción.
import { neon } from '@neondatabase/serverless'

export async function sqlPruebas() {
  const url = process.env.E2E_DATABASE_URL
  if (!url) throw new Error('Falta E2E_DATABASE_URL')
  const sql = neon(url)
  const [fila] = await sql`select to_regclass('_base_de_pruebas') is not null as marcada`
  if (!fila?.marcada) throw new Error('E2E_DATABASE_URL no es una base de pruebas (falta _base_de_pruebas): ejecuta npm run migrar:pruebas')
  return sql
}

export async function vaciar(sql: Awaited<ReturnType<typeof sqlPruebas>>): Promise<void> {
  await sql`truncate perfil, evaluaciones, sesiones, registros, chequeos, altas, consejos_mostrados, intentos_limite`
}
