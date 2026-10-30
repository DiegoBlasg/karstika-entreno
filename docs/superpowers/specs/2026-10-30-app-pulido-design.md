# App: pulido (detalles menores acumulados)

Fecha: 2026-10-30 · Estado: aprobado por Diego (hoja de ruta del 2026-10-29: «mañanas → pulido → …»)

Son detalles que Diego nota al usar la app, recogidos en las revisiones de cada entrega. En cada uno se cambia solo lo descrito.

## Hoy

1. **«Toca descansar» sin salida.** Cuando un motivo de `noEncaja` es «hoy toca descansar» (`soloDescanso`), la tarjeta ofrece **Quitarla** (la acción `noLaHice`, con confirmación) en lugar de «Cambiarla por otra», porque no habría otra sesión posible. Con otros motivos sigue «Cambiarla por otra».
2. **Varios motivos a la vez.** Con chequeo bajo y además una zona de carga en ámbar, `motivosNoEncaja` da los dos motivos, no solo el del chequeo:
   - «Tu chequeo de hoy es bajo: hoy nada de carga alta.»
   - «Tienes una zona de carga en ámbar: hoy nada de carga alta.»
3. **Descarga adelantada.** La línea de posición en el año (`ContextoTemporada`) de las tarjetas de Hoy y del cronómetro tiene en cuenta las descargas adelantadas, como hace Entrenar con `faseEnFecha(t, fecha, { descargasAdelantadas })`.
4. **Domingo.** Cuando no queda ningún hueco pendiente esta semana, «Próximo hueco» de Hoy mira el primero pendiente de la semana siguiente.
5. **Quitar una sesión futura.** En las sesiones futuras de «Próximas», el botón se llama **Quitar**, con la confirmación «¿Quitar esta sesión?». «No la hice» se queda para las de hoy y las pasadas.

## Entrenar

6. **Cambiar una sesión solo dentro de hoy.** Con `reemplaza`, `proponer` y `aceptar` exigen que la sesión nueva sea de hoy. Si no lo es: «La sesión que la sustituye también tiene que ser de hoy.» El campo Día del formulario queda fijado en hoy mientras haya `reemplaza`.
7. **Minutos.** El campo de minutos de Entrenar acepta cualquier entero del rango (`step={1}`), para que un hueco de 63 min no bloquee el envío.
8. **Solape.** El error de solape (`validarDatos`) nombra la sesión que se está guardando y añade: «Quita antes la otra sesión en Hoy.»

## Formularios en iPhone

9. **Coma en la regleta.** Los campos de regleta (mm) de «Hice otra cosa» y del entrenamiento no planeado pasan a ser de texto con teclado decimal (`type="text" inputMode="decimal"`). Así la coma del iPhone no se pierde, porque el servidor ya la acepta en `numero`.

## Perfil

10. **Ayudas.**
    - Bajo «Lesiones»: «Solo para tu registro: el entrenador no lo tiene en cuenta; usa las molestias del chequeo y del registro.»
    - Bajo «Años escalando»: «Con menos de 2 años se aplican las reglas de novel: sin suspensiones máximas, regleta obligatoria y más cautela con los dedos.»

## Mi semana

11. **Borrar un hueco que ya no existe.** `borrarHueco` comprueba la sesión con `bd()` sin cargar todos los datos. Si no borra ninguna fila, responde «Ese hueco ya no existe.» No borra huecos que ya han pasado: en ese caso responde «Ese hueco ya ha pasado.»

## Cronómetro

12. **Claves viejas.** Al cargar Hoy se borran del navegador, con try/catch, las claves `cronometro:<id>` y `cronometro:<id>:test` de sesiones que ya no están pendientes de hoy.
13. **Sin parpadeo.** El cronómetro no muestra «Empezar» hasta haber leído lo guardado (un estado `cargado`), así se evita empezar de cero por un toque rápido.

## Pruebas

Unitarias para lo puro: 2, 4, 6 (`datosSinReemplazada` o la comprobación en las acciones), 11 si se extrae a una función pura y 12 (la función que decide qué claves borrar). El resto se verifica con tsc, build y e2e. El e2e existente debe seguir en verde y se ajusta solo donde cambie un texto que comprueba.
