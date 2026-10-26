import type { ParametroId } from './metadatos'

// Valores numéricos que usa el motor. Cada clave es un parámetro de docs/evidencia/parametros.md;
// motor/parametros.test.ts comprueba que coinciden con el documento. Los tramos siguientes añaden los suyos.
export const VALORES = {
  'P-12': { anosMaximosPerfilNovel: 2, maxSesionesMultipresa7Dias: 2, regletaMinimaMm: 20 },
  'P-13': { maxSesionesCampus: 0 },
  'P-14': { horasMinimasEntreSesionesIntensasDedos: 48 },
  'P-15': {
    tiposIntensosDedos: [
      'multipresa-resistencia', 'multipresa-maxima', 'board', 'bloque-limite',
      'via-cuerda-limite', 'via-autoasegurada', 'pegues-proyecto', 'campus', 'evaluacion-dedos',
    ],
  },
  'P-16': { maxDiasSeguidosCargaAlta: 2 },
  'P-32': { diasBaseMinimos: 28 },
} as const satisfies Partial<Record<ParametroId, object>>
