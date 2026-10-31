'use client'

import { Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Hoja } from '@/components/ui/Hoja'
import { useConfirmar } from './Confirmacion'
import { FormularioHueco } from './FormularioHueco'

// El «+» de un día: abre la hoja con el formulario y ese día ya elegido. Al guardar, la hoja se cierra y la
// confirmación sale en la región de estado de la página (ConfirmacionRatos), con el día.
// Va en la tercera columna de la rejilla de la fila.
export function AnadirRato({ fecha, dia }: { fecha: string; dia: string }) {
  const confirmar = useConfirmar()
  // Al cerrarse la hoja (guardando, con la X, Escape o tocando fuera) el formulario vuelve a empezar: otra clave lo
  // monta de nuevo, sin lo escrito ni el error de la vez anterior.
  const [clave, setClave] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const hoja = ref.current?.closest('dialog')
    if (!hoja) return
    const alCerrar = () => setClave((k) => k + 1)
    hoja.addEventListener('close', alCerrar)
    return () => hoja.removeEventListener('close', alCerrar)
  }, [])
  const alAnadir = useCallback(() => {
    confirmar(`Rato añadido el ${dia}.`)
    ref.current?.closest('dialog')?.close()
  }, [confirmar, dia])
  return (
    <div className="col-start-3 row-start-1 flex justify-end">
      <Hoja
        disparador={<Plus aria-hidden="true" size={22} />}
        etiquetaDisparador={`Añadir un rato para entrenar el ${dia}`}
        titulo={`Rato para entrenar · ${dia}`}
        claseDisparador="-mr-2 flex size-11 items-center justify-center rounded-xl text-progreso hover:bg-superficie-2"
      >
        <div ref={ref}><FormularioHueco key={clave} fecha={fecha} alAnadir={alAnadir} /></div>
      </Hoja>
    </div>
  )
}
