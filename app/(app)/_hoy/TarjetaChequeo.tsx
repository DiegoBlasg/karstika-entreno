'use client'

import { useActionState, useEffect, useState } from 'react'
import { CamposChequeo } from '@/components/CamposChequeo'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { BOTON, TARJETA } from '@/components/estilos'
import type { EstadoAccion } from '@/lib/estado'
import { guardarChequeoHoy } from './acciones'

const clave = (hoy: string): string => `chequeo-saltado:${hoy}`

// «¿Cómo llegas hoy?» en Hoy. «Ahora no» la oculta hasta mañana en este navegador. Empieza oculta y se muestra tras
// leer localStorage, para que no aparezca y desaparezca al cargar.
export function TarjetaChequeo({ hoy }: { hoy: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(guardarChequeoHoy, null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    let saltado = false
    try {
      saltado = localStorage.getItem(clave(hoy)) !== null
    } catch {
      // Sin localStorage (navegación privada, bloqueado): se muestra siempre.
    }
    setVisible(!saltado)
  }, [hoy])
  const ahoraNo = (): void => {
    try {
      localStorage.setItem(clave(hoy), '1')
    } catch {
      // Sin localStorage solo se oculta hasta recargar.
    }
    setVisible(false)
  }
  if (!visible) return null
  return (
    <section className={TARJETA}>
      <h2 className="font-medium">¿Cómo llegas hoy?</h2>
      <form onSubmit={enviarSinVaciar(accion)} className="space-y-3">
        <CamposChequeo />
        <div className="flex items-center gap-4">
          <button className={BOTON} disabled={pendiente}>{pendiente ? 'Guardando…' : 'Guardar chequeo'}</button>
          <button type="button" onClick={ahoraNo} className="min-h-11 px-2 text-sm underline">Ahora no</button>
        </div>
        {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
      </form>
    </section>
  )
}
