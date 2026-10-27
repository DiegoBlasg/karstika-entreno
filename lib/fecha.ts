// Fechas de la app. «Hoy» es el día natural en Madrid; las fechas viajan como 'AAAA-MM-DD'.
// Puro: el instante actual lo pasa quien llama.

const PARTES_MADRID = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

export function ahoraMadrid(d: Date): { fecha: string; hora: number; hhmm: string } {
  const partes = PARTES_MADRID.formatToParts(d)
  const v = (tipo: Intl.DateTimeFormatPartTypes): string => {
    const p = partes.find((x) => x.type === tipo)
    if (!p) throw new Error(`Fecha sin ${tipo}`)
    return p.value
  }
  const hh = v('hour')
  const mm = v('minute')
  return { fecha: `${v('year')}-${v('month')}-${v('day')}`, hora: Number(hh) + Number(mm) / 60, hhmm: `${hh}:${mm}` }
}

const LARGA = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

export function fechaLarga(fecha: string): string {
  return LARGA.format(new Date(`${fecha}T12:00:00Z`))
}

export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}
