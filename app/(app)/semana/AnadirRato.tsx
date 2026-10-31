'use client'

import { Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Hoja } from '@/components/ui/Hoja'
import { FormularioHueco } from './FormularioHueco'

// El «+» de un día: abre la hoja con el formulario y ese día ya elegido. Al guardar, la hoja se cierra y la
// confirmación queda en la fila del día (que ya enseña el rato nuevo).
// Va dentro de la rejilla de la fila: el botón en la tercera columna y la confirmación a todo lo ancho, debajo.
export function AnadirRato({ fecha, dia }: { fecha: string; dia: string }) {
  const [mensaje, setMensaje] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const alAnadir = useCallback((m: string) => {
    setMensaje(m)
    ref.current?.closest('dialog')?.close()
  }, [])
  // La confirmación se va sola: si no, quedaría una por cada día en el que se ha añadido algo.
  useEffect(() => {
    if (!mensaje) return
    const t = setTimeout(() => setMensaje(null), 5000)
    return () => clearTimeout(t)
  }, [mensaje])
  return (
    <>
      <div className="col-start-3 row-start-1 flex justify-end">
        <Hoja
          disparador={<Plus aria-hidden="true" size={22} />}
          etiquetaDisparador={`Añadir un rato para entrenar el ${dia}`}
          titulo={`Rato para entrenar · ${dia}`}
          claseDisparador="-mr-2 flex size-11 items-center justify-center rounded-xl text-progreso hover:bg-superficie-2"
        >
          <div ref={ref}><FormularioHueco fecha={fecha} alAnadir={alAnadir} /></div>
        </Hoja>
      </div>
      {mensaje && <p role="status" className="col-span-3 text-sm text-progreso">{mensaje}</p>}
    </>
  )
}
