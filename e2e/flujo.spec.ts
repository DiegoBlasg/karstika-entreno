import { expect, test } from '@playwright/test'
import { ahoraMadrid, sumarDias } from '../lib/fecha.ts'
import { sqlPruebas, vaciar } from '../scripts/base-pruebas.ts'

test.beforeAll(async () => {
  await vaciar(await sqlPruebas())
})

// Lunes de esta semana en Madrid, para que hoy caiga dentro de la temporada.
function lunesDeEstaSemana(): string {
  const hoy = ahoraMadrid(new Date()).fecha
  const diaSemana = (new Date(`${hoy}T12:00:00Z`).getUTCDay() + 6) % 7 // 0 = lunes
  return sumarDias(hoy, -diaSemana)
}

test('primera vez: perfil, entrenar, aceptar y registrar', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/entrar$/)
  await page.getByLabel('Contraseña').fill('mala')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toHaveText('Contraseña incorrecta.')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()

  // Sin perfil, Hoy manda al perfil.
  await expect(page).toHaveURL(/\/perfil$/)
  const inicio = lunesDeEstaSemana()
  await page.getByLabel('Peso (kg)').fill('70')
  await page.getByLabel('Años escalando').fill('1.5')
  await page.getByLabel('Inicio de la temporada (lunes)').fill(inicio)
  await page.getByLabel('Fecha objetivo').fill(sumarDias(inicio, 48 * 7))
  await page.getByLabel('He leído el aviso y lo acepto').check()
  await page.getByRole('button', { name: 'Guardar perfil' }).click()
  await expect(page).toHaveURL(/\/entrenar$/)

  await page.getByLabel('Hora').fill('10:00')
  await page.getByLabel('Con gente').check()
  await page.getByLabel('Rocódromo').check()
  await page.getByLabel('Minutos disponibles').fill('120')
  await page.getByRole('button', { name: 'Preparar sesión' }).click()
  const aceptar = page.getByRole('button', { name: 'Aceptar esta sesión' }).first()
  await expect(aceptar).toBeVisible()
  await aceptar.click()

  await expect(page).toHaveURL(/\/$/)
  await page.getByLabel('Esfuerzo (RPE 0-10)').selectOption('7')
  await page.getByRole('button', { name: 'Registrar' }).click()
  await expect(page.getByText(/Hecha · RPE 7/)).toBeVisible()
})

test('Mi semana: declarar un hueco, prepararlo y aceptarlo', async ({ page }) => {
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('link', { name: 'Mi semana' }).first().click()
  await page.getByRole('link', { name: 'Semana siguiente →' }).click()
  await page.getByLabel('Hora').fill('19:00')
  await page.getByLabel('Rocódromo').check()
  await page.getByRole('button', { name: 'Añadir hueco' }).click()
  await expect(page.getByText('Hueco añadido.')).toBeVisible()
  await page.getByRole('link', { name: 'Preparar' }).first().click()
  await expect(page).toHaveURL(/\/entrenar\?/)
  await page.getByRole('button', { name: 'Preparar sesión' }).click()
  await page.getByRole('button', { name: 'Aceptar esta sesión' }).first().click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto(`/semana?lunes=${sumarDias(lunesDeEstaSemana(), 7)}`)
  await expect(page.getByText(/Aceptada/)).toBeVisible()
})

test('cronómetro: abrir una sesión aceptada de hoy, terminarla y registrarla', async ({ page }) => {
  const sql = await sqlPruebas()
  const hoy = ahoraMadrid(new Date()).fecha
  const id = '00000000-0000-4000-8000-00000000c001'
  // A las 21:00, libre: la del primer test es a las 10:00 y dura 120 min.
  const sesion = { id, tipo: 'tecnica', intensidad: 'suave', fecha: hoy, horaInicio: 21, duracionMin: 30 }
  const explicacion = { regla: 'e2e.cronometro', parametros: [], evidencias: [], nivelMinimo: 'sinEvidencia', origen: 'diseno', motivo: 'e2e' }
  const propuesta = {
    sesion,
    bloques: [{ nombre: 'Técnica', minutos: 30, ejercicios: [{ nombre: 'Pies precisos', cargaTexto: 'Suave' }], explicacion }],
    explicaciones: [explicacion],
  }
  await sql`insert into sesiones (id, fecha, sesion, propuesta, origen)
            values (${id}, ${hoy}, ${JSON.stringify(sesion)}::jsonb, ${JSON.stringify(propuesta)}::jsonb, 'propuesta')`
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('link', { name: 'Empezar con cronómetro' }).click()
  await expect(page).toHaveURL(new RegExp(`/sesion/${id}$`))
  await page.getByRole('button', { name: 'Empezar', exact: true }).click()
  await expect(page.getByText('Pies precisos · Suave')).toBeVisible()
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Terminar', exact: true }).click()
  await expect(page.getByText('Sesión terminada')).toBeVisible()
  await expect(page.getByLabel('Minutos reales')).toHaveValue('1')
  await page.getByLabel('Esfuerzo (RPE 0-10)').selectOption('4')
  await page.getByRole('button', { name: 'Registrar' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText(/Hecha · RPE 4/)).toBeVisible()
  // Lo guardado del cronómetro se borra al registrar.
  expect(await page.evaluate((k) => localStorage.getItem(k), `cronometro:${id}`)).toBeNull()
})
