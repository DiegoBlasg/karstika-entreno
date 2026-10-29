'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Molestia, SesionPlan } from '@/motor'
import { ContextoTemporada } from '@/components/ContextoTemporada'
import { BOTON, CAMPO } from '@/components/estilos'
import type { Paso } from '@/lib/cronometro/pasos'
import { crearPitidos } from '@/lib/cronometro/pitidos'
import { intentoAbierto, lastre73, leerDatosTest, mejorLastre, textoLastre, type DatosTest, type Intento } from '@/lib/cronometro/test'
import {
  atras, empezar, ESTADO_INICIAL, faseFallo, leerGuardado, minutosReales, noPuedoMas, pausar, reabrir, restanteS, siguiente,
  terminar, tick, transcurridoMs, type EstadoReloj,
} from '@/lib/cronometro/reloj'
import type { PosicionTemporada } from '@/lib/datos/temporada'
import { DONDE_SE_HACE, NOMBRE_TIPO } from '@/lib/nombres'
import { FormularioRegistro } from '../../_hoy/FormularioRegistro'
import { FormularioIntento } from './FormularioIntento'
import { FormularioResultadoTest } from './FormularioResultadoTest'

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

// Lo apuntado en el test de dedos, aparte del reloj.
function leerTest(clave: string, nIntentos: number): DatosTest | null {
  try {
    const v = localStorage.getItem(clave)
    return v ? leerDatosTest(JSON.parse(v), nIntentos) : null
  } catch {
    return null
  }
}
function escribirTest(clave: string, t: DatosTest | null): void {
  try {
    if (t) localStorage.setItem(clave, JSON.stringify(t))
    else localStorage.removeItem(clave)
  } catch {
    // Igual que el reloj: sin almacenamiento solo se pierde lo apuntado al recargar.
  }
}

const PESO = { min: 30, max: 200 } as const // los mismos rangos que guardarEvaluacion

const pesoValido = (texto: string): number | null => {
  const v = Number(texto.replace(',', '.'))
  return texto.trim() !== '' && Number.isFinite(v) && v >= PESO.min && v <= PESO.max ? v : null
}

export function Cronometro({ plan, pasos, molestiasChequeo, hoy, pesoInicial, evaluacionHoy, posicion }: {
  plan: SesionPlan; pasos: Paso[]; molestiasChequeo: Molestia[]; hoy: string; pesoInicial: number; evaluacionHoy: boolean
  posicion: PosicionTemporada | null
}) {
  const router = useRouter()
  const clave = `cronometro:${plan.sesion.id}`
  // Test de dedos guiado: peso, intentos y carga del 7:3. Las demás sesiones no usan nada de esto.
  const esTest = plan.sesion.tipo === 'evaluacion-dedos'
  const claveTest = `${clave}:test`
  const nIntentos = useMemo(() => pasos.filter((p) => p.tipo === 'colgado' && p.intento).length, [pasos])
  const [test, setTest] = useState<DatosTest>({ pesoKg: pesoInicial, intentos: [] })
  // El campo del peso es texto: así se puede borrar y escribir con coma; `test.pesoKg` solo cambia con un peso válido.
  const [pesoTexto, setPesoTexto] = useState(() => String(pesoInicial).replace('.', ','))
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
  // El resultado del test guardado desde aquí: 'en pantalla' mientras su formulario sigue montado (con el texto de
  // guardado), 'antes' si después se ha vuelto a la sesión. Así no se ofrece guardar otra evaluación el mismo día.
  const [resultadoTest, setResultadoTest] = useState<'no' | 'en pantalla' | 'antes'>('no')
  const alGuardarResultado = useCallback(() => setResultadoTest('en pantalla'), [])
  // Si había evaluación de hoy al abrir la pantalla. No se usa el valor vivo: al guardar el resultado aquí, la página se
  // vuelve a pintar en el servidor con `evaluacionHoy` ya a true en el mismo paso que la respuesta, y el formulario
  // desaparecería antes de enseñar «Evaluación guardada.».
  const [evaluacionAlEntrar] = useState(evaluacionHoy)

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

  useEffect(() => {
    if (!esTest) return
    const t = leerTest(claveTest, nIntentos)
    if (t) {
      setTest(t)
      setPesoTexto(String(t.pesoKg).replace('.', ','))
    }
  }, [esTest, claveTest, nIntentos])

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

  useEffect(() => {
    if (esTest && empezado && !registrado.current) escribirTest(claveTest, test)
  }, [esTest, claveTest, empezado, test])

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
    setResultadoTest((r) => (r === 'en pantalla' ? 'antes' : r))
    setEstado((e) => reabrir(pasos, e))
  }

  const alRegistrar = useCallback(() => {
    registrado.current = true
    setHayRegistro(true)
    escribir(clave, null)
    escribirTest(claveTest, null)
    router.push('/')
  }, [clave, claveTest, router])

  const apuntarIntento = (n: number, i: Intento): void => {
    setTest((t) => {
      // Sin huecos: los intentos anteriores sin apuntar quedan en null.
      const intentos = Array.from({ length: Math.max(t.intentos.length, n) }, (_, k) => t.intentos[k] ?? null)
      intentos[n - 1] = i
      return { ...t, intentos }
    })
  }

  if (!empezado) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">{NOMBRE_TIPO[plan.sesion.tipo]} · {plan.sesion.duracionMin} min</h1>
        <p className="text-sm text-stone-600">Dónde: {DONDE_SE_HACE[plan.sesion.tipo]}</p>
        {posicion && <ContextoTemporada posicion={posicion} />}
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {plan.bloques.map((b, i) => <li key={`${b.nombre}-${i}`}>{b.nombre} · {b.minutos} min</li>)}
        </ol>
        {esTest && (
          <label className="block">
            Peso hoy (kg)
            <input
              type="text" inputMode="decimal" value={pesoTexto}
              onChange={(e) => {
                const texto = e.target.value
                setPesoTexto(texto)
                const v = pesoValido(texto)
                if (v !== null) setTest((t) => ({ ...t, pesoKg: v }))
              }}
              className={CAMPO}
            />
            {pesoValido(pesoTexto) === null && (
              <span className="mt-1 block text-sm text-red-700">El peso tiene que estar entre 30 y 200 kg.</span>
            )}
          </label>
        )}
        {guardado ? (
          <div className="flex flex-wrap gap-3">
            <button type="button" className={BOTON} onClick={() => arrancar(guardado)}>Continuar donde ibas</button>
            <button
              type="button"
              className="underline"
              onClick={() => {
                escribir(clave, null)
                // Empezar de nuevo también borra los intentos apuntados; el peso se queda.
                escribirTest(claveTest, null)
                setTest((t) => ({ ...t, intentos: [] }))
                arrancar(ESTADO_INICIAL)
              }}
            >
              Empezar de nuevo
            </button>
          </div>
        ) : (
          <button type="button" className={BOTON} onClick={() => arrancar(ESTADO_INICIAL)}>Empezar</button>
        )}
      </div>
    )
  }

  const mejor = esTest ? mejorLastre(test.intentos) : null

  if (estado.terminado || !paso) {
    // Ya hay evaluación de hoy (de antes, o guardada aquí y luego se volvió a la sesión): no se ofrece otra.
    const yaEvaluado = (evaluacionAlEntrar || resultadoTest === 'antes') && resultadoTest !== 'en pantalla'
    // Sin 7:3 la sesión acaba en el colgado del último intento: se apunta aquí.
    const ultimo = esTest && !yaEvaluado && resultadoTest === 'no' ? intentoAbierto(pasos, pasos.length) : null
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Sesión terminada</h1>
        {ultimo && (
          <FormularioIntento
            key={ultimo.n}
            n={ultimo.n}
            de={ultimo.de}
            valor={test.intentos[ultimo.n - 1] ?? null}
            alCambiar={(i) => apuntarIntento(ultimo.n, i)}
          />
        )}
        {esTest ? (
          yaEvaluado ? (
            <p className="rounded bg-sky-50 p-3 text-sm">
              Ya tienes la evaluación de hoy guardada. Si quieres cambiarla, hazlo en <Link href="/evaluacion" className="underline">Evaluación</Link>.
            </p>
          ) : mejor !== null ? (
            <FormularioResultadoTest
              // Con otro mejor intento o peso, el formulario se monta de nuevo con esos valores por defecto.
              key={`${mejor}:${test.pesoKg}`}
              alGuardar={alGuardarResultado}
              hoy={hoy}
              pesoKg={test.pesoKg}
              lastreKg={mejor}
              resistenciaS={estado.colgadoFalloS !== null && estado.colgadoFalloS >= 1 ? estado.colgadoFalloS : null}
            />
          ) : (
            <p className="rounded bg-amber-50 p-3 text-sm">Sin un intento completado no hay resultado: apúntalo en Evaluación si quieres.</p>
          )
        ) : estado.colgadoFalloS !== null && (
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
  const abierto = esTest ? intentoAbierto(pasos, estado.indice) : null
  // La carga del 7:3 sale del mejor intento de hoy, en el propio 7:3 y en su «Prepárate».
  const es73 = paso.tipo === 'fallo' || (paso.tipo === 'preparate' && siguientePaso?.tipo === 'fallo')
  const l73 = esTest && es73 && mejor !== null ? lastre73(hoy, test.pesoKg, mejor) : null
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
        {l73 !== null ? <p>Lastre para el 7:3: {textoLastre(l73)}</p> : 'carga' in paso && paso.carga && <p>{paso.carga}</p>}
        {paso.tipo === 'manual' && paso.notas && <p className="text-sm">{paso.notas}</p>}
        {paso.tipo === 'bloque' && (
          <ul className="text-sm">{paso.detalle.map((d, i) => <li key={`${d}-${i}`}>{d}</li>)}</ul>
        )}
        {!estado.enMarcha && <p className="text-sm font-medium">En pausa</p>}
      </section>
      {abierto && (
        <FormularioIntento
          key={abierto.n}
          n={abierto.n}
          de={abierto.de}
          valor={test.intentos[abierto.n - 1] ?? null}
          alCambiar={(i) => apuntarIntento(abierto.n, i)}
        />
      )}
      {mejor !== null && <p className="text-sm">Mejor hasta ahora: {textoLastre(mejor)}</p>}
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
