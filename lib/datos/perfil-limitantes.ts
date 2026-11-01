// «Tu perfil» en Progreso: lo que más te limita y lo que mejor llevas, con su origen (P-69, P-70, P-71). Puro.
import { ajusteCiclo2, diagnosticar, explicar, VALORES, type Explicacion, type FuenteDiagnostico, type Limitante } from '../../motor'
import { pistaLectura } from '../escaladas/nivel'
import { fechaLarga } from '../fecha'
import { NOMBRE_LIMITANTE } from '../nombres'
import type { DatosAtleta } from './filas'
import { evaluacionesMotor, frenosMotor } from './mapeo'
import { diagnosticoCiclo2, temporadaDe } from './peticion'

export interface VistaPerfil {
  // general: no sale de tus datos sino del orden general de los estudios (se muestra como «lo que suele limitar más»).
  limita: { cualidad: Limitante; origen: string; general: boolean }
  fuerte: { cualidad: Limitante; origen: string } | null
  plan: string | null           // qué hace el ciclo 2 con ello; null si la temporada no tiene ciclo 2
  pista: string | null          // cómo llenarlo con tus datos, mientras no decidan
  lectura: string | null        // P-75: encadenas trabajado bastante por encima de lo que haces a vista
  explicaciones: Explicacion[]  // para el «¿Por qué?»
}

const ORIGEN: Record<Exclude<FuenteDiagnostico, 'evidencia'>, string> = {
  respuestas: 'Según lo que respondes al terminar',
  tests: 'Según tus tests',
  'respuestas-y-tests': 'Según tus respuestas, corregido por tus tests',
}
const ORIGEN_FUERTE = { tests: 'Según tus tests', respuestas: 'Según lo que respondes al terminar' } as const

export function vistaPerfil(d: DatosAtleta, hoy: string): VistaPerfil | null {
  try {
    const diag = diagnosticar(evaluacionesMotor(d.evaluaciones), frenosMotor(d), hoy)
    const general = diag.fuente === 'evidencia'
    const n = Object.values(diag.frenos).reduce((a, b) => a + b, 0)
    const { minRespuestas } = VALORES['P-69']
    const lunesCiclo2 = temporadaDe(d).semanas.find((s) => s.ciclo === 2)?.lunes
    let plan: string | null = null
    if (lunesCiclo2) {
      const reparto = (a: ReturnType<typeof ajusteCiclo2>): string =>
        `${a.fuerza} semanas de fuerza y ${a.resistencia} de resistencia${a.refuerzoTecnica ? ', con técnica extra cada semana' : ''}`
      if (hoy >= lunesCiclo2) {
        // Fijado aquel lunes con lo que ya estaba guardado (como la temporada): puede no coincidir con lo de hoy.
        const fijado = diagnosticoCiclo2(d, lunesCiclo2)
        plan = `El ciclo 2 se fijó el ${fechaLarga(lunesCiclo2)} apuntando a ${NOMBRE_LIMITANTE[fijado.limitantes[0]!]}: ${reparto(ajusteCiclo2(fijado))}.`
      } else {
        plan = `${general ? 'Si no cambia' : 'Si sigue así'}, en el ciclo 2 (desde el ${fechaLarga(lunesCiclo2)}): ${reparto(ajusteCiclo2(diag))}.`
      }
    }
    const pista = !general
      ? null
      : n === 0
        ? 'Responde «¿Qué te frenó hoy?» al terminar tus sesiones al límite y esto se llenará con tus datos.'
        : n < minRespuestas
          ? `Tus respuestas aún no deciden: llevas ${n} de ${minRespuestas} en las últimas 8 semanas.`
          : `Tus respuestas aún no deciden: en ${n} ningún motivo destaca lo bastante.`
    const p = pistaLectura(d.escaladas ?? [], hoy)
    const lectura = p
      ? `En ${p.lugar === 'roca' ? 'roca' : 'rocódromo'} encadenas trabajado ${p.trabajado} y a vista o flash ${p.aVista}: trabajar la lectura y la táctica puede darte grado.`
      : null
    const explicacionLectura = p
      ? [explicar('escaladas.pista-lectura', ['P-75'], 'Una diferencia de 2 grados o más entre lo que encadenas trabajado y lo que haces a vista, en los últimos 90 días, apunta a la lectura y la táctica. Lo normal ronda 1 grado según los foros de escalada; el umbral de 2 no tiene estudio, así que es solo una pista: no cambia tus sesiones.')]
      : []
    return {
      limita: {
        cualidad: diag.limitantes[0]!,
        origen: general ? 'Orden general de los estudios, no un diagnóstico tuyo' : ORIGEN[diag.fuente as Exclude<FuenteDiagnostico, 'evidencia'>],
        general,
      },
      fuerte: diag.fortaleza ? { cualidad: diag.fortaleza.cualidad, origen: ORIGEN_FUERTE[diag.fortaleza.fuente] } : null,
      plan,
      pista,
      lectura,
      explicaciones: [...diag.explicaciones.slice(1), ...explicacionLectura],
    }
  } catch {
    return null
  }
}
