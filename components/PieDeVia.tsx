import Link from 'next/link'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { BOTON, BOTON_SECUNDARIO, TARJETA } from '@/components/estilos'
import { IconoChapa } from '@/components/iconos/Escalada'
import { Etiqueta } from '@/components/ui/Etiqueta'
import type { PasosArranque } from '@/lib/datos/arranque'

interface Paso {
  hecho: boolean
  titulo: string
  accion: (principal: boolean) => ReactNode
}

// Primer uso: tres chapas en vertical, de abajo arriba como la vía (lima = hecho, gris = por hacer). Solo el primer paso
// pendiente lleva el botón principal.
export function PieDeVia({ pasos, principal = true }: { pasos: PasosArranque; principal?: boolean }) {
  const lista: Paso[] = [
    {
      hecho: pasos.huecos,
      titulo: 'Di cuándo puedes entrenar esta semana',
      accion: (p) => <Link href="/semana" className={p ? BOTON : BOTON_SECUNDARIO}>Añadir ratos para entrenar</Link>,
    },
    {
      hecho: pasos.sesion,
      titulo: 'Haz y registra tu primera sesión',
      accion: (p) => <Link href="/entrenar" className={p ? BOTON : BOTON_SECUNDARIO}>Ir a entrenar</Link>,
    },
    {
      hecho: pasos.test,
      titulo: 'Tu primer test de dedos',
      accion: () => (
        <p className="text-sm text-texto-2">El entrenador te lo propondrá cuando toque, en la base.</p>
      ),
    },
  ]
  const primera = lista.findIndex((p) => !p.hecho)
  return (
    <section aria-label="Pie de vía" className={TARJETA}>
      <div className="space-y-1">
        <Etiqueta as="p">Pie de vía</Etiqueta>
        <h2 className="font-titular text-2xl font-bold uppercase leading-tight">Antes de empezar a escalar</h2>
      </div>
      <ol className="flex flex-col-reverse">
        {lista.map((p, i) => (
          <li key={p.titulo} className={`relative pl-12 ${i > 0 ? 'pb-5' : ''}`}>
            {/* Tramo hacia el paso de abajo (se pinta de abajo arriba): lima si ese paso está hecho. */}
            {i > 0 && (
              <span aria-hidden="true" className={`absolute bottom-0 left-[18px] top-9 w-1 -translate-x-1/2 ${lista[i - 1]!.hecho ? 'bg-progreso' : 'bg-pista'}`} />
            )}
            <span
              aria-hidden="true"
              className={`absolute left-0 top-0 flex size-9 items-center justify-center rounded-full ${p.hecho ? 'bg-progreso text-fondo' : 'border-2 border-pista bg-fondo text-texto-2'}`}
            >
              {p.hecho ? <Check size={20} strokeWidth={3} /> : <IconoChapa size={20} />}
            </span>
            <div className="space-y-2">
              <p className={`flex min-h-9 items-center font-medium ${p.hecho ? 'text-texto-2' : ''}`}>
                <span className="sr-only">{p.hecho ? 'Hecho: ' : 'Por hacer: '}</span>
                {p.titulo}
              </p>
              {!p.hecho && p.accion(principal && i === primera)}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
