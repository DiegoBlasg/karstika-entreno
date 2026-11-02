# Pulido final

Fecha: 2026-11-02 · Rama: `pulido-final` · Lo aparcado de escaladas y biblioteca, todo junto (Diego: «hazlo todo a la vez»).

1. **Grado con botones cerca de tu nivel.** Al apuntar un encadene (registro y Progreso) salen 6 botones de grado
   alrededor de tu nivel (vías: el actual de «Tu nivel», 3 por debajo y 2 por encima; bloques: tu mejor bloque o 6A) y
   «Otro grado…» que abre el desplegable completo. Un grado ya apuntado fuera de esa ventana abre directamente el
   desplegable.
2. **Dejar un proyecto.** En «Tu nivel», cada proyecto abierto tiene «Dejarlo». Se guarda como una escalada de estilo
   `abandonado` (migración 009: sin grado, de proyecto) que cierra el proyecto: deja de salir como abierto y no cuenta
   como encadene. Sale en «Últimas escaladas» como «lo dejé» y se puede borrar para reabrirlo.
3. **Técnica por sesiones.** El ejercicio técnico rota por número de sesiones de técnica anteriores (como el ARC A/B),
   no por semana del calendario: con una técnica cada dos semanas también salen los cuatro. En roca, siempre pies
   silenciosos.
4. **Etiqueta «Test».** Las fichas de tests (suspensión máxima, colgado en 30 mm, power slap, dominadas máximas,
   apertura de cadera) llevan «Test» en la lista y en la ficha.

Pruebas: ventana de grados (bordes de la escala), abandono (cierra, no es encadene, reabre al borrar), rotación por
sesiones, `probar-bd` con el estilo nuevo, e2e de dejar un proyecto.
