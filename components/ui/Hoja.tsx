'use client'
import { X } from 'lucide-react'
import { useId, useRef, type ReactNode } from 'react'

// Hoja inferior: «¿Por qué?», fuentes y detalles. Cierra con Escape, con la X y al tocar fuera.
export function Hoja({ disparador, titulo, children, claseDisparador = 'text-progreso underline underline-offset-2' }: {
  disparador: ReactNode
  titulo: string
  children: ReactNode
  claseDisparador?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()
  return (
    <>
      <button type="button" className={claseDisparador} onClick={() => ref.current?.showModal()}>
        {disparador}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={idTitulo}
        onClick={(e) => { if (e.target === e.currentTarget) ref.current?.close() }}
        className="mx-auto mb-0 mt-auto max-h-[85dvh] w-full max-w-[30rem] overflow-y-auto rounded-t-3xl border border-borde bg-superficie p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-texto backdrop:bg-black/60"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id={idTitulo} className="font-titular text-xl font-bold uppercase">{titulo}</h2>
          <button type="button" aria-label="Cerrar" className="-m-2 flex size-11 items-center justify-center rounded-full text-texto-2" onClick={() => ref.current?.close()}>
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        {children}
      </dialog>
    </>
  )
}
