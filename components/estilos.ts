// Clases compartidas del estilo «Topo nocturno». Los componentes de components/ui las usan; las pantallas antiguas
// usan BOTON, CAMPO y TARJETA directamente hasta que se rehagan.
const BOTON_BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 py-2.5 font-titular text-lg font-bold uppercase tracking-wide transition-colors disabled:opacity-50'
export const BOTON = `${BOTON_BASE} bg-progreso text-fondo hover:bg-progreso/90 focus-visible:outline-texto`
export const BOTON_SECUNDARIO = `${BOTON_BASE} border border-borde text-texto hover:bg-superficie-2`
export const BOTON_PELIGRO = `${BOTON_BASE} bg-rojo text-fondo hover:bg-rojo/90`
export const CAMPO =
  'mt-1 block min-h-11 w-full rounded-xl border border-borde bg-superficie-2 px-3 py-2 text-texto placeholder:text-texto-2'
export const TARJETA = 'space-y-3 rounded-2xl border border-borde bg-superficie p-4'
export const TARJETA_DESTACADA = 'space-y-3 rounded-2xl border border-progreso bg-superficie p-4'
export const ETIQUETA = 'font-titular text-xs font-medium uppercase tracking-[0.08em] text-texto-2'
export const CHIP = 'inline-flex items-center rounded-full bg-superficie-2 px-2.5 py-1 text-xs text-texto'
export const ENLACE = 'text-progreso underline underline-offset-2'
