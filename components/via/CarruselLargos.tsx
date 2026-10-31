'use client'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { PasosVia, colorPaso, type PasoVia } from './PasosVia'

const SIN_BARRA = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

const movimientoReducido = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Desplaza `contenedor` en horizontal para centrar `el` (sin tocar el scroll vertical de la página, que scrollIntoView sí
// movería). `el` debe tener a `contenedor` como offsetParent (contenedor `relative`).
function centrar(contenedor: HTMLElement, el: HTMLElement, suave: boolean) {
  const left = el.offsetLeft - (contenedor.clientWidth - el.offsetWidth) / 2
  contenedor.scrollTo({ left, behavior: suave && !movimientoReducido() ? 'smooth' : 'auto' })
}

// Pasos de la temporada + carrusel de largos. Al entrar, centra el largo actual (`inicial`). Tocar un paso lleva a su
// tarjeta; al deslizar, el paso de la tarjeta centrada queda marcado y a la vista.
export function CarruselLargos({ pasos, tarjetas, inicial }: { pasos: PasoVia[]; tarjetas: ReactNode[]; inicial: number }) {
  const [visto, setVisto] = useState(inicial)
  // Hasta centrar el largo actual (antes de pintar), la fila y el carrusel no se ven: si no, al cargar la página se
  // verían un instante en el primer largo y luego saltarían. Solo con JavaScript (sin él no hay nada que centrar).
  const [listo, setListo] = useState(false)
  const fila = useRef<HTMLDivElement>(null)
  const carrusel = useRef<HTMLOListElement>(null)
  const marco = useRef(0)

  const tarjeta = (i: number) => carrusel.current?.children[i] as HTMLElement | undefined
  const paso = (i: number) => fila.current?.querySelectorAll('li')[i] as HTMLElement | undefined

  useLayoutEffect(() => {
    const c = carrusel.current
    const t = tarjeta(inicial)
    if (c && t) centrar(c, t, false)
    // Si a la fila le sobran unos pocos px (8 largos y la cima en 390 px), se centra entera: solo se recorta el margen
    // vacío de los pasos de los extremos. Si sobra más, se centra el paso inicial.
    const f = fila.current
    const p = paso(inicial)
    const sobra = f ? f.scrollWidth - f.clientWidth : 0
    if (f && sobra > 0 && sobra < 24) f.scrollLeft = sobra / 2
    else if (f && p) centrar(f, p, false)
    setListo(true)
  }, [inicial])

  // Mantiene a la vista el círculo del paso de la tarjeta centrada (la fila se desliza si no caben todos).
  useEffect(() => {
    const f = fila.current
    const p = paso(visto)
    const circulo = p?.querySelector('a > span')?.getBoundingClientRect()
    if (!f || !p || !circulo) return
    const caja = f.getBoundingClientRect()
    if (circulo.left < caja.left || circulo.right > caja.right) centrar(f, p, true)
  }, [visto])

  useEffect(() => () => cancelAnimationFrame(marco.current), [])

  const alDeslizar = useCallback(() => {
    cancelAnimationFrame(marco.current)
    marco.current = requestAnimationFrame(() => {
      const c = carrusel.current
      if (!c) return
      const centro = c.scrollLeft + c.clientWidth / 2
      let mejor = 0
      let distancia = Infinity
      Array.from(c.children).forEach((el, i) => {
        const t = el as HTMLElement
        const d = Math.abs(t.offsetLeft + t.offsetWidth / 2 - centro)
        if (d < distancia) { distancia = d; mejor = i }
      })
      setVisto(mejor)
    })
  }, [])

  // Los pasos son enlaces a «#largo-N»: en vez del salto del ancla (que movería la página), se centra su tarjeta y el
  // foco pasa a ella (a su botón, si abre hoja).
  const alTocarPaso = (e: MouseEvent<HTMLDivElement>) => {
    const enlace = (e.target as Element).closest('a[href^="#"]')
    if (!enlace) return
    const i = pasos.findIndex((p) => `#${p.id}` === enlace.getAttribute('href'))
    const c = carrusel.current
    const t = tarjeta(i)
    if (i < 0 || !c || !t) return
    e.preventDefault()
    centrar(c, t, true)
    setVisto(i)
    ;(t.querySelector('button') ?? t).focus({ preventScroll: true })
  }

  return (
    <div className={`space-y-3 ${listo ? '' : '[@media(scripting:enabled)]:invisible'}`}>
      <div ref={fila} onClick={alTocarPaso} className={`relative -mx-4 overflow-x-auto ${SIN_BARRA}`}>
        <PasosVia pasos={pasos} visto={visto} />
      </div>
      <section aria-label="Tarjetas de los largos" aria-roledescription="carrusel" className="space-y-3">
        {/* Las tarjetas ocupan el 78 % y van centradas: las vecinas asoman por los lados. Los ::before/::after hacen de
            margen para poder centrar la primera y la última (Safari ignora el padding final de un contenedor con scroll). */}
        <ol
          ref={carrusel}
          onScroll={alDeslizar}
          className={`relative -mx-4 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto py-1 ${SIN_BARRA} before:w-[calc(11%-0.75rem)] before:shrink-0 before:content-[''] after:w-[calc(11%-0.75rem)] after:shrink-0 after:content-['']`}
        >
          {tarjetas.map((t, i) => (
            <li
              key={pasos[i]!.id}
              id={pasos[i]!.id}
              tabIndex={-1}
              className={`w-[78%] shrink-0 snap-center snap-always rounded-2xl transition-opacity duration-300 ${i === visto ? '' : 'opacity-50'}`}
            >
              {t}
            </li>
          ))}
        </ol>
        <div aria-hidden="true" className="flex items-center justify-center gap-1.5">
          {pasos.map((p, i) => (
            <span
              key={p.id}
              className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${i === visto ? `w-5 ${colorPaso(p).fondo}` : 'w-1.5 bg-texto-3'}`}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
