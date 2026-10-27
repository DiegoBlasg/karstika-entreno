import { existsSync } from 'node:fs'
import { defineConfig } from '@playwright/test'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')
const base = process.env.E2E_DATABASE_URL
const clave = process.env.E2E_CLAVE_ACCESO
if (!base || !clave) throw new Error('Faltan E2E_DATABASE_URL y E2E_CLAVE_ACCESO (ver docs/despliegue.md)')

const PUERTO = 3100

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  workers: 1,
  use: { baseURL: `http://localhost:${PUERTO}`, locale: 'es-ES', timezoneId: 'Europe/Madrid' },
  webServer: {
    command: `npx next dev -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}/entrar`,
    reuseExistingServer: false,
    timeout: 120_000,
    // Las variables del proceso mandan sobre .env.local en Next.js: el servidor de pruebas usa la base de pruebas.
    env: { DATABASE_URL: base, CLAVE_ACCESO: clave, SECRETO_SESION: 'secreto-de-pruebas-e2e-de-al-menos-32-caracteres' },
  },
})
