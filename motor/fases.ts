import type { Fase, FaseId } from './propuesta-tipos'
import type { TipoSesion } from './tipos'

// Fases de la temporada. Las cifras de cupos son decisiones de diseño encajadas en los parámetros: P-07 (2
// multipresas por semana), P-12 (tope de 3 sesiones intensas de dedos en 7 días para novel), P-32 (base), P-36 y
// P-37 (resistencia de fuerza), P-41 (hombro 2 veces por semana), P-60 y P-61 (roca y pegues).

// Escalar cerca del límite (vía con cuerda si hay compañero, bloque si no) entra desde la base: es lo más
// específico para el objetivo y la seguridad ya lo controla como sesión intensa de dedos (P-14, P-15).
export const FASE_BASE: Fase = {
  id: 'base',
  nombre: 'Base técnica y adaptación',
  cupos: { 'evaluacion-dedos': 1, 'via-cuerda-limite': 1, 'bloque-limite': 1, tecnica: 2, arc: 1, hombro: 2 },
  prioridad: ['evaluacion-dedos', 'via-cuerda-limite', 'bloque-limite', 'tecnica', 'arc', 'hombro'],
  prohibidos: [
    'multipresa-resistencia', 'multipresa-maxima', 'multipresa-resistencia-fuerza', 'board', 'campus',
    'via-autoasegurada', 'pegues-proyecto', 'dominadas', 'resistencia-4x4',
  ],
}

// Dominadas lastradas (P-39): opcionales. Como sesión, solo en la fuerza y la resistencia, con cupo de 1 por semana y
// la prioridad más baja (decisión de Diego del 2026-10-29: aprovechar las mañanas en casa con barra); como complemento,
// solo en la fuerza (lo decide el generador al completar la sesión). Nunca en la descarga (lo quita `descargar`).
// Fuerza: 2 multipresas (P-07) y 1 vía al límite por semana = 3 sesiones intensas de dedos, justo el tope de
// P-12 para perfiles novel. La vía va antes en la prioridad para que el día con compañero sea de cuerda y la
// multipresa caiga en los días sin compañero o en casa.
export const FASE_FUERZA: Fase = {
  id: 'fuerza',
  nombre: 'Fuerza de dedos',
  cupos: { 'evaluacion-dedos': 1, 'via-cuerda-limite': 1, 'multipresa-resistencia': 2, tecnica: 1, arc: 1, hombro: 2, dominadas: 1 },
  prioridad: ['evaluacion-dedos', 'via-cuerda-limite', 'multipresa-resistencia', 'tecnica', 'arc', 'hombro', 'dominadas'],
  prohibidos: [
    'campus', 'multipresa-maxima', 'multipresa-resistencia-fuerza', 'board', 'bloque-limite', 'via-autoasegurada',
    'pegues-proyecto', 'resistencia-4x4',
  ],
}

// Resistencia de fuerza: multipresa 10:5 (P-36) y 4x4 de bloques fáciles (P-37), más la vía al límite. Intensas
// de dedos: vía + multipresa = 2 por semana; el 4x4 es carga alta pero no carga los dedos al límite.
export const FASE_RESISTENCIA: Fase = {
  id: 'resistencia',
  nombre: 'Resistencia de fuerza',
  cupos: {
    'evaluacion-dedos': 1, 'via-cuerda-limite': 1, 'multipresa-resistencia-fuerza': 1, 'resistencia-4x4': 1,
    tecnica: 1, arc: 1, hombro: 2, dominadas: 1,
  },
  // El 4x4 va antes que la multipresa: solo se puede hacer en el rocódromo, mientras que la multipresa también
  // cabe en casa; así, sin compañero en el rocódromo toca 4x4 y en casa, multipresa.
  prioridad: [
    'evaluacion-dedos', 'via-cuerda-limite', 'resistencia-4x4', 'multipresa-resistencia-fuerza', 'tecnica', 'arc', 'hombro',
    'dominadas',
  ],
  prohibidos: [
    'campus', 'multipresa-maxima', 'multipresa-resistencia', 'board', 'bloque-limite', 'via-autoasegurada',
    'pegues-proyecto',
  ],
}

// Rendimiento: el proyecto en roca cuando hay viaje (P-60, P-61), vías al límite en sala el resto, multipresa de
// mantenimiento y técnica. En roca, la técnica (vías por debajo del nivel) da el segundo día de un viaje.
// Semana de sala: vía (con compañero) + bloque al límite (sin compañero) + multipresa de mantenimiento (1 bloque)
// = 3 intensas, el tope de P-12. Semana de viaje: los pegues van primero y compiten con lo demás; la regla
// seguridad.dedos-7dias impide pasar de 3 aunque los cupos sumen más.
export const FASE_RENDIMIENTO: Fase = {
  id: 'rendimiento',
  nombre: 'Rendimiento y proyecto',
  cupos: {
    'pegues-proyecto': 2, 'via-cuerda-limite': 1, 'bloque-limite': 1, 'multipresa-resistencia': 1, tecnica: 1, arc: 1, hombro: 2,
  },
  prioridad: ['pegues-proyecto', 'via-cuerda-limite', 'bloque-limite', 'multipresa-resistencia', 'tecnica', 'arc', 'hombro'],
  prohibidos: [
    'campus', 'multipresa-maxima', 'multipresa-resistencia-fuerza', 'board', 'via-autoasegurada',
    'dominadas', 'resistencia-4x4', 'evaluacion-dedos',
  ],
}

// Transición entre ciclos: descanso activo, nada intenso.
export const FASE_TRANSICION: Fase = {
  id: 'transicion',
  nombre: 'Transición y descanso activo',
  cupos: { tecnica: 2, arc: 1, hombro: 2 },
  prioridad: ['tecnica', 'arc', 'hombro'],
  prohibidos: [
    'multipresa-resistencia', 'multipresa-maxima', 'multipresa-resistencia-fuerza', 'evaluacion-dedos', 'board',
    'bloque-limite', 'via-cuerda-limite', 'via-autoasegurada', 'pegues-proyecto', 'campus', 'dominadas', 'resistencia-4x4',
  ],
}

// Semana objetivo (el viaje del 7a): solo pegues al proyecto en roca y cosas suaves; nada intenso en sala, para
// llegar fresco a los días de roca (decisión de diseño tras la revisión).
export const FASE_OBJETIVO: Fase = {
  id: 'rendimiento',
  nombre: 'Semana objetivo',
  cupos: { 'pegues-proyecto': 2, tecnica: 1, arc: 1, hombro: 2 },
  prioridad: ['pegues-proyecto', 'tecnica', 'arc', 'hombro'],
  prohibidos: [
    'multipresa-resistencia', 'multipresa-maxima', 'multipresa-resistencia-fuerza', 'evaluacion-dedos', 'board',
    'bloque-limite', 'via-cuerda-limite', 'via-autoasegurada', 'campus', 'dominadas', 'resistencia-4x4',
  ],
}

// Las fases son constantes compartidas: se congelan para que nadie pueda cambiarlas por accidente desde fuera.
function congelar(f: Fase): Fase {
  Object.freeze(f.cupos)
  Object.freeze(f.prioridad)
  Object.freeze(f.prohibidos)
  return Object.freeze(f)
}
for (const f of [FASE_BASE, FASE_FUERZA, FASE_RESISTENCIA, FASE_RENDIMIENTO, FASE_TRANSICION, FASE_OBJETIVO]) congelar(f)

export const FASES: Readonly<Record<FaseId, Fase>> = Object.freeze({
  base: FASE_BASE,
  fuerza: FASE_FUERZA,
  resistencia: FASE_RESISTENCIA,
  rendimiento: FASE_RENDIMIENTO,
  transicion: FASE_TRANSICION,
})

// Lo que se quita en una semana de descarga (P-48: sin sesiones al límite; P-39: las dominadas, fuera de la descarga).
const FUERA_DE_DESCARGA: readonly TipoSesion[] = [
  'via-cuerda-limite', 'bloque-limite', 'board', 'pegues-proyecto', 'campus', 'evaluacion-dedos', 'dominadas',
]

// Semana de descarga (P-47, P-48): sin nada al límite ni dominadas (P-39); la multipresa y el 4x4 se mantienen con la
// mitad de volumen (lo aplican las plantillas al ver `descarga`). No muta la fase recibida.
export function descargar(fase: Fase): Fase {
  const cupos = { ...fase.cupos }
  for (const t of FUERA_DE_DESCARGA) delete cupos[t]
  return {
    ...fase,
    nombre: `${fase.nombre} (descarga)`,
    cupos,
    prioridad: fase.prioridad.filter((t) => !FUERA_DE_DESCARGA.includes(t)),
    prohibidos: [...new Set([...fase.prohibidos, ...FUERA_DE_DESCARGA])],
    descarga: true,
  }
}
