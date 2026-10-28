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
      <h1 className="text-xl font-semibold">Entrenar</h1>
      <FormularioEntrenar hoy={ahora.fecha} hora={ahora.hhmm} inicioTemporada={datos.perfil.inicio_temporada} inicial={inicial} chequeoHoy={chequeoDelDia(datos.chequeos, ahora.fecha)} />
    </div>
  )
}
