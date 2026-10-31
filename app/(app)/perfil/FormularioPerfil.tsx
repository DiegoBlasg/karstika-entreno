'use client'

import { useActionState } from 'react'
import { AvisoMedico } from '@/components/AvisoMedico'
import { BOTON, CAMPO } from '@/components/estilos'
import { Etiqueta } from '@/components/ui/Etiqueta'
import { Tarjeta } from '@/components/ui/Tarjeta'
import type { FilaPerfil } from '@/lib/datos/filas'
import type { EstadoAccion } from '@/lib/estado'
import { guardarPerfil } from './acciones'

const CASILLA = 'size-6 shrink-0 accent-progreso'

export function FormularioPerfil({ perfil }: { perfil: FilaPerfil | null }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(guardarPerfil, null)
  return (
    <form action={accion} className="space-y-4">
      <Tarjeta aria-label="Tu perfil">
        <Etiqueta as="h2">Tu perfil</Etiqueta>
        <label className="block">Peso (kg)<input name="peso_kg" inputMode="decimal" required defaultValue={perfil?.peso_kg} className={CAMPO} /></label>
        <label className="block">Años escalando<input name="anos_escalando" inputMode="decimal" required defaultValue={perfil?.anos_escalando} className={CAMPO} /></label>
        <p className="text-xs text-texto-2">Con menos de 2 años se aplican las reglas de novel: sin suspensiones máximas, regleta obligatoria y más cautela con los dedos.</p>
        <div className="flex gap-3">
          <label className="block flex-1">Grado actual<input name="grado_actual" required maxLength={10} defaultValue={perfil?.grado_actual ?? '6b'} className={CAMPO} /></label>
          <label className="block flex-1">Grado objetivo<input name="grado_objetivo" required maxLength={10} defaultValue={perfil?.grado_objetivo ?? '7a'} className={CAMPO} /></label>
        </div>
        <label className="block">Lesiones (una por línea)<textarea name="lesiones" rows={2} defaultValue={perfil?.lesiones.join('\n')} className={CAMPO} /></label>
        <p className="text-xs text-texto-2">Solo para tu registro: el entrenador no lo tiene en cuenta; usa las molestias del chequeo y del registro.</p>
        <label className="block">Inicio de la temporada<input type="date" name="inicio_temporada" required defaultValue={perfil?.inicio_temporada ?? '2026-11-02'} className={CAMPO} /></label>
        <p className="text-xs text-texto-2">La temporada cuenta por semanas de lunes a domingo: si eliges un jueves, empieza el lunes de esa semana y ese jueves ya es la semana 1.</p>
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="multipresa_en_casa" defaultChecked={perfil?.multipresa_en_casa ?? false} className={CASILLA} /> Tengo multipresa en casa</label>
        <label className="block">Fecha objetivo<input type="date" name="objetivo_temporada" required defaultValue={perfil?.objetivo_temporada ?? '2027-10-04'} className={CAMPO} /></label>
        {perfil && <p className="text-xs text-texto-2">Cambiar las fechas replanifica toda la temporada.</p>}
      </Tarjeta>
      {!perfil && (
        <Tarjeta aria-label="Aviso médico">
          <Etiqueta as="h2">Aviso médico</Etiqueta>
          <AvisoMedico />
          <label className="flex min-h-11 items-center gap-3"><input type="checkbox" name="aviso" required className={CASILLA} /> He leído el aviso y lo acepto</label>
        </Tarjeta>
      )}
      <button className={`${BOTON} w-full`} disabled={pendiente}>Guardar perfil</button>
      {estado?.error && <p role="alert" className="text-sm text-rojo">{estado.error}</p>}
      {estado?.ok && <p className="text-sm text-progreso">{estado.ok}</p>}
    </form>
  )
}
