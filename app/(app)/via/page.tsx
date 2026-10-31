import { FRACCION_INICIAL_REPEATERS, VALORES } from '@/motor'
import { FondoTopo } from '@/components/FondoTopo'
import { PorQue } from '@/components/PorQue'
import { Aviso } from '@/components/ui/Aviso'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { IrAlActual } from '@/components/via/IrAlActual'
import { Via } from '@/components/via/Via'
import { textoLastre } from '@/lib/cronometro/test'
import { pasosArranque } from '@/lib/datos/arranque'
import { cambiosPorResultados, type CambiosResultados } from '@/lib/datos/plan'
import { vistaVia } from '@/lib/datos/via'
import { ahoraMadrid, fechaLarga } from '@/lib/fecha'
import { NOMBRE_LIMITANTE, NOMBRE_ZONA } from '@/lib/nombres'
import { requerirDatos } from '@/lib/servidor/consultas'

const CORTA = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const corta = (fecha: string): string => CORTA.format(new Date(`${fecha}T12:00:00Z`))
const numerica = (fecha: string): string => fecha.split('-').reverse().join('/')
const SEMAFORO = { verde: 'verde', ambar: 'ámbar', rojo: 'rojo' } as const
const MOTIVO_DESCARGA = { rpe: 'sesiones más duras de lo previsto', bienestar: 'cómo llegabas en los chequeos' } as const

function Cambios({ c }: { c: CambiosResultados }) {
  return (
    <section className="space-y-3">
      <h2 className="font-titular text-2xl font-bold uppercase">Qué ha cambiado por tus resultados</h2>
      {c.aviso ? (
        <Aviso tono="ambar">{c.aviso}</Aviso>
      ) : (
        <Tarjeta>
          <dl className="space-y-3 text-sm">
            <div>
              <dt><Etiqueta>Último test</Etiqueta></dt>
              <dd>
                {c.ultimoTest
                  ? `${fechaLarga(c.ultimoTest.fecha)} · ${textoLastre(c.ultimoTest.lastreKg)} · ${Math.round(c.ultimoTest.fuerzaRelativa)} % de tu peso${
                      c.ultimoTest.vigente ? '' : '. Tiene más de 10 semanas: toca repetirlo antes de volver a la multipresa.'
                    }`
                  : 'sin test todavía.'}
              </dd>
            </div>
            {c.repeaters && (
              <div>
                <dt><Etiqueta>Carga de los repeaters</Etiqueta></dt>
                <dd>
                  al empezar, el {Math.round(FRACCION_INICIAL_REPEATERS * 100)} % del test ({textoLastre(c.repeaters.lastreInicial)}); con sesiones válidas sube como mucho al {Math.round(VALORES['P-06'].fraccionMaximaRepeaters * 100)} %
                  ({textoLastre(c.repeaters.lastreMaximo)}). La carga exacta sale en cada sesión de multipresa.
                </dd>
              </div>
            )}
            <div>
              <dt><Etiqueta>Freno por esfuerzo</Etiqueta></dt>
              <dd>
                {c.sinSubida
                  ? 'activo. Tu última sesión fue más dura de lo previsto o tienes una zona en ámbar: la carga no sube por ahora.'
                  : 'no. La carga puede subir cuando toque.'}
              </dd>
            </div>
            <div>
              <dt><Etiqueta>Zonas</Etiqueta></dt>
              <dd>{c.zonas.length > 0 ? c.zonas.map((z) => `${NOMBRE_ZONA[z.zona]} en ${SEMAFORO[z.semaforo]}`).join(', ') + '.' : 'todas en verde.'}</dd>
            </div>
            <div>
              <dt><Etiqueta>Descargas adelantadas</Etiqueta></dt>
              <dd>
                {c.descargasAdelantadas.length > 0
                  ? c.descargasAdelantadas.map((x) => `del ${corta(x.desde)} al ${corta(x.hasta)} por ${MOTIVO_DESCARGA[x.motivo]}`).join('; ') + '.'
                  : 'ninguna.'}
              </dd>
            </div>
            {c.ciclo2 && (
              <div>
                <dt><Etiqueta>Ciclo 2</Etiqueta></dt>
                <dd className="space-y-1">
                  <p>
                    {c.ciclo2.tipo === 'pendiente'
                      ? `se decide el ${numerica(c.ciclo2.fecha)} con tus tests y caídas: hoy apuntaría a ${NOMBRE_LIMITANTE[c.ciclo2.limitante]}.`
                      : `${c.ciclo2.fuerza} semanas de fuerza y ${c.ciclo2.resistencia} de resistencia${c.ciclo2.refuerzoTecnica ? ', con un cupo más de técnica por semana' : ''}.`}
                  </p>
                  <PorQue explicaciones={[c.ciclo2.explicacion]} />
                </dd>
              </div>
            )}
          </dl>
        </Tarjeta>
      )}
    </section>
  )
}

export default async function PaginaVia() {
  const { datos } = await requerirDatos()
  const hoy = ahoraMadrid(new Date()).fecha
  const vista = vistaVia(datos, hoy)
  const cambios = cambiosPorResultados(datos, hoy)
  return (
    <div className="space-y-6">
      <header className="relative -mx-4 overflow-hidden px-4 pb-1 pt-2">
        <FondoTopo />
        <div className="relative">
          <Etiqueta as="p">Temporada · objetivo {fechaLarga(vista.cima.lunes)}</Etiqueta>
          <h1 className="font-titular text-4xl font-extrabold uppercase leading-none">
            Tu <span className="text-progreso">vía</span>
          </h1>
        </div>
      </header>
      {vista.aviso && <Aviso tono="ambar">{vista.aviso}</Aviso>}
      <Via vista={vista} inicio={datos.perfil.inicio_temporada} arranque={pasosArranque(datos)} />
      <IrAlActual />
      <Cambios c={cambios} />
    </div>
  )
}
