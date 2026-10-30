'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, CircleUser, House, TrendingUp } from 'lucide-react'
import type { ComponentType } from 'react'
import { IconoCima } from './iconos/Escalada'
import { PESTANAS, pestanaActiva, type PestanaId } from '@/lib/ui/pestanas'

const ICONO: Record<PestanaId, ComponentType<{ size?: number }>> = {
  hoy: House, via: IconoCima, semana: CalendarDays, progreso: TrendingUp, yo: CircleUser,
}

export function BarraPestanas() {
  const activa = pestanaActiva(usePathname())
  return (
    <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-40 border-t border-borde bg-fondo-hundido/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-xl">
        {PESTANAS.map((p) => {
          const Icono = ICONO[p.id]
          const actual = p.id === activa
          return (
            <li key={p.id} className="flex-1">
              <Link
                href={p.href}
                aria-current={actual ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${actual ? 'text-progreso' : 'text-texto-2'}`}
              >
                <Icono size={22} />
                {p.etiqueta}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
