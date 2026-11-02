import { fuerzaRelativa } from '@/motor'
import { FondoTopo } from '@/components/FondoTopo'
import { Constancia } from '@/components/progreso/Constancia'
import { cifra, fechaCorta, firmado, plural } from '@/components/progreso/formato'
import { GraficaFuerza } from '@/components/progreso/GraficaFuerza'
import { Logros } from '@/components/progreso/Logros'
import { Perfil } from '@/components/progreso/Perfil'
import { TuNivel } from '@/components/progreso/TuNivel'
import { TusTests } from '@/components/progreso/TusTests'
import { Aviso } from '@/components/ui/Aviso'
import { CifraGrande } from '@/components/ui/CifraGrande'
import { EstadoVacio } from '@/components/ui/EstadoVacio'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { testsCasaSinResultado, testsSinResultado } from '@/lib/datos/hoy'
import { evaluacionMotor } from '@/lib/datos/mapeo'
import { vistaPerfil } from '@/lib/datos/perfil-limitantes'
import { constancia, logros, resumenEscalada, UMBRAL_IGUAL } from '@/lib/datos/progreso'
import { vistaTests } from '@/lib/datos/tests'
import { DIAS_ATRAS_SUELTA } from '@/lib/escaladas/formulario'
import { vistaNivel } from '@/lib/escaladas/nivel'
import type { ResultadoTest } from '@/lib/datos/via'
import { vistaVia } from '@/lib/datos/via'
import { ahoraMadrid, fechaLarga, sumarDias } from '@/lib/fecha'
import { NOMBRE_FRENO } from '@/lib/nombres'
import { requerirDatos } from '@/lib/servidor/consultas'
import { BotonBorrarEscalada } from './BotonBorrarEscalada'
import { BotonBorrarEvaluacion } from './BotonBorrarEvaluacion'
import { BotonBorrarPruebaCasa } from './BotonBorrarPruebaCasa'
import { FormularioEscalada } from './FormularioEscalada'
import { FormularioEvaluacion } from './FormularioEvaluacion'
import { FormularioPruebaCasa } from './FormularioPruebaCasa'

const TITULO_SECCION = 'font-titular text-2xl font-bold uppercase leading-none'
const ESTILO_ESCALADA = { 'a-vista': 'a vista', flash: 'flash', encadenada: 'trabajada', pegues: 'pegues sin encadenar', abandonado: 'lo dejé' } as const

function Fuerza({ tests }: { tests: ResultadoTest[] }) {
  const ultimo = tests.at(-1)
  const anterior = tests.at(-2)
  const dif = ultimo && anterior ? ultimo.fuerzaRelativa - anterior.fuerzaRelativa : 0
  const desdeInicio = ultimo && tests[0] ? ultimo.fuerzaRelativa - tests[0].fuerzaRelativa : 0
  if (!ultimo) {
    // EstadoVacio ya es una tarjeta: sin otra alrededor.
    return (
      <section aria-label="Fuerza de dedos" className="space-y-2">
        <Etiqueta as="h2">Fuerza de dedos · % del peso</Etiqueta>
        <EstadoVacio titulo="Aún no hay tests" texto="El entrenador te propondrá el primero cuando toque." />
      </section>
    )
  }
  return (
    <Tarjeta aria-label="Fuerza de dedos">
      <Etiqueta as="h2">Fuerza de dedos · % del peso</Etiqueta>
      {!anterior ? (
        <>
          <CifraGrande valor={cifra(ultimo.fuerzaRelativa)} unidad="%" />
          <p className="text-sm text-texto-2">Tu primera marca · {fechaLarga(ultimo.fecha)}</p>
        </>
      ) : (
        <>
          <CifraGrande
            valor={cifra(ultimo.fuerzaRelativa)}
            unidad="%"
            delta={{
              texto: Math.abs(dif) < UMBRAL_IGUAL ? 'igual' : `${firmado(dif)} pts`,
              sentido: Math.abs(dif) < UMBRAL_IGUAL ? 'igual' : dif > 0 ? 'sube' : 'baja',
            }}
          />
          <p className="text-sm text-texto-2">
            Test del {fechaCorta(ultimo.fecha)} frente al del {fechaCorta(anterior.fecha)}.
            {tests.length > 2 && <span className="block">{`Desde el primero (${fechaCorta(tests[0]!.fecha)}): ${firmado(desdeInicio)} puntos.`}</span>}
            {dif <= -UMBRAL_IGUAL && <span className="block">Un test peor no borra lo entrenado: la descarga, el sueño o la fatiga del día pesan. Mira la tendencia.</span>}
          </p>
          <GraficaFuerza tests={tests} />
        </>
      )}
    </Tarjeta>
  )
}

export default async function PaginaProgreso() {
  const { datos } = await requerirDatos()
  const hoy = ahoraMadrid(new Date()).fecha
  const sinResultado = testsSinResultado(datos, hoy)
  const fechaInicial = sinResultado.at(-1) ?? hoy
  const tests = vistaVia(datos, hoy).tests.filter((t) => t.fecha <= hoy)
  const escalada = resumenEscalada(datos, hoy)
  const nivel = vistaNivel(datos.escaladas ?? [], datos.perfil, hoy)
  const ultimasEscaladas = [...(datos.escaladas ?? [])].filter((e) => e.fecha <= hoy).reverse().slice(0, 10)
  const perfil = vistaPerfil(datos, hoy)
  const casaSinResultado = testsCasaSinResultado(datos, hoy)
  // Historial: tests de dedos y tests en casa juntos, del más reciente al más antiguo.
  const historial = [
    ...datos.evaluaciones.map((e) => ({ tipo: 'dedos' as const, fecha: e.fecha, e })),
    ...(datos.pruebasCasa ?? []).map((c) => ({ tipo: 'casa' as const, fecha: c.fecha, c })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha))
  return (
    <div className="space-y-5">
      <header className="relative -mx-4 overflow-hidden px-4 pb-1 pt-2">
        <FondoTopo />
        <div className="relative">
          <Etiqueta as="p">{fechaLarga(hoy)}</Etiqueta>
          <h1 className="font-titular text-4xl font-extrabold uppercase leading-none">
            Tu <span className="text-progreso">progreso</span>
          </h1>
        </div>
      </header>

      {sinResultado.map((f) => (
        <Aviso key={f} tono="info">
          Te falta apuntar el resultado del test del {fechaLarga(f)}. <a href="#apuntar-test" className="text-progreso underline">Apuntarlo abajo</a>
        </Aviso>
      ))}

      {casaSinResultado.map((f) => (
        <Aviso key={`casa-${f}`} tono="info">
          Te falta apuntar el resultado del test en casa del {fechaLarga(f)}. <a href="#apuntar-test-casa" className="text-progreso underline">Apuntarlo abajo</a>
        </Aviso>
      ))}

      <Fuerza tests={tests} />

      {perfil && <Perfil v={perfil} />}

      <TusTests v={vistaTests(datos, hoy)} />

      <TuNivel v={nivel} encadenes={escalada.encadenes} ultimoFreno={escalada.ultimoFreno} />

      <details id="apuntar-escalada" className="group scroll-mt-4 rounded-2xl border border-borde bg-superficie">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 text-texto-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-progreso [&::-webkit-details-marker]:hidden">
          + Apuntar escalada
          <span aria-hidden className="text-xl text-texto-2 transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="space-y-3 p-4 pt-1">
          <p className="text-sm text-texto-2">Un encadene o un día de pegues a un proyecto que no apuntaste al registrar una sesión.</p>
          <FormularioEscalada hoy={hoy} desde={sumarDias(hoy, -DIAS_ATRAS_SUELTA)} proyectos={nivel.abiertos.map((p) => p.nombre)}
            referencia={{ via: nivel.objetivo.escalones !== null ? nivel.objetivo.actual : '6b', bloque: nivel.bloque ?? '6A' }} />
        </div>
      </details>

      {ultimasEscaladas.length > 0 && (
        <section className="space-y-2">
          <h2 className={TITULO_SECCION}>Últimas escaladas</h2>
          <ul className="space-y-2">
            {ultimasEscaladas.map((e) => {
              const texto = `${e.nombre ? `${e.nombre} · ` : ''}${e.tipo === 'via' ? 'vía' : 'bloque'}${e.grado ? ` ${e.grado}` : ''}`
              return (
                <li key={e.id} className="flex items-start justify-between gap-3 rounded-2xl border border-borde bg-superficie p-3 text-sm">
                  <div>
                    <p className="font-medium">{texto}</p>
                    <p className="text-texto-2">
                      {fechaLarga(e.fecha)} · {e.lugar === 'roca' ? 'roca' : 'rocódromo'} · {ESTILO_ESCALADA[e.estilo]}{e.estilo !== 'abandonado' && (e.pegues > 1 || e.estilo === 'pegues') ? ` · ${plural(e.pegues, 'pegue', 'pegues')}` : ''}
                    </p>
                  </div>
                  <BotonBorrarEscalada id={e.id} texto={texto} />
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <Constancia c={constancia(datos, hoy)} />

      <Logros lista={logros(datos, hoy)} />

      {sinResultado.length > 0 ? (
        <section id="apuntar-test" className="scroll-mt-4 space-y-3">
          <h2 className={TITULO_SECCION}>Apuntar un resultado de test</h2>
          <Tarjeta aria-label="Nuevo resultado">
            <Etiqueta as="h3">Nuevo resultado</Etiqueta>
            <FormularioEvaluacion hoy={hoy} fechaInicial={fechaInicial} peso={datos.perfil.peso_kg} />
          </Tarjeta>
        </section>
      ) : (
        <details id="apuntar-test" className="group scroll-mt-4 rounded-2xl border border-borde bg-superficie">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 text-texto-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-progreso [&::-webkit-details-marker]:hidden">
            ¿Hiciste un test por tu cuenta?
            <span aria-hidden className="text-xl text-texto-2 transition-transform group-open:rotate-90">›</span>
          </summary>
          <div className="space-y-3 p-4 pt-1">
            <p className="text-sm text-texto-2">El entrenador te propone el test cuando toca. Si lo hiciste por tu cuenta, apunta aquí el resultado.</p>
            <FormularioEvaluacion hoy={hoy} fechaInicial={fechaInicial} peso={datos.perfil.peso_kg} />
          </div>
        </details>
      )}

      <details id="apuntar-test-casa" open={casaSinResultado.length > 0} className="group scroll-mt-4 rounded-2xl border border-borde bg-superficie">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 text-texto-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-progreso [&::-webkit-details-marker]:hidden">
          ¿Hiciste el test en casa por tu cuenta?
          <span aria-hidden className="text-xl text-texto-2 transition-transform group-open:rotate-90">›</span>
        </summary>
        <div className="space-y-3 p-4 pt-1">
          <p className="text-sm text-texto-2">Dominadas máximas y apertura de cadera. El entrenador te lo propone en casa en los días siguientes al test de dedos.</p>
          <FormularioPruebaCasa hoy={hoy} fechaInicial={casaSinResultado.at(-1) ?? hoy} />
        </div>
      </details>

      <section className="space-y-2">
        <h2 className={TITULO_SECCION}>Historial</h2>
        {historial.length === 0 && <p className="text-sm text-texto-2">Todavía no hay tests. El entrenador te propondrá el primero.</p>}
        <ul className="space-y-2">
          {historial.map((h) => h.tipo === 'dedos' ? (
            <li key={h.e.id} className="flex items-start justify-between gap-3 rounded-2xl border border-borde bg-superficie p-3 text-sm">
              <div>
                <p className="font-medium">{fechaLarga(h.e.fecha)}</p>
                <p className="text-texto-2">
                  Lastre {h.e.lastre_kg} kg con {h.e.peso_corporal_kg} kg · <span className="text-texto">{fuerzaRelativa(evaluacionMotor(h.e)).toFixed(1)} % del peso</span>
                  {h.e.colgado_30_s != null ? ` · colgado ${h.e.colgado_30_s} s${h.e.colgado_con_descarga ? ' con descarga' : ''}` : ''}
                  {h.e.power_slap_cm != null ? ` · power slap ${h.e.power_slap_cm} cm` : ''}
                  {h.e.resistencia_s !== null ? ` · 7:3 ${h.e.resistencia_s} s` : ''}
                  {h.e.tecnica !== null ? ` · técnica ${h.e.tecnica}` : ''}
                </p>
              </div>
              <BotonBorrarEvaluacion id={h.e.id} fecha={h.e.fecha} />
            </li>
          ) : (
            <li key={h.c.id} className="flex items-start justify-between gap-3 rounded-2xl border border-borde bg-superficie p-3 text-sm">
              <div>
                <p className="font-medium">{fechaLarga(h.c.fecha)} · test en casa</p>
                <p className="text-texto-2">
                  {[h.c.dominadas !== null ? `${h.c.dominadas} dominadas` : null, h.c.cadera_cm !== null ? `cadera ${h.c.cadera_cm} cm` : null].filter(Boolean).join(' · ')}
                </p>
              </div>
              <BotonBorrarPruebaCasa id={h.c.id} fecha={h.c.fecha} />
            </li>
          ))}
        </ul>
      </section>

    </div>
  )
}
