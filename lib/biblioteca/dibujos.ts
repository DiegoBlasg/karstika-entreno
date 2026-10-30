// Posiciones clave con esquema SVG propio. Los dibujos están en components/dibujos/ (uno por id).
export const DIBUJO_IDS = [
  'colgado-multipresa', 'retraccion-barra', 'dominada', 'flexion', 'rotacion-externa', 'ytw', 'face-pull', 'plancha',
] as const
export type DibujoId = (typeof DIBUJO_IDS)[number]

export const DESCRIPCION_DIBUJO: Record<DibujoId, string> = {
  'colgado-multipresa': 'Figura colgada de una regleta de la multipresa con los brazos estirados y agarre semiarqueado',
  'retraccion-barra': 'Figura colgada de la barra con los brazos estirados, juntando las escápulas sin doblar los codos',
  dominada: 'Figura subiendo en una dominada con la barbilla a la altura de la barra',
  flexion: 'Figura en flexión, con el cuerpo recto y el pecho cerca del suelo',
  'rotacion-externa': 'Figura de pie con el codo pegado al costado, girando el antebrazo hacia fuera contra una banda',
  ytw: 'Tres figuras de frente con los brazos en Y, en T y en W',
  'face-pull': 'Figura de pie tirando de una banda hacia la cara con los codos altos',
  plancha: 'Figura en plancha sobre las manos, levantando una mano para tocar el hombro contrario',
}
