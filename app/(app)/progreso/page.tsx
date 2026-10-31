import { fuerzaRelativa } from '@/motor'
import { FondoTopo } from '@/components/FondoTopo'
import { Constancia } from '@/components/progreso/Constancia'
import { cifra, fechaCorta, firmado, plural } from '@/components/progreso/formato'
import { GraficaFuerza } from '@/components/progreso/GraficaFuerza'
import { Logros } from '@/components/progreso/Logros'
import { Aviso } from '@/components/ui/Aviso'
import { CifraGrande } from '@/components/ui/CifraGrande'
import { EstadoVacio } from '@/components/ui/EstadoVacio'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { testsSinResultado } from '@/lib/datos/hoy'
import { evaluacionMotor } from '@/lib/datos/mapeo'
import { constancia, logros, resumenEscalada, UMBRAL_IGUAL } from '@/lib/datos/progreso'
import type { ResultadoTest } from '@/lib/datos/via'
import { vistaVia } from '@/lib/datos/via'
import { ahoraMadrid, fechaLarga } from '@/lib/fecha'
import { NOMBRE_MOTIVO } from '@/lib/nombres'
import { requerirDatos } from '@/lib/servidor/consultas'
import { BotonBorrarEvaluacion } from './BotonBorrarEvaluacion'
import { FormularioEvaluacion } from './FormularioEvaluacion'

const TITULO_SECCION = 'font-titular text-2xl font-bold uppercase leading-none'

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
  const lista = [...datos.evaluaciones].reverse()
  const sinResultado = testsSinResultado(datos, hoy)
  const fechaInicial = sinResultado.at(-1) ?? hoy
  const tests = vistaVia(datos, hoy).tests.filter((t) => t.fecha <= hoy)
  const escalada = resumenEscalada(datos, hoy)
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

      <Fuerza tests={tests} />

      <Tarjeta aria-label="Grado">
        <Etiqueta as="h2">Grado</Etiqueta>
        <p className="flex items-baseline gap-3 font-titular text-4xl font-extrabold uppercase leading-none">
          <span className="text-texto">{escalada.gradoActual}</span>
          <span aria-hidden="true" className="text-2xl text-texto-2">→</span>
          <span className="sr-only">hacia</span>
          <span className="text-cima">{escalada.gradoObjetivo}</span>
        </p>
        <p className="text-sm text-texto-2">
          <span className="font-medium text-texto">{plural(escalada.encadenes, 'encadene', 'encadenes')}</span> al límite
          {escalada.ultimaCaida && <><br />Última caída: {NOMBRE_MOTIVO[escalada.ultimaCaida]}</>}
        </p>
      </Tarjeta>

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
        <details id="apuntar-test" className="scroll-mt-4 rounded-2xl border border-borde bg-superficie">
          <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-texto-2 [&::-webkit-details-marker]:hidden">
            ¿Hiciste un test por tu cuenta?
          </summary>
          <div className="space-y-3 p-4 pt-1">
            <p className="text-sm text-texto-2">El entrenador te propone el test cuando toca. Si lo hiciste por tu cuenta, apunta aquí el resultado.</p>
            <FormularioEvaluacion hoy={hoy} fechaInicial={fechaInicial} peso={datos.perfil.peso_kg} />
          </div>
        </details>
      )}

      <section className="space-y-2">
        <h2 className={TITULO_SECCION}>Historial</h2>
        {lista.length === 0 && <p className="text-sm text-texto-2">Todavía no hay tests. El entrenador te propondrá el primero.</p>}
        <ul className="space-y-2">
          {lista.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 rounded-2xl border border-borde bg-superficie p-3 text-sm">
              <div>
                <p className="font-medium">{fechaLarga(e.fecha)}</p>
                <p className="text-texto-2">
                  Lastre {e.lastre_kg} kg con {e.peso_corporal_kg} kg · <span className="text-texto">{fuerzaRelativa(evaluacionMotor(e)).toFixed(1)} % del peso</span>
                  {e.resistencia_s !== null ? ` · resistencia ${e.resistencia_s} s` : ''}
                  {e.tecnica !== null ? ` · técnica ${e.tecnica}` : ''}
                </p>
              </div>
              <BotonBorrarEvaluacion id={e.id} fecha={e.fecha} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
