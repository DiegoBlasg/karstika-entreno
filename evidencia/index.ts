import type { Hallazgo } from './tipos'
import { hallazgos as rendimiento } from './rendimiento'
import { hallazgos as dedos } from './dedos'
import { hallazgos as fuerza } from './fuerza'
import { hallazgos as resistencia } from './resistencia'
import { hallazgos as tecnica } from './tecnica'
import { hallazgos as tactica } from './tactica'
import { hallazgos as periodizacion } from './periodizacion'
import { hallazgos as lesiones } from './lesiones'
import { hallazgos as recuperacion } from './recuperacion'

export const todos: Hallazgo[] = [
  ...rendimiento, ...dedos, ...fuerza, ...resistencia, ...tecnica,
  ...tactica, ...periodizacion, ...lesiones, ...recuperacion,
]

export const porId = (id: string): Hallazgo | undefined => todos.find((h) => h.id === id)
