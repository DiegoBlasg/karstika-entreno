import { expect, test } from '@playwright/test'

test('el manifest y los iconos se sirven sin sesión', async ({ request }) => {
  const manifest = await request.get('/manifest.webmanifest', { maxRedirects: 0 })
  expect(manifest.status()).toBe(200)
  const json = await manifest.json()
  expect(json.display).toBe('standalone')
  expect(json.theme_color).toBe('#0E1417')
  for (const ruta of ['/icono-192.png', '/icono-512.png', '/icono-maskable-512.png', '/apple-icon.png', '/icon.svg']) {
    const r = await request.get(ruta, { maxRedirects: 0 })
    expect(r.status(), ruta).toBe(200)
  }
})

test('las páginas siguen exigiendo sesión', async ({ request }) => {
  for (const ruta of ['/', '/semana', '/perfil', '/icono-x', '/icono-x.png.html', '/iconXsvg', '/apple-icon-png', '/faviconXico']) {
    const r = await request.get(ruta, { maxRedirects: 0 })
    expect(r.status(), ruta).toBe(307)
    expect(r.headers().location, ruta).toContain('/entrar')
  }
})
