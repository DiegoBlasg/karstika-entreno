// Las reglas de lib/datos/huecos.ts y los avisos de lib/datos/semana.ts hablan de «huecos»; en la interfaz se llaman
// «ratos para entrenar». Lo usan las acciones (mensajes de error) y la página (avisos del plan).
export const enRatos = (m: string): string => m.replace(/([Hh])uecos/g, (_, h: string) => `${h === 'H' ? 'R' : 'r'}atos para entrenar`)
  .replace(/([Hh])ueco/g, (_, h: string) => `${h === 'H' ? 'R' : 'r'}ato para entrenar`)
