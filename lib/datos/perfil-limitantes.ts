// «Tu perfil» en Progreso: lo que más te limita y lo que mejor llevas, con su origen (P-69, P-70, P-71). Puro.
import { ajusteCiclo2, diagnosticar, type FuenteDiagnostico, type Limitante } from '../../motor'
import { fechaLarga } from '../fecha'
import type { DatosAtleta } from './filas'
import { evaluacionesMotor, frenosMotor } from './mapeo'
import { temporadaDe } from './peticion'

export interface VistaPerfil {
  limita: { cualidad: Limitante; origen: string }
  fuerte: { cualidad: Limitante; origen: string } | null
  plan: string | null       // qué hace el ciclo 2 con ello; null si la temporada no tiene ciclo 2
  sinDatos: boolean         // el limitante sale del orden general: hay que explicar cómo se llena
}

const ORIGEN: Record<FuenteDiagnostico, string> = {
  respuestas: 'Según lo que respondes al terminar',
  tests: 'Según tus tests',
  'respuestas-y-tests': 'Según tus respuestas, corregido por tus tests',
  evidencia: 'Orden general de los estudios: aún no hay datos tuyos',
}
const ORIGEN_FUERTE = { tests: 'Según tus tests', respuestas: 'Según lo que respondes al terminar' } as const

export function vistaPerfil(d: DatosAtleta, hoy: string): VistaPerfil | null {
  try {
    const evaluaciones = evaluacionesMotor(d.evaluaciones)
    const respuestas = frenosMotor(d)
    const diag = diagnosticar(evaluaciones, respuestas, hoy)
    const lunesCiclo2 = temporadaDe(d).semanas.find((s) => s.ciclo === 2)?.lunes
    let plan: string | null = null
    if (lunesCiclo2) {
      // Antes del ciclo 2, lo que saldría hoy; después, lo fijado con lo sabido aquel lunes (como la temporada).
      const fijado = hoy >= lunesCiclo2
      const a = ajusteCiclo2(fijado ? diagnosticar(evaluaciones, respuestas, lunesCiclo2) : diag)
      const reparto = `${a.fuerza} semanas de fuerza y ${a.resistencia} de resistencia${a.refuerzoTecnica ? ', con técnica extra cada semana' : ''}`
      plan = fijado
        ? `El ciclo 2 lleva ${reparto}.`
        : `Si sigue así, en el ciclo 2 (desde el ${fechaLarga(lunesCiclo2)}): ${reparto}.`
    }
    return {
      limita: { cualidad: diag.limitantes[0]!, origen: ORIGEN[diag.fuente] },
      fuerte: diag.fortaleza ? { cualidad: diag.fortaleza.cualidad, origen: ORIGEN_FUERTE[diag.fortaleza.fuente] } : null,
      plan,
      sinDatos: diag.fuente === 'evidencia',
    }
  } catch {
    return null
  }
}
