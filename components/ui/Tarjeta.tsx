import type { ComponentPropsWithoutRef } from 'react'
import { TARJETA, TARJETA_DESTACADA } from '../estilos'

export function Tarjeta({ destacada = false, className = '', ...resto }: ComponentPropsWithoutRef<'section'> & { destacada?: boolean }) {
  return <section className={`${destacada ? TARJETA_DESTACADA : TARJETA} ${className}`} {...resto} />
}
