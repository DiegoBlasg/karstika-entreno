import { expect, test } from '@playwright/test'
import { ahoraMadrid, sumarDias } from '../lib/fecha.ts'

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

test('con huecos, sesión registrada y test no aparece el pie de vía del primer uso', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('Antes de empezar a escalar')).toHaveCount(0)
  await page.goto('/via')
  await expect(page.getByRole('heading', { name: 'Tu vía' })).toBeVisible()
  await expect(page.getByText('Antes de empezar a escalar')).toHaveCount(0)
})

test('Progreso: fuerza, grado, semanas cumplidas y logros', async ({ page }) => {
  await page.goto('/progreso')
  await expect(page.getByRole('heading', { name: 'Tu progreso' })).toBeVisible()
  await expect(page.getByText('Fuerza de dedos · % del peso')).toBeVisible()
  await expect(page.getByText('Semanas cumplidas')).toBeVisible()
  await expect(page.getByText(/^Logros · \d+ de \d+$/)).toBeVisible()
})

test('Progreso: apuntar un test lleva a la reunión', async ({ page }) => {
  await page.goto('/progreso')
  // Hoy ya puede tener un test (el del cronómetro guiado de flujo.spec.ts): dos el mismo día no se admiten, así que se
  // apunta uno de hace tres días. flujo.spec.ts vacía la base de pruebas al empezar, y no queda nada entre ejecuciones.
  const hoy = ahoraMadrid(new Date()).fecha
  await page.getByLabel('Fecha del test').fill(sumarDias(hoy, -3))
  await page.getByLabel('Peso ese día (kg)').fill('70')
  await page.getByLabel('Lastre del mejor intento de 10 s (kg)').fill('12')
  await page.getByRole('button', { name: 'Guardar evaluación' }).click()
  await expect(page).toHaveURL(/\/reunion\//)
  await expect(page.getByRole('link', { name: 'Seguir escalando' })).toBeVisible()
  await page.getByRole('link', { name: 'Seguir escalando' }).click()
  await expect(page).toHaveURL(/\/via$/)
})
