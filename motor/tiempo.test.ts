import { describe, expect, it } from 'vitest'
import { ses } from './_fabrica'
import { diaNumero, fechaDesdeDia, finHoras, inicioHoras, validarEntrada } from './tiempo'

describe('diaNumero', () => {
  it('cuenta días desde 1970-01-01', () => {
    expect(diaNumero('1970-01-01')).toBe(0)
    expect(diaNumero('1970-01-02')).toBe(1)
  })
  it('días consecutivos difieren en 1 también al cambiar de mes, año y bisiesto', () => {
    expect(diaNumero('2026-11-01') - diaNumero('2026-10-31')).toBe(1)
    expect(diaNumero('2027-01-01') - diaNumero('2026-12-31')).toBe(1)
    expect(diaNumero('2024-03-01') - diaNumero('2024-02-29')).toBe(1)
  })
  it('lanza con fechas inexistentes o mal formadas', () => {
    expect(() => diaNumero('2026-02-30')).toThrow()
    expect(() => diaNumero('2026-13-01')).toThrow()
    expect(() => diaNumero('26-10-01')).toThrow()
    expect(() => diaNumero('2026-10-1')).toThrow()
  })
  it('respeta los años bisiestos', () => {
    expect(() => diaNumero('2026-02-29')).toThrow()
    expect(() => diaNumero('2100-02-29')).toThrow()
    expect(() => diaNumero('2000-02-29')).not.toThrow()
  })
  it('es negativo antes de 1970', () => {
    expect(diaNumero('1969-12-31')).toBe(-1)
    expect(diaNumero('1970-01-01') - diaNumero('1969-12-31')).toBe(1)
  })
})

describe('inicioHoras y finHoras', () => {
  it('suma hora de inicio y duración', () => {
    const s = ses('a', '1970-01-02', 18, { duracionMin: 90 })
    expect(inicioHoras(s)).toBe(24 + 18)
    expect(finHoras(s)).toBe(24 + 18 + 1.5)
  })
})

describe('validarEntrada', () => {
  it('acepta sesiones válidas', () => {
    expect(() => validarEntrada([ses('a', '2026-10-26', 18), ses('b', '2026-10-27', 0)])).not.toThrow()
  })
  it('lanza con ids duplicados', () => {
    expect(() => validarEntrada([ses('a', '2026-10-26', 18), ses('a', '2026-10-27', 18)])).toThrow(/duplicado/)
  })
  it('lanza con hora fuera de [0, 24)', () => {
    expect(() => validarEntrada([ses('a', '2026-10-26', 24)])).toThrow(/horaInicio/)
    expect(() => validarEntrada([ses('a', '2026-10-26', -1)])).toThrow(/horaInicio/)
    expect(() => validarEntrada([ses('a', '2026-10-26', Number.NaN)])).toThrow(/horaInicio/)
  })
  it('lanza con duración no positiva o no finita', () => {
    expect(() => validarEntrada([ses('a', '2026-10-26', 18, { duracionMin: 0 })])).toThrow(/duracionMin/)
    expect(() => validarEntrada([ses('a', '2026-10-26', 18, { duracionMin: Infinity })])).toThrow(/duracionMin/)
  })
  it('lanza con tipo o intensidad desconocidos', () => {
    expect(() => validarEntrada([ses('a', '2026-10-26', 18, { tipo: 'zumba' as never })])).toThrow(/tipo/)
    expect(() => validarEntrada([ses('a', '2026-10-26', 18, { intensidad: 'media' as never })])).toThrow(/intensidad/)
  })
  it('lanza con una fecha inexistente', () => {
    expect(() => validarEntrada([ses('a', '2026-02-30', 18)])).toThrow()
  })
  it('el error de fecha nombra la sesión', () => {
    expect(() => validarEntrada([ses('sesion-rara', '2026-02-30', 18)])).toThrow(/Fecha inválida en sesion-rara/)
  })
  it('acepta horaInicio 23.999 y rechaza infinitos', () => {
    expect(() => validarEntrada([ses('a', '2026-10-26', 23.999)])).not.toThrow()
    expect(() => validarEntrada([ses('a', '2026-10-26', Infinity)])).toThrow(/horaInicio/)
    expect(() => validarEntrada([ses('a', '2026-10-26', -Infinity)])).toThrow(/horaInicio/)
  })
  it('lanza con duracionMin NaN o negativa', () => {
    expect(() => validarEntrada([ses('a', '2026-10-26', 18, { duracionMin: Number.NaN })])).toThrow(/duracionMin/)
    expect(() => validarEntrada([ses('a', '2026-10-26', 18, { duracionMin: -5 })])).toThrow(/duracionMin/)
  })
  it('lanza con un id vacío o no string', () => {
    expect(() => validarEntrada([ses('', '2026-10-26', 18)])).toThrow(/id/)
    expect(() => validarEntrada([ses(undefined as never, '2026-10-26', 18)])).toThrow(/id/)
    expect(() => validarEntrada([ses(5 as never, '2026-10-26', 18)])).toThrow(/id/)
  })
  it('valida detalle.agarre, nombrando la sesión y el campo', () => {
    expect(() => validarEntrada([ses('s1', '2026-10-26', 18, { detalle: { agarre: 'raro' as never } })])).toThrow(/s1.*agarre|agarre.*s1/)
    for (const agarre of ['abierto', 'semiarqueado', 'arqueado'] as const) {
      expect(() => validarEntrada([ses('s1', '2026-10-26', 18, { detalle: { agarre } })])).not.toThrow()
    }
  })
  it('valida detalle.conCarga como booleano', () => {
    expect(() => validarEntrada([ses('s2', '2026-10-26', 18, { detalle: { conCarga: 'si' as never } })])).toThrow(/s2.*conCarga|conCarga.*s2/)
    expect(() => validarEntrada([ses('s2', '2026-10-26', 18, { detalle: { conCarga: 1 as never } })])).toThrow(/conCarga/)
    expect(() => validarEntrada([ses('s2', '2026-10-26', 18, { detalle: { conCarga: false } })])).not.toThrow()
  })
  it('valida detalle.regletaMm como número finito positivo', () => {
    for (const regletaMm of [0, -3, Number.NaN, Infinity, '20' as never]) {
      expect(() => validarEntrada([ses('s3', '2026-10-26', 18, { detalle: { regletaMm } })])).toThrow(/s3.*regletaMm|regletaMm.*s3/)
    }
    expect(() => validarEntrada([ses('s3', '2026-10-26', 18, { detalle: { regletaMm: 20 } })])).not.toThrow()
    expect(() => validarEntrada([ses('s3', '2026-10-26', 18, { detalle: {} })])).not.toThrow()
  })
  it('lanza si detalle no es un objeto', () => {
    expect(() => validarEntrada([ses('s4', '2026-10-26', 18, { detalle: 3 as never })])).toThrow(/s4.*detalle|detalle.*s4/)
  })
  it('acepta una lista vacía', () => {
    expect(() => validarEntrada([])).not.toThrow()
  })
})

describe('fechaDesdeDia', () => {
  it('es la inversa de diaNumero', () => {
    for (const f of ['1970-01-01', '2024-02-29', '2026-10-27', '2026-12-31', '1969-12-31']) {
      expect(fechaDesdeDia(diaNumero(f))).toBe(f)
    }
  })
  it('suma un día al cambiar de mes', () => {
    expect(fechaDesdeDia(diaNumero('2026-10-31') + 1)).toBe('2026-11-01')
  })
})
