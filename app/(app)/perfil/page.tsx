import Link from 'next/link'
import { AvisoMedico } from '@/components/AvisoMedico'
import { BOTON_SECUNDARIO } from '@/components/estilos'
import { Aviso } from '@/components/ui/Aviso'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { bd } from '@/lib/servidor/bd'
import { cargarDatos } from '@/lib/servidor/consultas'
import { salir } from '../acciones'
import { FormularioPerfil } from './FormularioPerfil'

export default async function PaginaPerfil() {
  const datos = await cargarDatos(await bd())
  return (
    <div className="space-y-4">
      <h1 className="font-titular text-4xl font-extrabold uppercase leading-none">Yo</h1>
      {!datos && <Aviso tono="info">Antes de empezar, cuéntale al entrenador quién eres y cuándo es tu objetivo.</Aviso>}
      <FormularioPerfil perfil={datos?.perfil ?? null} />
      {datos && (
        <Tarjeta aria-label="Aviso médico">
          <Etiqueta as="h2">Aviso médico</Etiqueta>
          <AvisoMedico />
        </Tarjeta>
      )}
      <section className="space-y-2">
        <Link href="/biblioteca" className={`${BOTON_SECUNDARIO} w-full`}>Biblioteca de ejercicios</Link>
        <form action={salir}>
          <button type="submit" className={`${BOTON_SECUNDARIO} w-full text-rojo`}>Salir</button>
        </form>
      </section>
    </div>
  )
}
