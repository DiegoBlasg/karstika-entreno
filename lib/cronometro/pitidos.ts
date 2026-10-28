// Pitidos con Web Audio, sin archivos. Solo navegador. El navegador solo deja sonar tras una pulsación: `desbloquear`
// se llama desde los botones «Empezar», «Continuar» y «Seguir».
export interface Pitidos {
  desbloquear(): void
  corto(): void
  colgado(): void
  descanso(): void
  cerrar(): void
}

export function crearPitidos(): Pitidos {
  let ctx: AudioContext | null = null
  const sonar = (frecuencia: number, ms: number): void => {
    if (!ctx || ctx.state === 'closed') return
    try {
      const osc = ctx.createOscillator()
      const gan = ctx.createGain()
      osc.frequency.value = frecuencia
      osc.connect(gan).connect(ctx.destination)
      const t = ctx.currentTime
      gan.gain.setValueAtTime(0.3, t)
      gan.gain.exponentialRampToValueAtTime(0.001, t + ms / 1000)
      osc.start(t)
      osc.stop(t + ms / 1000)
    } catch {
      // Sin audio: el cronómetro sigue funcionando en silencio.
    }
  }
  return {
    desbloquear() {
      try {
        ctx ??= new AudioContext()
        void ctx.resume().catch(() => {})
      } catch {
        ctx = null
      }
    },
    corto: () => sonar(880, 120),
    colgado: () => sonar(1320, 600),
    descanso: () => sonar(440, 600),
    cerrar() {
      void ctx?.close().catch(() => {})
      ctx = null
    },
  }
}
