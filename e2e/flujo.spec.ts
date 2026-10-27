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
