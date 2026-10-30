import { notFound } from 'next/navigation'
import { House, Play } from 'lucide-react'
import { FondoTopo } from '@/components/FondoTopo'
import { IconoChapa, IconoCima, IconoCuerda, IconoMultipresa, IconoPresa, IconoReunion } from '@/components/iconos/Escalada'
import { Aviso } from '@/components/ui/Aviso'
import { BarraProgreso } from '@/components/ui/BarraProgreso'
import { Boton } from '@/components/ui/Boton'
import { Chip } from '@/components/ui/Chip'
import { CifraGrande } from '@/components/ui/CifraGrande'
import { EstadoVacio } from '@/components/ui/EstadoVacio'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Hoja } from '@/components/ui/Hoja'
import { Tarjeta } from '@/components/ui/Tarjeta'
import { CAMPO } from '@/components/estilos'

export default function PaginaMuestrario() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <div className="space-y-6">
      <header className="relative -mx-4 overflow-hidden px-4 py-6">
        <FondoTopo />
        <div className="relative">
          <Etiqueta>Ciclo 1 · Semana 7 de 22</Etiqueta>
          <h1 className="font-titular text-4xl font-extrabold uppercase leading-none">Fase de <span className="text-progreso">fuerza</span></h1>
        </div>
      </header>
      <Tarjeta destacada>
        <Etiqueta as="p">Hoy · 18:30 · Rocódromo</Etiqueta>
        <h2 className="font-titular text-2xl font-bold uppercase">Multipresa · Repeaters</h2>
        <div className="flex flex-wrap gap-1"><Chip>45 min</Chip><Chip>+4 kg</Chip><Chip tono="cima">Carga alta</Chip></div>
        <Boton className="w-full"><Play aria-hidden="true" size={18} /> Empezar sesión</Boton>
      </Tarjeta>
      <Tarjeta>
        <Etiqueta as="p">L2 · Fuerza · semana 3/4</Etiqueta>
        <p>5 de 6 sesiones del largo</p>
        <BarraProgreso valor={5 / 6} etiqueta="Sesiones del largo" />
      </Tarjeta>
      <Tarjeta>
        <Etiqueta as="p">Fuerza de dedos · % del peso</Etiqueta>
        <CifraGrande valor="118" unidad="%" delta={{ texto: '6 desde R1', sentido: 'sube' }} />
      </Tarjeta>
      <div className="flex flex-wrap gap-2">
        <Boton>Principal</Boton><Boton variante="secundario">Secundario</Boton><Boton variante="peligro">Peligro</Boton><Boton disabled>Desactivado</Boton>
      </div>
      <label className="block text-sm">Campo<input className={CAMPO} placeholder="Escribe algo" /></label>
      <Aviso tono="info">Aviso informativo.</Aviso>
      <Aviso tono="ok">Todo en verde.</Aviso>
      <Aviso tono="ambar">En ámbar: no subas la carga de los dedos.</Aviso>
      <Aviso tono="rojo">En rojo: no cargues el hombro.</Aviso>
      <EstadoVacio titulo="Sin sesión hoy" texto="No tienes nada planeado para hoy." accion={{ href: '/entrenar', texto: 'Preparar una' }} />
      <Hoja disparador="¿Por qué?" titulo="¿Por qué esta sesión?"><p className="text-sm text-texto-2">Contenido de la hoja.</p></Hoja>
      <div className="flex gap-4 text-texto-2">
        <House aria-hidden="true" /><IconoMultipresa /><IconoChapa /><IconoReunion /><IconoCima className="text-cima" /><IconoPresa /><IconoCuerda />
      </div>
    </div>
  )
}
