import { readFileSync, writeFileSync } from 'node:fs'
import { generarFuente, parsearParametros } from '../motor/generador.ts'

const md = readFileSync('docs/evidencia/parametros.md', 'utf8')
const params = parsearParametros(md)
writeFileSync('motor/metadatos.ts', generarFuente(params))
console.log(`motor/metadatos.ts generado con ${params.length} parámetros`)
