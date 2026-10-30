import { expect, test } from '@playwright/test'

// Corre después de flujo.spec.ts (orden alfabético): ese fichero deja el perfil creado, y sin perfil «/» redirige a /perfil.
test.beforeEach(async ({ page }) => {
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/$/)
})

test('la barra inferior lleva a las cinco secciones y marca la actual', async ({ page }) => {
  const barra = page.getByRole('navigation', { name: 'Secciones' })
  for (const [nombre, url] of [['Vía', /\/via$/], ['Semana', /\/semana$/], ['Progreso', /\/progreso$/], ['Yo', /\/perfil$/], ['Hoy', /\/$/]] as const) {
    await barra.getByRole('link', { name: nombre, exact: true }).click()
    await expect(page).toHaveURL(url)
    await expect(barra.getByRole('link', { name: nombre, exact: true })).toHaveAttribute('aria-current', 'page')
  }
})

test('las rutas antiguas redirigen', async ({ page }) => {
  await page.goto('/plan')
  await expect(page).toHaveURL(/\/via$/)
  await page.goto('/evaluacion')
  await expect(page).toHaveURL(/\/progreso$/)
})

test('Yo tiene la biblioteca y salir', async ({ page }) => {
  await page.goto('/perfil')
  await page.getByRole('link', { name: 'Biblioteca de ejercicios' }).click()
  await expect(page).toHaveURL(/\/biblioteca$/)
  await page.goto('/perfil')
  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page).toHaveURL(/\/entrar$/)
})

test('la sesión a pantalla completa sigue exigiendo entrar', async ({ page, browser }) => {
  const anonimo = await browser.newContext()
  const p = await anonimo.newPage()
  await p.goto('/sesion/00000000-0000-4000-8000-0000000000ff')
  await expect(p).toHaveURL(/\/entrar/)
  await anonimo.close()
})

test('Hoy: mini-vía con el largo actual que lleva a Vía', async ({ page }) => {
  const mini = page.getByRole('link', { name: /Largo \d+ de \d+/ })
  await expect(mini).toBeVisible()
  await expect(page.getByRole('progressbar', { name: 'Semanas del largo' })).toBeVisible()
  await mini.click()
  await expect(page).toHaveURL(/\/via$/)
})
