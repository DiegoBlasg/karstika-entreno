import Link from 'next/link'
import { BOTON, TARJETA } from '../estilos'

export function EstadoVacio({ titulo, texto, accion }: { titulo: string; texto: string; accion?: { href: string; texto: string } }) {
  return (
    <div className={`${TARJETA} text-center`}>
      <p className="font-titular text-xl font-bold uppercase">{titulo}</p>
      <p className="text-sm text-texto-2">{texto}</p>
      {accion && <Link href={accion.href} className={BOTON}>{accion.texto}</Link>}
    </div>
  )
}
