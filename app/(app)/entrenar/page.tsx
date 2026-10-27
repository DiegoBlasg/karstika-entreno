import { ahoraMadrid } from '@/lib/fecha'
import { requerirDatos } from '@/lib/servidor/consultas'
import { FormularioEntrenar } from './FormularioEntrenar'

export default async function PaginaEntrenar() {
  const { datos } = await requerirDatos() // sin perfil, al perfil
  const ahora = ahoraMadrid(new Date())
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Entrenar</h1>
      <FormularioEntrenar hoy={ahora.fecha} hora={ahora.hhmm} inicioTemporada={datos.perfil.inicio_temporada} />
    </div>
  )
}
