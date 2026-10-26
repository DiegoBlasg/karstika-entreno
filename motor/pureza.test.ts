import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const fuentes = readdirSync('motor').filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))

describe('pureza de motor/', () => {
  it('hay ficheros que comprobar', () => {
    expect(fuentes.length).toBeGreaterThan(5)
  })
  it.each(fuentes)('%s no usa reloj, azar ni dependencias de entorno', (f) => {
    const src = readFileSync(`motor/${f}`, 'utf8')
    expect(src).not.toMatch(/Date\.now\(|Math\.random\(|new Date\(\)/)
    expect(src).not.toMatch(/from ['"](react|next|@supabase)/)
    expect(src).not.toMatch(/from ['"]node:/)
  })
})
