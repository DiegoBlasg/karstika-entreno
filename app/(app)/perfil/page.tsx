import Link from 'next/link'
import { BOTON_SECUNDARIO } from '@/components/estilos'
import { bd } from '@/lib/servidor/bd'
import { cargarDatos } from '@/lib/servidor/consultas'
import { salir } from '../acciones'
import { FormularioPerfil } from './FormularioPerfil'

export default async function PaginaPerfil() {
  const datos = await cargarDatos(await bd())
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Perfil</h1>
      {!datos && <p>Antes de empezar, cuéntale al entrenador quién eres y cuándo es tu objetivo.</p>}
      <FormularioPerfil perfil={datos?.perfil ?? null} />
      <section className="space-y-2 border-t border-borde pt-4">
        <Link href="/biblioteca" className={`${BOTON_SECUNDARIO} w-full`}>Biblioteca de ejercicios</Link>
        <form action={salir}>
          <button type="submit" className={`${BOTON_SECUNDARIO} w-full text-rojo`}>Salir</button>
        </form>
      </section>
    </div>
  )
}
