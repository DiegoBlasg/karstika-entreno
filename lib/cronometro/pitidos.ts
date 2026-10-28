// Pitidos con Web Audio, sin archivos. Solo navegador. El navegador solo deja sonar tras una pulsación: `desbloquear`
// se llama desde cada botón del cronómetro (en iOS conviene repetirlo).
export interface Pitidos {
  desbloquear(): void
  corto(): void
  colgado(): void
  descanso(): void
  cerrar(): void
}

// Safari 17+ (iOS): con `type = 'playback'` Web Audio suena aunque el interruptor de silencio esté puesto. lib.dom aún
// no lo declara.
interface ConSesionDeAudio {
  audioSession?: { type: string }
}

export function crearPitidos(): Pitidos {
  let ctx: AudioContext | null = null
  const sonar = (frecuencia: number, ms: number): void => {
    if (!ctx || ctx.state === 'closed') return
    // Tras una llamada o un bloqueo de pantalla, iOS deja el contexto `suspended` o `interrupted`.
    if (ctx.state !== 'running') void ctx.resume().catch(() => {})
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
        const sesion = (navigator as Navigator & ConSesionDeAudio).audioSession
        if (sesion) sesion.type = 'playback'
      } catch {
        // Sin sesión de audio: suena como siempre (en iOS, solo sin el interruptor de silencio).
      }
      try {
        ctx ??= new AudioContext()
        void ctx.resume().catch(() => {})
      } catch {
        ctx = null
        return
      }
      try {
        // iOS solo da el audio por desbloqueado si suena algo dentro de la pulsación: un oscilador mudo de 10 ms.
        const osc = ctx.createOscillator()
        const gan = ctx.createGain()
        gan.gain.value = 0
        osc.connect(gan).connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.01)
      } catch {
        // No hace falta en los demás navegadores.
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
