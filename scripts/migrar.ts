// Aplica en orden las migraciones de migraciones/*.sql que no estén en la tabla `migraciones`.
// Uso: npm run migrar (DATABASE_URL) · npm run migrar:pruebas (E2E_DATABASE_URL, y marca la base como de pruebas).
import { readdirSync, readFileSync } from 'node:fs'
import { Pool } from '@neondatabase/serverless'
import { identidadBd } from './identidad-bd.ts'

const pruebas = process.argv.includes('--pruebas')
const url = pruebas ? process.env.E2E_DATABASE_URL : process.env.DATABASE_URL
if (!url) {
  console.error(`Falta ${pruebas ? 'E2E_DATABASE_URL' : 'DATABASE_URL'}`)
  process.exit(1)
}
if (pruebas && process.env.DATABASE_URL && identidadBd(url) === identidadBd(process.env.DATABASE_URL)) {
  console.error('E2E_DATABASE_URL apunta a la misma base (servidor y nombre) que DATABASE_URL: la base de pruebas tiene que ser otra rama de Neon')
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
  if (pruebas) {
    const marcada = (await cliente.query("select to_regclass('_base_de_pruebas') is not null as marcada")).rows[0]?.marcada
    if (!marcada) {
      // Una base sin marca que ya tiene datos puede ser la real: no se marca nunca.
      const { rows } = await cliente.query('select (select count(*) from perfil) + (select count(*) from sesiones) as n')
      if (Number(rows[0].n) > 0) {
        console.error('La base no tiene la marca _base_de_pruebas y ya contiene datos (perfil o sesiones): no se marca como base de pruebas')
        process.exit(1)
      }
      await cliente.query('create table _base_de_pruebas (marcada_en timestamptz not null default now())')
    }
  }
  console.log('migraciones al día')
} finally {
  cliente.release()
  await pool.end()
}
