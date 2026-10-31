import { Check } from 'lucide-react'
import { IconoCima } from '@/components/iconos/Escalada'
import type { EstadoTramo } from '@/lib/datos/via'
import type { FaseId } from '@/motor/propuesta-tipos'
import { COLOR_CIMA, COLOR_FASE } from '@/lib/ui/fases'

export interface PasoVia {
  id: string // ancla de su tarjeta del carrusel: «largo-3», «largo-cima»
  numero: number | null // null: la cima
  faseId: FaseId | null // null: la cima
  estado: EstadoTramo
  nombre: string // para lectores de pantalla: «Largo 3 · Resistencia de fuerza · ahora»
}

export const colorPaso = (p: PasoVia) => (p.faseId ? COLOR_FASE[p.faseId] : COLOR_CIMA)

function Circulo({ paso }: { paso: PasoVia }) {
  const color = colorPaso(paso)
  const contenido = paso.numero === null ? <IconoCima size={18} /> : paso.numero
  if (paso.estado === 'actual') {
    return (
      <span className={`flex size-9 items-center justify-center rounded-full border-[3px] bg-fondo font-titular text-lg font-extrabold ${color.borde} ${color.textoPequeno}`}>
        {contenido}
      </span>
    )
  }
  if (paso.estado === 'hecho') {
    return (
      <span className={`flex size-8 items-center justify-center rounded-full ${color.fondo} ${color.textoEncima}`}>
        {paso.numero === null ? contenido : <Check size={17} strokeWidth={3.5} />}
      </span>
    )
  }
  // Por hacer: el color de su fase al 28 %, sobre el fondo para que la línea no se vea por debajo.
  return (
    <span className="relative flex size-8 items-center justify-center rounded-full bg-fondo font-titular text-base font-bold text-texto-2">
      <span className={`absolute inset-0 rounded-full opacity-[.28] ${color.fondo}`} />
      <span className={`relative ${paso.numero === null ? color.texto : ''}`}>{contenido}</span>
    </span>
  )
}

// Fila de pasos de la temporada: un círculo por largo y la cima al final, unidos por una línea (lima hasta donde vas).
// Cada paso es un enlace a su tarjeta del carrusel. `visto`: el paso cuya tarjeta está centrada en el carrusel.
export function PasosVia({ pasos, visto }: { pasos: PasoVia[]; visto: number }) {
  return (
    <ol aria-label="Largos de la temporada" className="flex min-w-full">
      {pasos.map((p, i) => {
        const siguiente = pasos[i + 1]
        return (
          <li key={p.id} className="relative flex min-w-11 flex-1 justify-center">
            {siguiente && (
              <span
                aria-hidden="true"
                className={`absolute left-1/2 top-[22.5px] h-[3px] w-full ${siguiente.estado === 'futuro' ? 'bg-pista' : 'bg-progreso'}`}
              />
            )}
            <a
              href={`#${p.id}`}
              aria-current={p.estado === 'actual' ? 'step' : undefined}
              className="relative flex h-[3.25rem] w-11 flex-col items-center gap-1 rounded-xl pt-1.5"
            >
              <span aria-hidden="true" className="flex size-9 items-center justify-center">
                <Circulo paso={p} />
              </span>
              <span aria-hidden="true" className={`h-1 w-4 rounded-full transition-colors duration-300 ${i === visto ? 'bg-texto' : 'bg-transparent'}`} />
              <span className="sr-only">{p.nombre}</span>
            </a>
          </li>
        )
      })}
    </ol>
  )
}
