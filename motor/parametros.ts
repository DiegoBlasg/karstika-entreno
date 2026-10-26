import type { ParametroId } from './metadatos'

// Valores numéricos que usa el motor. Cada clave es un parámetro de docs/evidencia/parametros.md;
// motor/parametros.test.ts comprueba que coinciden con el documento. Los tramos siguientes añaden los suyos.
export const VALORES = {
  'P-12': { anosMaximosPerfilNovel: 2, maxSesionesMultipresa7Dias: 2, maxSesionesIntensasDedos7Dias: 3, regletaMinimaMm: 20 },
  'P-13': { maxSesionesCampus: 0 },
  // Distancia mínima en días naturales: 2 = un día completo de por medio (martes → jueves).
  'P-14': { diasMinimosEntreSesionesIntensasDedos: 2 },
  'P-15': {
    tiposIntensosDedos: [
      'multipresa-resistencia', 'multipresa-maxima', 'board', 'bloque-limite',
      'via-cuerda-limite', 'via-autoasegurada', 'pegues-proyecto', 'campus', 'evaluacion-dedos',
    ],
  },
  'P-16': { maxDiasSeguidosCargaAlta: 2 },
  'P-32': { diasBaseMinimos: 28 },
  'P-02': { trabajoS: 7, descansoS: 3 },
  'P-03': { repeticionesPorSerie: 7, seriesPorBloque: 6 },
  'P-04': { semanasConUnBloque: 2, bloquesIniciales: 1, bloquesDespues: 2 },
  'P-05': { descansoEntreSeriesS: 150 },
  'P-06': { fraccionMaximaRepeaters: 0.8 },
  'P-07': { sesionesPorSemana: 2 },
  'P-08': { semanasMaximasSinReevaluar: 10 },
  'P-18': { duracionS: 10, intentos: 3, descansoS: 180 },
  'P-35': { series: 2, minutosSerie: 15, minutosSerieCorta: 10, descansoMin: 10 },
  'P-41': { minutos: 15 },
  'P-49': { minutos: 10 },
  'P-53': { minutosPrevisualizacion: 3 },
} as const satisfies Partial<Record<ParametroId, object>>
