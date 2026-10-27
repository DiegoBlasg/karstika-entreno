import { bd } from '@/lib/servidor/bd'
import { cargarDatos } from '@/lib/servidor/consultas'
import { FormularioPerfil } from './FormularioPerfil'

export default async function PaginaPerfil() {
  const datos = await cargarDatos(await bd())
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Perfil</h1>
      {!datos && <p>Antes de empezar, cuéntale al entrenador quién eres y cuándo es tu objetivo.</p>}
      <FormularioPerfil perfil={datos?.perfil ?? null} />
    </div>
  )
}
