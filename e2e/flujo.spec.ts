import { expect, test } from '@playwright/test'
import { ahoraMadrid, sumarDias } from '../lib/fecha.ts'
import { sqlPruebas, vaciar } from '../scripts/base-pruebas.ts'

// En serie: si una prueba falla, las siguientes se saltan en vez de reiniciar el worker y vaciar otra vez la base.
test.describe.configure({ mode: 'serial' })

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
  await expect(page.getByText('Contraseña incorrecta.')).toBeVisible()
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()

  // Sin perfil, Hoy manda al perfil.
  await expect(page).toHaveURL(/\/perfil$/)
  const inicio = lunesDeEstaSemana()
  await page.getByLabel('Peso (kg)').fill('70')
  await page.getByLabel('Años escalando').fill('1.5')
  await page.getByLabel('Inicio de la temporada').fill(inicio)
  await page.getByLabel('Fecha objetivo').fill(sumarDias(inicio, 48 * 7))
  await page.getByLabel('He leído el aviso y lo acepto').check()
  await page.getByRole('button', { name: 'Guardar perfil' }).click()
  // La primera vez, a Semana a generar el primer entreno: hoy, por la mañana (pide también el chequeo de hoy).
  await expect(page).toHaveURL(/\/semana$/)
  const hoyFecha = ahoraMadrid(new Date()).fecha
  await page.locator(`li[data-fecha="${hoyFecha}"]`).getByRole('button', { name: 'Generar entreno' }).click()
  const hoja = page.getByRole('dialog')
  await hoja.getByLabel('Con gente').check()
  await hoja.getByLabel('Rocódromo').check()
  await hoja.getByLabel('Mañana').check()
  await hoja.getByLabel('Minutos disponibles').fill('120')
  await expect(hoja.getByText('¿Cómo llegas hoy?')).toBeVisible()
  await hoja.getByRole('button', { name: 'Generar', exact: true }).click()
  await expect(hoja).toBeHidden()
  await expect(page.getByText(/^Listo: /)).toBeVisible()

  await page.getByRole('link', { name: 'Hoy', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.getByRole('button', { name: 'Terminar', exact: true }).click()
  await page.getByLabel('Esfuerzo (RPE 0-10)').selectOption('7')
  await page.getByRole('button', { name: 'Registrar' }).click()
  await expect(page).toHaveURL(/\/chapa\//)
  await expect(page.getByRole('heading', { name: '+1 chapa' })).toBeVisible()
  await page.getByRole('link', { name: 'Hecho' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText(/Hecha · RPE 7/)).toBeVisible()
})

test('Semana: generar un entreno para el lunes que viene y cambiarlo por otra opción', async ({ page }) => {
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.getByRole('link', { name: 'Semana', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tu semana' })).toBeVisible()
  await page.getByRole('link', { name: 'Siguiente ›' }).click()
  await expect(page.getByRole('link', { name: '‹ Anterior' })).toBeVisible()
  const lunes = sumarDias(lunesDeEstaSemana(), 7)
  const dia = page.locator(`li[data-fecha="${lunes}"]`)
  // El primer día libre lleva el botón principal; la hoja pregunta con quién, dónde, cuándo y cuántos minutos.
  await dia.getByRole('button', { name: 'Generar entreno' }).click()
  const hoja = page.getByRole('dialog')
  await expect(hoja.getByRole('heading', { name: /^Generar entreno · lunes/ })).toBeVisible()
  await hoja.getByLabel('Con gente').check()
  await hoja.getByLabel('Rocódromo').check()
  await hoja.getByLabel('Mañana').check()
  await hoja.getByLabel('Minutos disponibles').fill('90')
  await hoja.getByRole('button', { name: 'Generar', exact: true }).click()
  await expect(hoja).toBeHidden()
  // Queda aceptada en su día, por la mañana y sin hora; no se puede empezar hasta ese día.
  const fila = dia.locator('details').first()
  await expect(fila.locator(':scope > summary')).toContainText('Mañana')
  const antes = (await fila.locator(':scope > summary').textContent()) ?? ''
  await fila.locator(':scope > summary').click()
  await expect(fila.getByRole('link', { name: 'Empezar sesión' })).toHaveCount(0)
  await fila.getByRole('button', { name: 'Otra opción' }).click()
  await expect(dia.locator('details').first().locator(':scope > summary')).not.toHaveText(antes)
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
  await page.getByRole('link', { name: 'Empezar sesión' }).click()
  await expect(page).toHaveURL(new RegExp(`/sesion/${id}$`))
  await page.getByRole('button', { name: 'Empezar', exact: true }).click()
  await expect(page.getByText('Pies precisos · Suave')).toBeVisible()
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Terminar', exact: true }).click()
  await expect(page.getByText('Sesión terminada')).toBeVisible()
  await expect(page.getByLabel('Minutos reales')).toHaveValue('1')
  await page.getByLabel('Esfuerzo (RPE 0-10)').selectOption('4')
  await page.getByRole('button', { name: 'Registrar' }).click()
  await expect(page).toHaveURL(/\/chapa\//)
  await expect(page.getByRole('heading', { name: '+1 chapa' })).toBeVisible()
  await page.getByRole('link', { name: 'Hecho' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText(/Hecha · RPE 4/)).toBeVisible()
  // Lo guardado del cronómetro se borra al registrar.
  expect(await page.evaluate((k) => localStorage.getItem(k), `cronometro:${id}`)).toBeNull()
})

test('test guiado: apuntar el intento, colgado continuo en 30 mm y guardar el resultado con el power slap', async ({ page }) => {
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
      { nombre: 'Resistencia', minutos: 5, explicacion, ejercicios: [{ nombre: 'Colgado en 30 mm', trabajoS: 600, hastaFallo: true, continuo: true, cargaTexto: 'Peso corporal, sin lastre' }] },
      { nombre: 'Power slap', minutos: 5, explicacion, ejercicios: [{ nombre: 'Power slap', series: 1, cargaTexto: 'Vale el mejor', ficha: 'power-slap' }] },
    ],
    explicaciones: [explicacion],
  }
  await sql`insert into sesiones (id, fecha, sesion, propuesta, origen)
            values (${id}, ${hoy}, ${JSON.stringify(sesion)}::jsonb, ${JSON.stringify(propuesta)}::jsonb, 'propuesta')`
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/$/) // esperar a que termine de entrar antes de navegar
  await page.goto(`/sesion/${id}`)
  await page.getByLabel('Peso hoy (kg)').fill('70')
  await page.getByRole('button', { name: 'Empezar', exact: true }).click()
  await page.getByRole('button', { name: 'Saltar' }).click() // prepárate
  await page.getByRole('button', { name: 'Saltar' }).click() // intento 1
  // Ya en el Prepárate del colgado (10 s): en pausa, para no depender de lo que se tarde en rellenar.
  await page.getByRole('button', { name: 'Pausa' }).click()
  await expect(page.getByText('En pausa')).toBeVisible()
  await page.getByLabel('Kilos').fill('10')
  await page.getByRole('button', { name: 'Sí', exact: true }).click()
  await expect(page.getByText('Mejor hasta ahora: +10 kg de lastre')).toBeVisible()
  // El colgado va a peso corporal: sin carga calculada.
  await expect(page.getByText('Peso corporal, sin lastre')).toBeVisible()
  await expect(page.getByText(/Lastre para/)).toHaveCount(0)
  await page.getByRole('button', { name: 'Saltar' }).click() // prepárate del colgado (el colgado sigue en pausa)
  await page.getByRole('button', { name: 'Seguir' }).click()
  await expect(page.getByText('hasta soltar')).toBeVisible()
  await expect(page.getByText(/Cuelga:/)).toHaveCount(0)
  await page.getByRole('button', { name: 'No puedo más' }).click()
  await page.getByRole('button', { name: 'Hecho' }).click() // power slap
  await expect(page.getByText('Resultado del test', { exact: true })).toBeVisible()
  await page.getByLabel(/segundos colgado en 30 mm/).fill('35')
  await expect(page.getByLabel(/Con descarga/)).not.toBeChecked()
  await page.getByLabel(/Power slap/).fill('45')
  await page.getByRole('button', { name: 'Guardar resultado' }).click()
  await expect(page.getByText('Evaluación guardada.')).toBeVisible()
  await page.getByLabel('Esfuerzo (RPE 0-10)').selectOption('8')
  await page.getByRole('button', { name: 'Registrar' }).click()
  await expect(page).toHaveURL(/\/chapa\//)
  await expect(page.getByRole('heading', { name: '+1 chapa' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ver tu reunión' })).toBeVisible()
  await page.getByRole('link', { name: 'Hecho' }).click()
  await expect(page).toHaveURL(/\/$/)
  // Lo apuntado del test se borra al registrar.
  expect(await page.evaluate((k) => localStorage.getItem(k), `cronometro:${id}:test`)).toBeNull()
  // Progreso: «Tus tests» con el colgado y el power slap.
  await page.goto('/progreso')
  const tarjeta = page.getByRole('region', { name: 'Tus tests' })
  await expect(tarjeta.getByText('Colgado en 30 mm')).toBeVisible()
  await expect(tarjeta.getByText('Power slap')).toBeVisible()
  // El test en casa apuntado a mano entra en la misma tarjeta.
  await page.getByText('¿Hiciste el test en casa por tu cuenta?').click()
  await page.getByLabel('Dominadas estrictas seguidas').fill('8')
  await page.getByLabel(/Apertura de cadera/).fill('60')
  await page.getByRole('button', { name: 'Guardar test en casa' }).click()
  await expect(page.getByText('Test en casa guardado.')).toBeVisible()
  await expect(tarjeta.getByText('Dominadas máximas')).toBeVisible()
  await expect(tarjeta.getByText('Apertura de cadera')).toBeVisible()
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
  // Con el contexto con que se generó: así se puede pedir «Otra opción».
  const conContexto = { ...propuesta, contexto: { compania: 'solo', lugar: 'rocodromo', minutosDisponibles: 60 } }
  await sql`insert into sesiones (id, fecha, sesion, propuesta, origen)
            values (${id}, ${hoy}, ${JSON.stringify(sesion)}::jsonb, ${JSON.stringify(conContexto)}::jsonb, 'propuesta')`
  // Sin chequeo de hoy, Hoy lo pide (el primer test lo guardó al generar).
  await sql`delete from chequeos where fecha = ${hoy}`
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('¿Cómo llegas hoy?')).toBeVisible()
  await page.getByLabel('Sueño 1').check()
  await page.getByLabel('Fatiga 1').check()
  await page.getByLabel('Ganas 1').check()
  await page.getByRole('button', { name: 'Guardar chequeo' }).click()
  await expect(page.getByText('Con cómo llegas hoy, el entrenador ya no te propondría esta sesión:')).toBeVisible()
  // «Otra opción» la cambia por la siguiente del entrenador con su mismo contexto; con un chequeo tan bajo puede no haber
  // ninguna: entonces lo dice y la vieja sigue.
  await page.getByRole('button', { name: 'Otra opción' }).first().click()
  const sinOtra = page.getByText('No hay otra opción para ese día.')
  await expect.poll(async () => (await sinOtra.isVisible()) || (await sql`select id from sesiones where id = ${id}`).length === 0).toBe(true)
  // En cualquier caso, el chequeo de hoy sigue siendo el guardado en Hoy.
  expect(await sql`select sueno, fatiga, ganas from chequeos where fecha = ${hoy}`).toEqual([{ sueno: 1, fatiga: 1, ganas: 1 }])
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
  // Apuntado sin querer: se puede borrar con todo lo apuntado.
  const tarjeta = page.locator('article').filter({ hasText: 'Técnica · 30 min (lo que hiciste)' })
  await expect(tarjeta).toHaveCount(1)
  page.once('dialog', (d) => void d.accept())
  await tarjeta.getByRole('button', { name: 'Borrar' }).click()
  await expect(tarjeta).toHaveCount(0)
})

test('Vía: pasos con el largo actual, su tarjeta del carrusel y una fuente desde «¿Por qué?»', async ({ page }) => {
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.getByRole('link', { name: 'Vía', exact: true }).click()
  await expect(page).toHaveURL(/\/via$/)
  await expect(page.getByRole('heading', { name: 'Tu vía' })).toBeVisible()
  // En la fila de pasos, el largo actual (aria-current) enlaza con su tarjeta del carrusel; tocarlo la centra.
  const pasoActual = page.locator('[aria-current="step"]')
  await expect(pasoActual).toHaveCount(1)
  const ancla = await pasoActual.getAttribute('href')
  expect(ancla).toMatch(/^#largo-\d+$/)
  await pasoActual.click()
  // Toda la tarjeta del largo actual abre su hoja con las semanas.
  const tarjeta = page.locator(`${ancla} button`).first()
  await expect(tarjeta).toBeInViewport()
  await tarjeta.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').getByText(/^Semanas · ciclo \d$/)).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Qué ha cambiado por tus resultados' })).toBeVisible()
  await page.locator('summary', { hasText: '¿Por qué?' }).first().click()
  await page.getByRole('link', { name: 'detalle' }).first().click()
  await expect(page).toHaveURL(/\/fuentes\//)
  await expect(page.getByRole('heading', { name: 'Limitaciones' })).toBeVisible()
})

test('Biblioteca: desde una sesión, abrir «Cómo se hace» y ver los pasos', async ({ page }) => {
  const sql = await sqlPruebas()
  const hoy = ahoraMadrid(new Date()).fecha
  const id = '00000000-0000-4000-8000-00000000c004'
  // A las 6:00, libre: lo más temprano de las demás pruebas es lo apuntado a las 8:00.
  const sesion = { id, tipo: 'tecnica', intensidad: 'suave', fecha: hoy, horaInicio: 6, duracionMin: 20 }
  const explicacion = { regla: 'e2e.biblioteca', parametros: [], evidencias: [], nivelMinimo: 'sinEvidencia', origen: 'diseno', motivo: 'e2e' }
  const propuesta = {
    sesion,
    bloques: [{ nombre: 'Técnica', minutos: 20, explicacion, ejercicios: [{ nombre: 'Pies precisos', cargaTexto: 'Suave', ficha: 'practica-tecnica' }] }],
    explicaciones: [explicacion],
  }
  await sql`insert into sesiones (id, fecha, sesion, propuesta, origen)
            values (${id}, ${hoy}, ${JSON.stringify(sesion)}::jsonb, ${JSON.stringify(propuesta)}::jsonb, 'propuesta')`
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto(`/sesion/${id}`)
  await page.getByRole('link', { name: 'Cómo se hace: Práctica técnica' }).click()
  await expect(page).toHaveURL(/\/biblioteca\/practica-tecnica$/)
  await expect(page.getByRole('heading', { name: 'Práctica técnica' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cómo se hace' })).toBeVisible()
  await expect(page.getByText('Pies precisos: mira el pie hasta que se apoye y no lo recoloques.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Cuándo parar' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Por qué se hace' })).toBeVisible()
  // El índice de la biblioteca, desde Yo.
  await page.getByRole('link', { name: 'Yo', exact: true }).click()
  await page.getByRole('link', { name: 'Biblioteca de ejercicios' }).click()
  await expect(page).toHaveURL(/\/biblioteca$/)
  await expect(page.getByRole('heading', { name: 'Hombro y antagonistas' })).toBeVisible()
  // El buscador ignora tildes y mayúsculas.
  await page.getByLabel('Buscar ejercicio').fill('ROTACION')
  await expect(page.getByRole('link', { name: /Rotación externa con banda/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Repeaters/ })).toHaveCount(0)
  await page.getByLabel('Buscar ejercicio').fill('zzzz')
  await expect(page.getByText('Ningún ejercicio con «zzzz»')).toBeVisible()
  await page.getByLabel('Buscar ejercicio').fill('')
  await page.getByRole('link', { name: /Rotación externa con banda/ }).click()
  await expect(page.getByRole('img', { name: /codo pegado al costado/ })).toBeVisible()
})

test('al límite: «¿Qué te frenó hoy?», encadené, último freno y «Tu perfil»', async ({ page }) => {
  const sql = await sqlPruebas()
  const hoy = ahoraMadrid(new Date()).fecha
  const id = '00000000-0000-4000-8000-00000000f001'
  const sesion = { id, tipo: 'bloque-limite', intensidad: 'alta', fecha: hoy, horaInicio: 4, duracionMin: 30 }
  const explicacion = { regla: 'e2e.freno', parametros: [], evidencias: [], nivelMinimo: 'sinEvidencia', origen: 'diseno', motivo: 'e2e' }
  const propuesta = {
    sesion,
    bloques: [{ nombre: 'Bloque al límite', minutos: 30, ejercicios: [{ nombre: 'Pegues', cargaTexto: 'Al límite' }], explicacion }],
    explicaciones: [explicacion],
  }
  await sql`insert into sesiones (id, fecha, sesion, propuesta, origen)
            values (${id}, ${hoy}, ${JSON.stringify(sesion)}::jsonb, ${JSON.stringify(propuesta)}::jsonb, 'propuesta')`
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto(`/sesion/${id}`)
  await page.getByRole('button', { name: 'Empezar', exact: true }).click()
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Terminar', exact: true }).click()
  await expect(page.getByText('¿Qué te frenó hoy?')).toBeVisible()
  await expect(page.getByText('Intentos al límite')).toHaveCount(0)
  await page.getByLabel('Miedo, no me atreví').check()
  await page.getByLabel('Hoy encadené algo al límite').check()
  await expect(page.getByText('✓ Hoy encadené algo al límite')).toBeVisible()
  // Qué se encadenó: en una sesión de bloque, bloque ya elegido; grado y cómo.
  await expect(page.getByLabel('Bloque', { exact: true })).toBeChecked()
  await page.getByLabel('Grado').selectOption('6B+')
  await page.getByLabel('Flash').check()
  await page.getByLabel('Esfuerzo (RPE 0-10)').selectOption('8')
  await page.getByRole('button', { name: 'Registrar' }).click()
  await expect(page).toHaveURL(/\/chapa\//)
  const [fila] = await sql`select freno, encadene from registros where sesion_id = ${id}`
  expect(fila).toEqual({ freno: 'cabeza', encadene: true })
  const escaladas = await sql`select tipo, lugar, grado, estilo from escaladas where sesion_id = ${id}`
  expect(escaladas).toEqual([{ tipo: 'bloque', lugar: 'rocodromo', grado: '6B+', estilo: 'flash' }])
  await page.goto('/progreso')
  await expect(page.getByRole('region', { name: 'Tu nivel' }).getByText(/Bloque, últimos 90 días: 6B\+/)).toBeVisible()
  await expect(page.getByText('Lo último que te frenó: Miedo, no me atreví')).toBeVisible()
  const perfil = page.getByRole('region', { name: 'Tu perfil' })
  // Con una sola respuesta aún no decide: se muestra el orden general y cuánto falta.
  await expect(perfil.getByText('Lo que suele limitar más')).toBeVisible()
  await expect(perfil.getByText('Tus respuestas aún no deciden: llevas 1 de 6 en las últimas 8 semanas.')).toBeVisible()
  await expect(perfil.getByText('Lo que mejor llevas', { exact: true })).toBeVisible()
})

test('Escaladas: una vía suelta en «Tu nivel» y un proyecto con un día de pegues y luego encadenado', async ({ page }) => {
  const sql = await sqlPruebas()
  await sql`delete from escaladas where sesion_id is null`
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto('/progreso')
  const nivel = page.getByRole('region', { name: 'Tu nivel' })
  const apuntar = async (campos: { grado?: string; estilo: string; nombre?: string; pegues?: string }) => {
    await page.getByText('+ Apuntar escalada').click()
    const form = page.locator('#apuntar-escalada')
    await form.getByLabel(campos.estilo).check()
    if (campos.grado) await form.getByLabel(/^Grado/).selectOption(campos.grado)
    if (campos.nombre) await form.getByLabel(/^Nombre/).fill(campos.nombre)
    if (campos.pegues) await form.getByLabel('Pegues ese día').fill(campos.pegues)
    await form.getByRole('button', { name: 'Apuntar escalada' }).click()
    await expect(form.getByText('Escalada apuntada.')).toBeVisible()
    await page.reload()
  }
  // Una vía a vista en roca (la opción por defecto).
  await apuntar({ grado: '6b', estilo: 'A vista' })
  await expect(nivel.getByText('Tu mejor vía encadenada en roca.', { exact: false })).toBeVisible()
  await expect(nivel.getByText(/Hasta tu objetivo te faltan 6b\+, 6c, 6c\+ y 7a/)).toBeVisible()
  // Un proyecto: un día de pegues y luego encadenado.
  await apuntar({ estilo: 'Pegues a un proyecto, sin encadenar', nombre: 'Ojo de pez', pegues: '3' })
  await expect(nivel.getByText(/Ojo de pez · vía en roca · 3 pegues/)).toBeVisible()
  await apuntar({ grado: '6c', estilo: 'Trabajada', nombre: 'ojo de pez', pegues: '2' })
  await expect(nivel.getByText(/Ojo de pez · 6c · encadenado el .* en 5 pegues/)).toBeVisible()
  await expect(nivel.getByText(/Hasta tu objetivo te faltan 6c\+ y 7a/)).toBeVisible()
  // Las últimas escaladas, con su botón de borrar.
  await expect(page.getByRole('button', { name: 'Borrar Ojo de pez · vía 6c' })).toBeVisible()
})

test('Biblioteca ampliada: filtro por lugar, una ficha nueva y una que no se propone', async ({ page }) => {
  await page.goto('/entrar')
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE_ACCESO!)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto('/biblioteca')
  await page.getByRole('button', { name: 'Casa', exact: true }).click()
  await expect(page.getByRole('link', { name: /Tobillo con la rodilla a la pared/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Pies silenciosos/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Técnica', exact: true }).click()
  await expect(page.getByText('Ningún ejercicio de técnica en casa')).toBeVisible()
  await page.getByRole('group', { name: 'Filtrar por lugar' }).getByRole('button', { name: 'Todos' }).click()
  await page.getByRole('link', { name: /Pies silenciosos/ }).click()
  await expect(page.getByText(/Te lo propone el entrenador/)).toBeVisible()
  await page.goto('/biblioteca/campus')
  await expect(page.getByText(/No se propone/)).toBeVisible()
})
