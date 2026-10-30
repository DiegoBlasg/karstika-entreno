// Las cinco pestañas de la barra inferior y cuál se marca en cada ruta. Puro.
export type PestanaId = 'hoy' | 'via' | 'semana' | 'progreso' | 'yo'

export const PESTANAS: readonly { id: PestanaId; href: string; etiqueta: string }[] = [
  { id: 'hoy', href: '/', etiqueta: 'Hoy' },
  { id: 'via', href: '/via', etiqueta: 'Vía' },
  { id: 'semana', href: '/semana', etiqueta: 'Semana' },
  { id: 'progreso', href: '/progreso', etiqueta: 'Progreso' },
  { id: 'yo', href: '/perfil', etiqueta: 'Yo' },
]

// Rutas de detalle que cuelgan de una pestaña: Entrenar de Semana; Biblioteca y Fuentes de Yo.
const PREFIJOS: readonly [string, PestanaId][] = [
  ['/via', 'via'], ['/semana', 'semana'], ['/entrenar', 'semana'], ['/progreso', 'progreso'],
  ['/perfil', 'yo'], ['/biblioteca', 'yo'], ['/fuentes', 'yo'],
]

export function pestanaActiva(pathname: string): PestanaId | null {
  const ruta = pathname.split('?')[0]!
  if (ruta === '/') return 'hoy'
  for (const [prefijo, id] of PREFIJOS) if (ruta === prefijo || ruta.startsWith(`${prefijo}/`)) return id
  return null
}
