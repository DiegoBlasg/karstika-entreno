import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { ahoraMadrid } from '@/lib/fecha'
import { chequeoDelDia, inicialEntrenar } from '@/lib/formulario'
import { requerirDatos } from '@/lib/servidor/consultas'
import { FormularioEntrenar } from './FormularioEntrenar'

export default async function PaginaEntrenar({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { datos } = await requerirDatos() // sin perfil, al perfil
  const ahora = ahoraMadrid(new Date())
  const inicial = inicialEntrenar(await searchParams)
  return (
    <div className="space-y-4">
      <header>
        <Link href="/semana" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-texto-2 hover:text-texto">
          <ChevronLeft aria-hidden="true" size={20} />
          Semana
        </Link>
        <h1 className="font-titular text-4xl font-extrabold uppercase leading-none">Preparar sesión</h1>
      </header>
      <FormularioEntrenar hoy={ahora.fecha} hora={ahora.hhmm} inicioTemporada={datos.perfil.inicio_temporada} inicial={inicial} chequeoHoy={chequeoDelDia(datos.chequeos, ahora.fecha)} />
    </div>
  )
}
