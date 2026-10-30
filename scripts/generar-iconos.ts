// Genera los PNG del icono de la app a partir de scripts/icono-app.svg. Uso: npm run iconos
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const svg = readFileSync('scripts/icono-app.svg', 'utf8')
const SALIDAS: { ruta: string; lado: number; margen: number }[] = [
  { ruta: 'public/icono-192.png', lado: 192, margen: 0 },
  { ruta: 'public/icono-512.png', lado: 512, margen: 0 },
  { ruta: 'public/icono-maskable-512.png', lado: 512, margen: 0.2 },
  { ruta: 'app/apple-icon.png', lado: 180, margen: 0 },
]

const navegador = await chromium.launch()
try {
  for (const { ruta, lado, margen } of SALIDAS) {
    const pagina = await navegador.newPage({ viewport: { width: lado, height: lado } })
    const interior = Math.round(lado * (1 - 2 * margen))
    await pagina.setContent(
      `<html><body style="margin:0;background:#0E1417;display:flex;align-items:center;justify-content:center;width:${lado}px;height:${lado}px">` +
        `<div style="width:${interior}px;height:${interior}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`,
    )
    await pagina.screenshot({ path: ruta, omitBackground: false })
    await pagina.close()
    console.log(`${ruta} (${lado}×${lado})`)
  }
} finally {
  await navegador.close()
}
