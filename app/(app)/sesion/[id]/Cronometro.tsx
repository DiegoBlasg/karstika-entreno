'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Molestia, SesionPlan } from '@/motor'
import { BOTON } from '@/components/estilos'
import type { Paso } from '@/lib/cronometro/pasos'
import { crearPitidos } from '@/lib/cronometro/pitidos'
import {
  atras, empezar, ESTADO_INICIAL, faseFallo, leerGuardado, minutosReales, noPuedoMas, pausar, reabrir, restanteS, siguiente,
  terminar, tick, transcurridoMs, type EstadoReloj,
} from '@/lib/cronometro/reloj'
import { NOMBRE_TIPO } from '@/lib/nombres'
import { FormularioRegistro } from '../../_hoy/FormularioRegistro'

const FONDO: Record<Paso['tipo'], string> = {
  colgado: 'bg-emerald-600 text-white',
  descanso: 'bg-sky-600 text-white',
  preparate: 'bg-amber-400 text-stone-900',
  bloque: 'bg-stone-200 text-stone-900',
  manual: 'bg-stone-200 text-stone-900',
  fallo: 'bg-emerald-600 text-white',
}

const BOTON_SECUNDARIO = 'rounded border border-stone-300 px-4 py-2'

const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function leer(clave: string, nPasos: number): EstadoReloj | null {
  try {
    const v = localStorage.getItem(clave)
    return v ? leerGuardado(JSON.parse(v), nPasos) : null
  } catch {
    return null
  }
}
function escribir(clave: string, e: EstadoReloj | null): void {
  try {
    if (e) localStorage.setItem(clave, JSON.stringify(e))
    else localStorage.removeItem(clave)
  } catch {
    // Sin almacenamiento (ventana privada…): el cronómetro funciona igual, solo no se recupera al recargar.
  }
}

export function Cronometro({ plan, pasos, molestiasChequeo }: { plan: SesionPlan; pasos: Paso[]; molestiasChequeo: Molestia[] }) {
  const router = useRouter()
  const clave = `cronometro:${plan.sesion.id}`
  const pitidos = useMemo(() => crearPitidos(), [])
  const [estado, setEstado] = useState<EstadoReloj>(ESTADO_INICIAL)
  const [guardado, setGuardado] = useState<EstadoReloj | null>(null)
  const [empezado, setEmpezado] = useState(false)
  const [silencio, setSilencio] = useState(false)
  const [ahora, setAhora] = useState(() => Date.now())
  // El navegador no da (o ha negado) el bloqueo de pantalla encendida.
  const [sinPantalla, setSinPantalla] = useState(false)
  // Qué fase y qué pitido corto ya sonaron; `reinicios` distingue volver a empezar el mismo paso con «Atrás».
  const sonado = useRef({ fase: '', corto: '' })
  const reinicios = useRef(0)
  // Tras registrar no se vuelve a guardar nada.
  const registrado = useRef(false)
  const [hayRegistro, setHayRegistro] = useState(false)

  // Lo guardado se lee tras montar (en el servidor no hay localStorage). Si la sesión ya estaba terminada, se vuelve
  // directamente al formulario de registro.
  useEffect(() => {
    const g = leer(clave, pasos.length)
    if (g?.terminado) {
      setEstado(g)
      setEmpezado(true)
    } else {
      setGuardado(g)
    }
  }, [clave, pasos.length])

  useEffect(() => () => pitidos.cerrar(), [pitidos])

  // Un tick cada 200 ms: el estado avanza con la hora real.
  useEffect(() => {
    if (!estado.enMarcha) return
    const id = setInterval(() => {
      const t = Date.now()
      setAhora(t)
      setEstado((e) => tick(pasos, e, t))
    }, 200)
    return () => clearInterval(id)
  }, [estado.enMarcha, pasos])

  // Se guarda la foto en pausa cada vez que cambia algo y cada segundo de marcha (también la de terminada, para no
  // perder los minutos si se recarga antes de registrar).
  const segundo = Math.floor(ahora / 1000)
  useEffect(() => {
    if (empezado && !registrado.current) escribir(clave, pausar(estado, ahora))
    // `ahora` va implícito en `segundo`: basta con guardar una vez por segundo.
  }, [clave, empezado, estado, segundo])

  // Pantalla encendida mientras corre; el navegador suelta el bloqueo al ocultar la pestaña y se pide otra vez al volver.
  useEffect(() => {
    if (!estado.enMarcha) return
    // lib.dom lo declara siempre, pero hay navegadores sin Screen Wake Lock.
    if (!('wakeLock' in navigator) || !navigator.wakeLock) {
      setSinPantalla(true)
      return
    }
    const wakeLock = navigator.wakeLock
    let activo = true
    let bloqueo: WakeLockSentinel | null = null
    const soltar = (b: WakeLockSentinel | null): void => {
      void b?.release().catch(() => {})
    }
    const pedir = (): void => {
      wakeLock.request('screen').then((b) => {
        if (!activo) return soltar(b)
        soltar(bloqueo)
        bloqueo = b
        setSinPantalla(false)
      }).catch(() => {
        if (activo) setSinPantalla(true)
      })
    }
    const alVolver = (): void => {
      if (document.visibilityState === 'visible') pedir()
    }
    pedir()
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      activo = false
      document.removeEventListener('visibilitychange', alVolver)
      soltar(bloqueo)
    }
  }, [estado.enMarcha])

  const paso = pasos[estado.indice]
  const ms = transcurridoMs(estado, ahora)
  const fallo = paso?.tipo === 'fallo' ? faseFallo(paso, ms) : null
  const restante = fallo ? fallo.restanteS : restanteS(pasos, estado, ahora)

  // Pitidos, solo con el reloj en marcha. Cada fase (un paso, o cada colgado/descanso dentro de un `fallo`) tiene su
  // clave; al cambiar de clave suena el de inicio (colgado o descanso) y después un corto en 3, 2 y 1, una vez cada uno.
  // El registro de lo sonado se lleva también en silencio, para que al quitar el silencio no suene nada atrasado. Con
  // el reloj en pausa no se actualiza: si en pausa se salta a otro paso, su pitido de inicio suena al seguir.
  useEffect(() => {
    if (!estado.enMarcha || estado.terminado || !paso) return
    let fase = `${reinicios.current}:${estado.indice}`
    let tipo: Paso['tipo'] = paso.tipo
    if (paso.tipo === 'fallo' && fallo) {
      fase += `:${Math.floor(ms / ((paso.trabajoS + paso.descansoS) * 1000))}:${fallo.fase}`
      tipo = fallo.fase
    }
    const s = sonado.current
    if (s.fase !== fase) {
      s.fase = fase
      if (tipo === 'colgado' || tipo === 'descanso') {
        // El de inicio tapa al corto que coincidiera con él (en un descanso de 3 s suenan solo el 2 y el 1).
        s.corto = `${fase}:${restante}`
        if (!silencio) {
          if (tipo === 'colgado') pitidos.colgado()
          else pitidos.descanso()
        }
        return
      }
    }
    if (restante !== null && restante >= 1 && restante <= 3 && s.corto !== `${fase}:${restante}`) {
      s.corto = `${fase}:${restante}`
      if (!silencio) pitidos.corto()
    }
  })

  const actuar = useCallback((f: (e: EstadoReloj, t: number) => EstadoReloj) => {
    const t = Date.now()
    setAhora(t)
    setEstado((e) => f(e, t))
  }, [])

  const arrancar = (desde: EstadoReloj): void => {
    pitidos.desbloquear()
    setEmpezado(true)
    setGuardado(null)
    const t = Date.now()
    setAhora(t)
    setEstado(empezar(desde, t))
  }

  // Cada botón vuelve a desbloquear el audio: en iOS ayuda a que siga sonando.
  const pulsar = (f: (e: EstadoReloj, t: number) => EstadoReloj): void => {
    pitidos.desbloquear()
    actuar(f)
  }

  const volverALaSesion = (): void => {
    pitidos.desbloquear()
    reinicios.current += 1
    setEstado((e) => reabrir(pasos, e))
  }

  const alRegistrar = useCallback(() => {
    registrado.current = true
    setHayRegistro(true)
    escribir(clave, null)
    router.push('/')
  }, [clave, router])

  if (!empezado) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">{NOMBRE_TIPO[plan.sesion.tipo]} · {plan.sesion.duracionMin} min</h1>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {plan.bloques.map((b, i) => <li key={`${b.nombre}-${i}`}>{b.nombre} · {b.minutos} min</li>)}
        </ol>
        {guardado ? (
          <div className="flex flex-wrap gap-3">
            <button type="button" className={BOTON} onClick={() => arrancar(guardado)}>Continuar donde ibas</button>
            <button type="button" className="underline" onClick={() => { escribir(clave, null); arrancar(ESTADO_INICIAL) }}>
              Empezar de nuevo
            </button>
          </div>
        ) : (
          <button type="button" className={BOTON} onClick={() => arrancar(ESTADO_INICIAL)}>Empezar</button>
        )}
      </div>
    )
  }

  if (estado.terminado || !paso) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Sesión terminada</h1>
        {estado.colgadoFalloS !== null && (
          <p className="rounded bg-sky-50 p-3 text-sm">
            Resistencia: {estado.colgadoFalloS} s. Apúntalo en Evaluación junto con el lastre de tu mejor intento.
          </p>
        )}
        <FormularioRegistro
          sesion={plan.sesion}
          iniciales={molestiasChequeo}
          minutosIniciales={minutosReales(estado, ahora)}
          alTerminar={alRegistrar}
        />
        {!hayRegistro && (
          <button type="button" className={BOTON_SECUNDARIO} onClick={volverALaSesion}>Volver a la sesión</button>
        )}
      </div>
    )
  }

  const siguientePaso = pasos[estado.indice + 1]
  const fondo = FONDO[fallo ? fallo.fase : paso.tipo]
  return (
    <div className="space-y-4">
      <section className={`space-y-2 rounded p-6 text-center ${fondo}`}>
        <p className="text-sm opacity-80">{paso.bloque} · paso {estado.indice + 1} de {pasos.length}</p>
        <p className="text-lg font-semibold">
          {paso.tipo === 'preparate' ? `Prepárate: ${paso.titulo}` : paso.titulo}
          {fallo ? ` · ${fallo.fase === 'colgado' ? 'COLGADO' : 'DESCANSO'}` : paso.tipo === 'colgado' ? ' · COLGADO' : ''}
        </p>
        {fallo ? (
          <>
            <p className="font-mono text-7xl font-bold tabular-nums">{mmss(fallo.colgadoS)}</p>
            <p className="text-sm opacity-80">colgado en total</p>
            <p className="text-xl">{fallo.fase === 'colgado' ? 'Cuelga' : 'Descansa'}: {fallo.restanteS} s</p>
          </>
        ) : (
          restante !== null && <p className="font-mono text-7xl font-bold tabular-nums">{mmss(restante)}</p>
        )}
        {'carga' in paso && paso.carga && <p>{paso.carga}</p>}
        {paso.tipo === 'manual' && paso.notas && <p className="text-sm">{paso.notas}</p>}
        {paso.tipo === 'bloque' && (
          <ul className="text-sm">{paso.detalle.map((d, i) => <li key={`${d}-${i}`}>{d}</li>)}</ul>
        )}
        {!estado.enMarcha && <p className="text-sm font-medium">En pausa</p>}
      </section>
      {siguientePaso && <p className="text-sm text-stone-500">Después: {siguientePaso.titulo}</p>}
      {sinPantalla && (
        <p className="text-xs text-amber-700">
          Tu navegador no puede mantener la pantalla encendida: sube el tiempo de bloqueo automático del iPhone (Ajustes ›
          Pantalla y brillo) mientras entrenas.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {paso.tipo === 'manual' && (
          <button type="button" className={BOTON} onClick={() => pulsar((e, t) => siguiente(pasos, e, t))}>Hecho</button>
        )}
        {paso.tipo === 'fallo' && (
          <button type="button" className={BOTON} onClick={() => pulsar((e, t) => noPuedoMas(pasos, e, t))}>No puedo más</button>
        )}
        {estado.enMarcha ? (
          <button type="button" className={BOTON_SECUNDARIO} onClick={() => actuar(pausar)}>Pausa</button>
        ) : (
          <button type="button" className={BOTON_SECUNDARIO} onClick={() => pulsar(empezar)}>Seguir</button>
        )}
        <button type="button" className={BOTON_SECUNDARIO} onClick={() => { reinicios.current += 1; pulsar(atras) }}>Atrás</button>
        {/* En un `fallo` ya está «No puedo más»; saltarlo perdería el resultado. Saltar el último paso termina la sesión. */}
        {paso.tipo !== 'fallo' && (
          <button
            type="button"
            className={BOTON_SECUNDARIO}
            onClick={() => {
              if (estado.indice < pasos.length - 1 || window.confirm('¿Terminar la sesión ahora?')) {
                pulsar((e, t) => siguiente(pasos, e, t))
              }
            }}
          >
            Saltar
          </button>
        )}
        <button
          type="button"
          className={BOTON_SECUNDARIO}
          onClick={() => { if (window.confirm('¿Terminar la sesión ahora?')) actuar(terminar) }}
        >
          Terminar
        </button>
        <button type="button" className="text-sm underline" onClick={() => setSilencio((v) => !v)}>
          {silencio ? 'Activar pitidos' : 'Silenciar'}
        </button>
      </div>
    </div>
  )
}
