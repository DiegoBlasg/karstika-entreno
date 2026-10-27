// Aplica en orden las migraciones de migraciones/*.sql que no estén en la tabla `migraciones`.
// Uso: npm run migrar (DATABASE_URL) · npm run migrar:pruebas (E2E_DATABASE_URL, y marca la base como de pruebas).
import { readdirSync, readFileSync } from 'node:fs'
import { Pool } from '@neondatabase/serverless'

const pruebas = process.argv.includes('--pruebas')
const url = pruebas ? process.env.E2E_DATABASE_URL : process.env.DATABASE_URL
if (!url) {
  console.error(`Falta ${pruebas ? 'E2E_DATABASE_URL' : 'DATABASE_URL'}`)
  process.exit(1)
}
if (pruebas && url === process.env.DATABASE_URL) {
  console.error('E2E_DATABASE_URL es la misma que DATABASE_URL: la base de pruebas tiene que ser otra rama de Neon')
  process.exit(1)
}

const pool = new Pool({ connectionString: url })
const cliente = await pool.connect()
try {
  await cliente.query('create table if not exists migraciones (nombre text primary key, aplicada_en timestamptz not null default now())')
  const hechas = new Set((await cliente.query('select nombre from migraciones')).rows.map((r: { nombre: string }) => r.nombre))
  const ficheros = readdirSync('migraciones').filter((f) => f.endsWith('.sql')).sort()
  for (const f of ficheros) {
    if (hechas.has(f)) continue
    await cliente.query('begin')
    try {
      await cliente.query(readFileSync(`migraciones/${f}`, 'utf8'))
      await cliente.query('insert into migraciones (nombre) values ($1)', [f])
      await cliente.query('commit')
      console.log(`aplicada ${f}`)
    } catch (e) {
      await cliente.query('rollback')
      throw e
    }
  }
  if (pruebas) await cliente.query('create table if not exists _base_de_pruebas (marcada_en timestamptz not null default now())')
  console.log('migraciones al día')
} finally {
  cliente.release()
  await pool.end()
}
