'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { enviarSinVaciar } from '@/components/enviarSinVaciar'
import { BOTON, CAMPO } from '@/components/estilos'
import { Opciones } from '@/components/ui/Opciones'
import type { EstadoAccion } from '@/lib/estado'
import { MINUTOS_DISPONIBLES } from '@/lib/formulario'
import { anadirHueco } from './acciones'

// Un rato para entrenar en un día ya elegido (el «+» de ese día). Se envía sin vaciar: si el servidor lo rechaza
// (se solapa, ya ha pasado…) los campos se quedan como estaban. Al guardarlo avisa con `alAnadir` (la hoja se cierra).
export function FormularioHueco({ fecha, alAnadir }: { fecha: string; alAnadir: (mensaje: string) => void }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(anadirHueco, null)
  const [minutos, setMinutos] = useState(60)
  const [lugar, setLugar] = useState('casa')
  // Cada respuesta de la acción es un objeto nuevo: se avisa una sola vez por respuesta, aunque se vuelva a pintar.
  const avisado = useRef<EstadoAccion>(null)
  useEffect(() => {
    if (estado?.ok && avisado.current !== estado) {
      avisado.current = estado
      alAnadir(estado.ok)
    }
  }, [estado, alAnadir])
  return (
    <form onSubmit={enviarSinVaciar(accion)} className="space-y-4">
      <input type="hidden" name="fecha" value={fecha} />
      <label className="block">Hora<input type="time" name="hora" defaultValue="09:00" required className={CAMPO} /></label>
      <Opciones nombre="compania" leyenda="¿Con quién?" requerido valor="solo" columnas={2}
        opciones={[{ valor: 'solo', texto: 'Solo' }, { valor: 'con-gente', texto: 'Con gente' }]} />
      <Opciones nombre="lugar" leyenda="¿Dónde?" requerido valor={lugar} onCambio={(v) => { setLugar(v); setMinutos(v === 'casa' ? 60 : 90) }}
        opciones={[{ valor: 'casa', texto: 'Casa' }, { valor: 'rocodromo', texto: 'Rocódromo' }, { valor: 'roca', texto: 'Roca' }]} />
      <label className="block">
        Minutos disponibles
        <input
          type="number" name="minutos" min={MINUTOS_DISPONIBLES.min} max={MINUTOS_DISPONIBLES.max} step={5}
          value={minutos} onChange={(e) => setMinutos(Number(e.target.value))} required className={CAMPO}
        />
      </label>
      {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
      <button className={`${BOTON} w-full`} disabled={pendiente}>{pendiente ? 'Guardando…' : 'Añadir rato'}</button>
    </form>
  )
}
