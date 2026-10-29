import Link from 'next/link'
import { FRACCION_INICIAL_REPEATERS, VALORES } from '@/motor'
import { TARJETA } from '@/components/estilos'
import { PorQue } from '@/components/PorQue'
import { textoLastre } from '@/lib/cronometro/test'
import { enlacePreparar } from '@/lib/datos/huecos'
import { cambiosPorResultados, proximosDias, vistaAno, type CambiosResultados, type HuecoPlan, type SemanaPlanVista } from '@/lib/datos/plan'
import { ahoraMadrid, fechaLarga, hhmmDeMinutos, sumarDias } from '@/lib/fecha'
import { DONDE_SE_HACE, NOMBRE_COMPANIA, NOMBRE_LIMITANTE, NOMBRE_LUGAR, NOMBRE_ZONA, nombreSesion } from '@/lib/nombres'
import { requerirDatos } from '@/lib/servidor/consultas'

const CORTA = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const corta = (fecha: string): string => CORTA.format(new Date(`${fecha}T12:00:00Z`))
const numerica = (fecha: string): string => fecha.split('-').reverse().join('/')
const SEMAFORO = { verde: 'verde', ambar: 'ámbar', rojo: 'rojo' } as const
const MOTIVO_DESCARGA = { rpe: 'sesiones más duras de lo previsto', bienestar: 'cómo llegabas en los chequeos' } as const

function FilaHueco({ h }: { h: HuecoPlan }) {
  const { hueco, estado, sesion } = h
  return (
    <li className={TARJETA}>
      <p className="text-sm">
        {fechaLarga(hueco.fecha)} · {hhmmDeMinutos(hueco.inicio_min)} · {NOMBRE_LUGAR[hueco.lugar]} · {NOMBRE_COMPANIA[hueco.compania]} · {hueco.minutos} min
      </p>
      {estado === 'planeada' && sesion && (
        <>
          <p className="font-medium">{nombreSesion(sesion)}{h.cargaAlta ? ' ★' : ''}</p>
          <p className="text-sm text-stone-600">Dónde: {DONDE_SE_HACE[sesion.tipo]}</p>
        </>
      )}
      {estado === 'aceptada' && sesion && (
        <>
          <p className="font-medium">{nombreSesion(sesion)} · {h.registrada ? 'Registrada' : 'Aceptada'}</p>
          <p className="text-sm text-stone-600">Dónde: {DONDE_SE_HACE[sesion.tipo]}</p>
        </>
      )}
      {estado === 'libre' && <p className="text-stone-600">Libre: no hace falta entrenar.</p>}
      {estado === 'sin-plan' && <p className="text-stone-600">Sin plan: prepáralo cuando llegue.</p>}
      {(estado === 'planeada' || estado === 'libre' || estado === 'sin-plan') && (
        <Link href={enlacePreparar(hueco)} className="inline-block rounded bg-stone-900 px-3 py-1 text-sm font-medium text-white">Preparar</Link>
      )}
    </li>
  )
}

function Semana({ s, titulo }: { s: SemanaPlanVista; titulo: string }) {
  const pendientes = s.huecos.filter((h) => h.estado !== 'pasado')
  return (
    <section className="space-y-3">
      <h3 className="font-medium">{titulo} · {corta(s.lunes)} – {corta(sumarDias(s.lunes, 6))}</h3>
      {s.orientativo && (
        <p className="rounded bg-sky-50 p-3 text-sm">
          Orientativo, con tu semana habitual: declara tus huecos en <Link href="/semana" className="underline">Mi semana</Link>.
        </p>
      )}
      {s.aviso && <p className="rounded bg-amber-50 p-3 text-sm">{s.aviso}</p>}
      {pendientes.length > 0 && <ul className="space-y-3">{pendientes.map((h) => <FilaHueco key={h.hueco.id} h={h} />)}</ul>}
    </section>
  )
}

function Cambios({ c }: { c: CambiosResultados }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Qué ha cambiado por tus resultados</h2>
      {c.aviso ? (
        <p className="rounded bg-amber-50 p-3 text-sm">{c.aviso}</p>
      ) : (
        <ul className={`${TARJETA} text-sm`}>
          <li>
            <span className="font-medium">Último test: </span>
            {c.ultimoTest
              ? `${fechaLarga(c.ultimoTest.fecha)} · ${textoLastre(c.ultimoTest.lastreKg)} · ${Math.round(c.ultimoTest.fuerzaRelativa)} % de tu peso${
                  c.ultimoTest.vigente ? '' : '. Tiene más de 10 semanas: toca repetirlo antes de volver a la multipresa.'
                }`
              : 'sin test todavía.'}
          </li>
          {c.repeaters && (
            <li>
              <span className="font-medium">Carga de los repeaters: </span>
              al empezar, el {Math.round(FRACCION_INICIAL_REPEATERS * 100)} % del test ({textoLastre(c.repeaters.lastreInicial)}); con sesiones válidas sube como mucho al {Math.round(VALORES['P-06'].fraccionMaximaRepeaters * 100)} %
              ({textoLastre(c.repeaters.lastreMaximo)}). La carga exacta sale en cada sesión de multipresa.
            </li>
          )}
          <li>
            <span className="font-medium">Freno por esfuerzo: </span>
            {c.sinSubida
              ? 'activo. Tu última sesión fue más dura de lo previsto o tienes una zona en ámbar: la carga no sube por ahora.'
              : 'no. La carga puede subir cuando toque.'}
          </li>
          <li>
            <span className="font-medium">Zonas: </span>
            {c.zonas.length > 0 ? c.zonas.map((z) => `${NOMBRE_ZONA[z.zona]} en ${SEMAFORO[z.semaforo]}`).join(', ') + '.' : 'todas en verde.'}
          </li>
          <li>
            <span className="font-medium">Descargas adelantadas: </span>
            {c.descargasAdelantadas.length > 0
              ? c.descargasAdelantadas.map((x) => `del ${corta(x.desde)} al ${corta(x.hasta)} por ${MOTIVO_DESCARGA[x.motivo]}`).join('; ') + '.'
              : 'ninguna.'}
          </li>
          {c.ciclo2 && (
            <li className="space-y-1">
              <p>
                <span className="font-medium">Ciclo 2: </span>
                {c.ciclo2.tipo === 'pendiente'
                  ? `se decide el ${numerica(c.ciclo2.fecha)} con tus tests y caídas: hoy apuntaría a ${NOMBRE_LIMITANTE[c.ciclo2.limitante]}.`
                  : `${c.ciclo2.fuerza} semanas de fuerza y ${c.ciclo2.resistencia} de resistencia${c.ciclo2.refuerzoTecnica ? ', con un cupo más de técnica por semana' : ''}.`}
              </p>
              <PorQue explicaciones={[c.ciclo2.explicacion]} />
            </li>
          )}
        </ul>
      )}
    </section>
  )
}

export default async function PaginaPlan() {
  const { datos } = await requerirDatos()
  const ahora = ahoraMadrid(new Date())
  const hoy = ahora.fecha
  const { semanas } = proximosDias(datos, { fecha: hoy, minutos: Math.round(ahora.hora * 60) })
  const ano = vistaAno(datos, hoy)
  const cambios = cambiosPorResultados(datos, hoy)
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Plan</h1>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Próximos días</h2>
        {semanas[0] && <Semana s={semanas[0]} titulo="Esta semana" />}
        {semanas[1] && <Semana s={semanas[1]} titulo="Semana siguiente" />}
        {semanas.some((s) => s.huecos.some((h) => h.estado === 'planeada' && h.cargaAlta)) && <p className="text-xs text-stone-500">★ = carga alta.</p>}
      </section>
      <Cambios c={cambios} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">El año</h2>
        {ano.aviso && <p className="rounded bg-amber-50 p-3 text-sm">{ano.aviso}</p>}
        <ol className="divide-y divide-stone-100 rounded border border-stone-200 bg-white text-sm">
          {ano.semanas.map((s) => (
            <li
              key={s.lunes}
              aria-current={s.actual ? 'date' : undefined}
              className={`flex flex-wrap gap-x-2 px-3 py-1.5 ${s.actual ? 'bg-amber-100 font-medium' : ''}`}
            >
              <span className="w-14 shrink-0 tabular-nums">{corta(s.lunes)}</span>
              <span className="text-stone-500">C{s.ciclo}</span>
              <span>{s.fase}</span>
              {s.descarga && <span className="text-stone-500">· descarga</span>}
              {s.reevaluar && <span className="text-stone-500">· test</span>}
              {s.actual && <span>· esta semana</span>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
