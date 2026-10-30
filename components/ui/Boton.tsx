import type { ComponentPropsWithoutRef } from 'react'
import { BOTON, BOTON_PELIGRO, BOTON_SECUNDARIO } from '../estilos'

const VARIANTE = { principal: BOTON, secundario: BOTON_SECUNDARIO, peligro: BOTON_PELIGRO } as const

export function Boton({
  variante = 'principal',
  className = '',
  type = 'button',
  ...resto
}: ComponentPropsWithoutRef<'button'> & { variante?: keyof typeof VARIANTE }) {
  return <button type={type} className={`${VARIANTE[variante]} ${className}`} {...resto} />
}
