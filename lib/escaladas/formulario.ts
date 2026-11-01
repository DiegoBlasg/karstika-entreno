// Lectura de las escaladas de un formulario: las del registro de una sesión al límite (encadenes y pegues a un proyecto)
// y la suelta de Progreso. Los errores llevan un mensaje listo para mostrar.
import type { EstiloEscalada, FilaEscalada, FilaSesion } from '../datos/filas'
import { sumarDias } from '../fecha'
import { entero, ErrorFormulario, fecha, opcion, textoOpcional } from '../formulario'
import { esGradoValido, type TipoEscalada } from './grados'
import { claveNombre, type Proyecto } from './nivel'

export const MAX_ENCADENES = 5
export const DIAS_ATRAS_SUELTA = 30
// En el formulario del proyecto: «uno nuevo» en lugar de uno abierto.
export const PROYECTO_NUEVO = '__nuevo__'
const TIPOS: readonly TipoEscalada[] = ['via', 'bloque']
const LUGARES: readonly FilaEscalada['lugar'][] = ['rocodromo', 'roca']
const ESTILOS_ENCADENE = ['a-vista', 'flash', 'encadenada'] as const
const ESTILOS: readonly EstiloEscalada[] = [...ESTILOS_ENCADENE, 'pegues']

// El lugar de las escaladas de una sesión: los pegues a un proyecto son en roca; si no, el sitio con que se generó.
export function lugarDeSesion(fila: FilaSesion): FilaEscalada['lugar'] {
  if (fila.sesion.tipo === 'pegues-proyecto') return 'roca'
  return fila.propuesta?.contexto?.lugar === 'roca' ? 'roca' : 'rocodromo'
}

// Vía o bloque preelegido en el registro: bloque en las sesiones de bloque y board; vía en el resto.
export const tipoDeSesion = (fila: Pick<FilaSesion, 'sesion'>): TipoEscalada =>
  fila.sesion.tipo === 'bloque-limite' || fila.sesion.tipo === 'board' ? 'bloque' : 'via'

function grado(fd: FormData, nombre: string, tipo: TipoEscalada, obligatorio: boolean): string | null {
  const g = textoOpcional(fd, nombre)
  if (g === null) {
    if (obligatorio) throw new ErrorFormulario('El grado: falta el dato.')
    return null
  }
  if (!esGradoValido(tipo, g)) throw new ErrorFormulario(`El grado ${g} no es de la escala de ${tipo === 'via' ? 'vías' : 'bloques'}.`)
  return g
}

function nombre(fd: FormData, campo: string): string | null {
  const n = textoOpcional(fd, campo)
  if (n !== null && n.length > 80) throw new ErrorFormulario('El nombre: como mucho 80 caracteres.')
  return n
}

// Encadenes (con «encadené» marcado; las líneas sin grado no se guardan) y, en los pegues a un proyecto, ese proyecto.
export function escaladasDelRegistro(fd: FormData, fila: FilaSesion, abiertos: readonly Proyecto[]): FilaEscalada[] {
  const lugar = lugarDeSesion(fila)
  const base = { fecha: fila.fecha, sesion_id: fila.id, lugar, nombre: null, proyecto: false, pegues: 1 }
  const out: FilaEscalada[] = []
  if (fd.get('encadene') === 'on') {
    for (let i = 0; i < MAX_ENCADENES; i++) {
      if (textoOpcional(fd, `esc_grado_${i}`) === null) continue
      const tipo = opcion(fd, `esc_tipo_${i}`, 'Vía o bloque', TIPOS)
      out.push({
        ...base, id: crypto.randomUUID(), tipo,
        grado: grado(fd, `esc_grado_${i}`, tipo, true),
        estilo: opcion(fd, `esc_estilo_${i}`, 'Cómo lo encadenaste', ESTILOS_ENCADENE),
      })
    }
  }
  if (fila.sesion.tipo === 'pegues-proyecto') {
    const elegido = textoOpcional(fd, 'proy')
    if (elegido !== null) {
      const existente = elegido === PROYECTO_NUEVO ? null : abiertos.find((p) => claveNombre(p.nombre) === claveNombre(elegido))
      if (elegido !== PROYECTO_NUEVO && !existente) throw new ErrorFormulario('Ese proyecto ya no está abierto.')
      const tipo: TipoEscalada = existente?.tipo ?? 'via'
      const nuevoNombre = existente ? existente.nombre : nombre(fd, 'proy_nombre')
      if (nuevoNombre === null) throw new ErrorFormulario('El nombre del proyecto: falta el dato.')
      const cayo = fd.get('proy_cayo') === 'on'
      const g = grado(fd, 'proy_grado', tipo, false) ?? existente?.grado ?? null
      if (g === null && (cayo || !existente)) throw new ErrorFormulario('El grado del proyecto: falta el dato.')
      out.push({
        ...base, id: crypto.randomUUID(), tipo, lugar: existente?.lugar ?? lugar, grado: g, nombre: nuevoNombre, proyecto: true,
        estilo: cayo ? 'encadenada' : 'pegues', pegues: entero(fd, 'proy_pegues', 'Los pegues', 1, 50),
      })
    }
  }
  return out
}

// Una escalada suelta de Progreso: de hoy o de los 30 días anteriores. Los pegues son siempre de un proyecto.
export function escaladaSuelta(fd: FormData, hoy: string): FilaEscalada {
  const f = fecha(fd, 'fecha', 'La fecha')
  if (f > hoy) throw new ErrorFormulario('La fecha no puede ser futura.')
  if (f < sumarDias(hoy, -DIAS_ATRAS_SUELTA)) throw new ErrorFormulario(`La fecha: como mucho ${DIAS_ATRAS_SUELTA} días atrás.`)
  const tipo = opcion(fd, 'tipo', 'Vía o bloque', TIPOS)
  const estilo = opcion(fd, 'estilo', 'Cómo fue', ESTILOS)
  const proyecto = estilo === 'pegues' || fd.get('proyecto') === 'on'
  const n = nombre(fd, 'nombre')
  if (proyecto && n === null) throw new ErrorFormulario('Un proyecto necesita un nombre.')
  return {
    id: crypto.randomUUID(), fecha: f, sesion_id: null, tipo,
    lugar: opcion(fd, 'lugar', 'Roca o rocódromo', LUGARES),
    grado: grado(fd, 'grado', tipo, estilo !== 'pegues'),
    estilo, nombre: n, proyecto,
    pegues: textoOpcional(fd, 'pegues') === null ? 1 : entero(fd, 'pegues', 'Los pegues', 1, 50),
  }
}
