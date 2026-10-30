// Esquemas de la posición clave de cada ejercicio: figuras de palitos en SVG, de una sola tinta (currentColor).
// Funcionan sin conexión y se leen a 320 px de ancho (trazo grueso, viewBox pequeño).
import type { ReactNode } from 'react'
import { DESCRIPCION_DIBUJO, type DibujoId } from '@/lib/biblioteca/dibujos'

// Una figura de pie de frente: cabeza, tronco y piernas (los brazos los pone cada dibujo).
function FiguraDePie({ x, y = 20, cabeza = 7 }: { x: number; y?: number; cabeza?: number }) {
  return (
    <>
      <circle cx={x} cy={y} r={cabeza} />
      <path d={`M${x} ${y + cabeza} V${y + 50} L${x - 9} ${y + 88} M${x} ${y + 50} L${x + 9} ${y + 88}`} />
    </>
  )
}

const Flecha = ({ d }: { d: string }) => <path d={d} markerEnd="url(#punta)" strokeWidth={2} />

const SUELO = <path d="M6 108 H154" strokeWidth={2} />

const DIBUJOS: Record<DibujoId, ReactNode> = {
  'colgado-multipresa': (
    <>
      {/* Multipresa con la regleta */}
      <rect x="30" y="6" width="80" height="14" rx="2" />
      <path d="M58 20 H82" strokeWidth={2} />
      {/* Figura colgada, brazos casi estirados */}
      <path d="M58 22 L61 54 H79 L82 22" />
      <circle cx="70" cy="42" r="6" />
      <path d="M70 48 V84 L63 110 M70 84 L77 110" />
      {/* Detalle ampliado del agarre semiarqueado: la última falange sobre la regleta y la media cae, a unos 90° */}
      <circle cx="132" cy="62" r="26" strokeWidth={1.5} strokeDasharray="3 3" />
      <rect x="128" y="50" width="22" height="8" rx="1" strokeWidth={2} />
      <path d="M146 48 H130 L128 68 L114 78" />
      <text x="134" y="78" fontSize="10" fill="currentColor" stroke="none">90°</text>
    </>
  ),
  'retraccion-barra': (
    <>
      <path d="M30 14 H130" />
      <path d="M68 14 L71 44 M92 14 L89 44" />
      <circle cx="80" cy="38" r="7" />
      <path d="M80 45 V78 L73 108 M80 78 L87 108" />
      {/* Las escápulas bajan y el cuerpo sube un poco, sin doblar los codos */}
      <Flecha d="M112 84 V54" />
      <Flecha d="M60 40 V52" />
      <Flecha d="M100 40 V52" />
    </>
  ),
  dominada: (
    <>
      <path d="M30 30 H130" />
      <circle cx="80" cy="23" r="7" />
      {/* Barbilla a la altura de la barra, codos abajo y a los lados */}
      <path d="M64 30 L54 58 L72 44 H88 L106 58 L96 30" />
      <path d="M80 44 V80 L72 112 M80 80 L88 112" />
    </>
  ),
  flexion: (
    <>
      {SUELO}
      <circle cx="26" cy="80" r="6" />
      {/* Cuerpo recto de la cabeza a los talones, pecho cerca del suelo */}
      <path d="M33 84 L142 102" />
      <path d="M40 86 L54 76 L44 106" />
      <Flecha d="M60 70 V58" />
    </>
  ),
  'rotacion-externa': (
    <>
      {/* Anclaje de la banda */}
      <path d="M12 30 V108" />
      <FiguraDePie x={62} />
      {/* Brazo libre */}
      <path d="M62 34 L52 64" />
      {/* Codo pegado al costado, antebrazo girando hacia fuera */}
      <path d="M62 34 L68 58 L104 58" />
      <path d="M12 58 L104 58" strokeWidth={1.5} strokeDasharray="4 3" />
      <Flecha d="M86 72 Q100 70 106 64" />
    </>
  ),
  ytw: (
    <>
      {[27, 80, 133].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={26} r={6} />
          <path d={`M${x} 32 V70 L${x - 8} 98 M${x} 70 L${x + 8} 98`} />
          <path
            d={
              i === 0
                ? `M${x} 38 L${x - 16} 12 M${x} 38 L${x + 16} 12`
                : i === 1
                  ? `M${x} 38 H${x - 22} M${x} 38 H${x + 22}`
                  : `M${x} 38 L${x - 12} 50 L${x - 18} 30 M${x} 38 L${x + 12} 50 L${x + 18} 30`
            }
          />
          <text x={x} y={116} textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor" stroke="none">
            {['Y', 'T', 'W'][i]}
          </text>
        </g>
      ))}
    </>
  ),
  'face-pull': (
    <>
      {/* Anclaje a la altura de la cara */}
      <path d="M148 14 V108" />
      <circle cx="80" cy="26" r="8" />
      <path d="M78 34 L74 72 L64 108 M74 72 L84 108" />
      {/* Codos altos, manos hacia la cara */}
      <path d="M77 42 L60 32 L92 28" />
      <path d="M92 28 L148 32" strokeWidth={1.5} strokeDasharray="4 3" />
      <Flecha d="M124 20 H100" />
    </>
  ),
  plancha: (
    <>
      {SUELO}
      <circle cx="26" cy="56" r="6" />
      <path d="M34 62 L142 102" />
      {/* Mano de apoyo bajo el hombro */}
      <path d="M38 64 L38 106" />
      {/* La otra mano toca el hombro contrario */}
      <path d="M40 64 L58 84 L46 66" />
      <circle cx="46" cy="66" r="2.5" fill="currentColor" />
      <Flecha d="M70 60 Q60 48 48 54" />
    </>
  ),
}

export function Dibujo({ id, className = '' }: { id: DibujoId; className?: string }) {
  return (
    <svg
      viewBox="0 0 160 120"
      role="img"
      aria-label={DESCRIPCION_DIBUJO[id]}
      className={`h-auto w-full max-w-xs ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <marker id="punta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="currentColor" stroke="none" />
        </marker>
      </defs>
      {DIBUJOS[id]}
    </svg>
  )
}
