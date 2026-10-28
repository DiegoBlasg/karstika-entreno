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
  await page.getByRole('button', { name: 'Terminar', exact: true }).click()
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

test('test guiado: apuntar el intento, ver la carga del 7:3 y guardar el resultado', async ({ page }) => {
  const sql = await sqlPruebas()
  const hoy = ahoraMadrid(new Date()).fecha
  const id = '00000000-0000-4000-8000-00000000c002'
  // A las 22:00, libre: la del cronómetro es a las 21:00 y dura 30 min.
  const sesion = { id, tipo: 'evaluacion-dedos', intensidad: 'alta', fecha: hoy, horaInicio: 22, duracionMin: 10 }
  const explicacion = { regla: 'e2e.test', parametros: [], evidencias: [], nivelMinimo: 'C', origen: 'diseno', motivo: 'e2e' }
  const propuesta = {
    sesion,
    bloques: [
      { nombre: 'Test máx', minutos: 5, explicacion, ejercicios: [{ nombre: 'Suspensión máxima', series: 1, trabajoS: 10, descansoSeriesS: 180, cargaTexto: 'Máximo' }] },
      { nombre: 'Resistencia', minutos: 5, explicacion, ejercicios: [{ nombre: '7:3', trabajoS: 7, descansoS: 3, cargaTexto: 'Al 60 %' }] },
    ],
    explicaciones: [explicacion],
  }
  await sql`insert into sesiones (id, fecha, sesion, propuesta, origen)
            values (${id}, ${hoy}, ${JSON.stringify(sesion)}::jsonb, ${JSON.stringify(propuesta)}::jsonb, 'propuesta')`
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.goto(`/sesion/${id}`)
  await page.getByLabel('Peso hoy (kg)').fill('70')
  await page.getByRole('button', { name: 'Empezar', exact: true }).click()
  await page.getByRole('button', { name: 'Saltar' }).click() // prepárate
  await page.getByRole('button', { name: 'Saltar' }).click() // intento 1
  // Ya en el Prepárate del 7:3 (10 s): en pausa, para no depender de lo que se tarde en rellenar.
  await page.getByRole('button', { name: 'Pausa' }).click()
  await expect(page.getByText('En pausa')).toBeVisible()
  await page.getByLabel('Kilos').fill('10')
  await page.getByRole('button', { name: 'Sí', exact: true }).click()
  await expect(page.getByText('Mejor hasta ahora: +10 kg de lastre')).toBeVisible()
  // 60 % de (70 + 10) − 70 = −22 kg.
  await expect(page.getByText('Lastre para el 7:3: descarga de 22 kg')).toBeVisible()
  await page.getByRole('button', { name: 'Saltar' }).click() // prepárate del 7:3 (el 7:3 sigue en pausa)
  await page.getByRole('button', { name: 'Seguir' }).click()
  await page.getByRole('button', { name: 'No puedo más' }).click()
  await expect(page.getByText('Resultado del test')).toBeVisible()
  await page.getByRole('button', { name: 'Guardar resultado' }).click()
  await expect(page.getByText('Evaluación guardada.')).toBeVisible()
  await page.getByLabel('Esfuerzo (RPE 0-10)').selectOption('8')
  await page.getByRole('button', { name: 'Registrar' }).click()
  await expect(page).toHaveURL(/\/$/)
  // Lo apuntado del test se borra al registrar.
  expect(await page.evaluate((k) => localStorage.getItem(k), `cronometro:${id}:test`)).toBeNull()
})

test('Hoy: chequeo bajo, la sesión aceptada ya no encaja y se cambia por otra', async ({ page }) => {
  const sql = await sqlPruebas()
  const hoy = ahoraMadrid(new Date()).fecha
  const id = '00000000-0000-4000-8000-00000000c003'
  // A las 23:00, libre: la del test guiado es a las 22:00 y dura 10 min.
  const sesion = { id, tipo: 'bloque-limite', intensidad: 'alta', fecha: hoy, horaInicio: 23, duracionMin: 30 }
  const explicacion = { regla: 'e2e.cambiar', parametros: [], evidencias: [], nivelMinimo: 'C', origen: 'diseno', motivo: 'e2e' }
  const propuesta = {
    sesion,
    bloques: [{ nombre: 'Bloque', minutos: 30, ejercicios: [{ nombre: 'Bloques al límite', cargaTexto: 'Máximo' }], explicacion }],
    explicaciones: [explicacion],
  }
  await sql`insert into sesiones (id, fecha, sesion, propuesta, origen)
            values (${id}, ${hoy}, ${JSON.stringify(sesion)}::jsonb, ${JSON.stringify(propuesta)}::jsonb, 'propuesta')`
  // Sin chequeo de hoy, Hoy lo pide (el primer test lo guardó desde Entrenar).
  await sql`delete from chequeos where fecha = ${hoy}`
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('¿Cómo llegas hoy?')).toBeVisible()
  await page.getByLabel('Sueño').selectOption('1')
  await page.getByLabel('Fatiga').selectOption('1')
  await page.getByLabel('Ganas').selectOption('1')
  await page.getByRole('button', { name: 'Guardar chequeo' }).click()
  await expect(page.getByText('Con cómo llegas hoy, el entrenador ya no te propondría esta sesión:')).toBeVisible()
  await page.getByRole('link', { name: 'Cambiarla por otra' }).click()
  await expect(page).toHaveURL(new RegExp(`/entrenar\?.*reemplaza=${id}`))
  await expect(page.getByText(/Vas a cambiar la sesión/)).toBeVisible()
  await page.getByLabel('Casa').check()
  await page.getByRole('button', { name: 'Preparar sesión' }).click()
  await page.getByRole('button', { name: 'Aceptar esta sesión' }).first().click()
  await expect(page).toHaveURL(/\/$/)
  expect(await sql`select id from sesiones where id = ${id}`).toHaveLength(0)
})

test('Hoy: apuntar un entrenamiento que no estaba planeado', async ({ page }) => {
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('button', { name: 'Apuntar un entrenamiento que no estaba planeado' }).click()
  await page.getByLabel('¿Qué hiciste?').selectOption({ label: 'Técnica' })
  await page.getByLabel('Intensidad').selectOption('suave')
  await page.getByLabel('Hora de inicio').fill('08:00')
  await page.getByLabel('Minutos', { exact: true }).fill('30')
  await page.getByLabel('Esfuerzo (RPE 0-10)').selectOption('4')
  const guardar = page.getByRole('button', { name: 'Guardar', exact: true })
  await guardar.click()
  // Si el entrenador no lo habría propuesto, avisa y hay que confirmarlo.
  const confirmar = page.getByLabel('Lo hice así de todos modos')
  await expect(page.getByText('Entrenamiento apuntado.').or(confirmar)).toBeVisible()
  if (await confirmar.isVisible()) {
    await confirmar.check()
    await guardar.click()
  }
  await expect(page.getByText('Entrenamiento apuntado.')).toBeVisible()
})
