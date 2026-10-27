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
      'multipresa-resistencia-fuerza',
    ],
  },
  'P-16': { maxDiasSeguidosCargaAlta: 2 },
  'P-32': { diasBaseMinimos: 28, sesionesMinimasBase: 6 },
  'P-36': { trabajoS: 10, descansoS: 5, repeticiones: 5, series: 4, descansoSeriesS: 60 },
  'P-37': { bloques: 4, vueltas: 4, descansoVueltaMin: 4 },
  'P-61': { maxIntentos: 4 },
  'P-23': { orden: ['fuerza-dedos', 'resistencia', 'tecnica', 'cabeza'] },
  'P-24': { trabajoS: 7, descansoS: 3, fraccion: 0.6 },
  'P-27': { minimo: 1, maximo: 7 },
  'P-31': { fuerzaMin: 4, fuerzaMax: 10, resistenciaMin: 4, resistenciaMax: 8 },
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
  'P-39': { minutos: 15, series: 4, repeticiones: 4, repeticionesEnReserva: 2, descansoMin: 3, max7Dias: 1 },
  'P-43': { verdeMax: 1, ambarMax: 3 },
  'P-45': { registrosAmbarSeguidos: 2, diasAmbarMax: 7 },
  'P-50': { sesionesPorEncimaSeguidas: 2, chequeosBajos: 3, ventanaDias: 7 },
  'P-63': { rpeMaxAlta: 8, rpeMaxSuave: 5 },
  'P-65': { escalaMin: 1, escalaMax: 5, umbralBajo: 2, diasDescarga: 7 },
  'P-66': { maxConsejos: 2, diasSinRepetir: 7 },
  'P-57': { gramosPorKg: 1.6 },
} as const satisfies Partial<Record<ParametroId, object>>
