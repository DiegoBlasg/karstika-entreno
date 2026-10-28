# App: test de dedos guiado (entrega 2, parte B)

Fecha: 2026-10-28 · Estado: aprobado en brainstorming, pendiente de revisión escrita

## 1. Objetivo

El cronómetro (parte A) ya guía el test de dedos: 3 intentos de 10 s con 3 min de descanso y el 7:3 hasta el fallo.
Falta **apuntar el resultado sin pasos manuales**:
- el lastre de cada intento;
- la carga del 7:3 calculada con el mejor intento de hoy;
- la evaluación guardada al acabar.

Decisión de Diego: los intentos se apuntan **tras cada intento**.

## 2. Comportamiento

Solo en sesiones `evaluacion-dedos`.

1. **Al empezar:** el cronómetro pide «Peso hoy (kg)». Viene relleno con el peso de la última evaluación o, si no hay ninguna, con el del perfil.
2. **Tras cada intento de fuerza máxima** (los pasos `colgado` marcados como intento):
   - Se muestra el formulario del intento mientras no llegue el siguiente `colgado` o `fallo`.
   - Pide «Lastre usado (kg)» (negativo = descarga) y «¿Aguantaste los 10 s? Sí / No».
   - Lo apuntado se puede cambiar mientras se ve el formulario.
   - Se muestra «Mejor hasta ahora: …», que es el mayor lastre entre los intentos completados.
3. **En el «Prepárate» del 7:3 y en el propio 7:3:**
   - Si hay un intento completado, se muestra «Lastre para el 7:3: …» en lugar del texto genérico del plan.
   - La cifra se calcula con la fórmula del motor (`lastreRepeaters` con la fracción de P-24, 60 %): 60 % de (peso + mejor lastre) − peso, redondeado hacia abajo a 0,5 kg.
   - Si no hay ningún intento completado o el cálculo falla, se queda el texto del plan.
4. **Al acabar:** sale «Resultado del test» encima del registro, con estos campos ya rellenos y editables:
   - fecha de hoy (oculta);
   - peso;
   - mejor lastre;
   - resistencia (los segundos colgado del 7:3);
   - técnica de 1 a 7, opcional.

   **Guardar resultado** usa la acción `guardarEvaluacion`, con sus mismas validaciones (incluida la del motor). Si no hay ningún intento completado, el formulario no sale y en su lugar aparece «Sin un intento completado no hay resultado: apúntalo en Evaluación si quieres».
5. **Si se recarga la página:** el peso y los intentos se guardan en `localStorage` con la clave `cronometro:<id>:test` (con try/catch) y se borran al registrar.

## 3. Piezas

- **`lib/cronometro/pasos.ts`:** los `colgado` de una serie sin repeticiones llevan `intento: { n, de }`.
- **`lib/cronometro/test.ts`** (puro, con pruebas):
  - `mejorLastre`
  - `lastre73(fecha, peso, mejor)`, que devuelve `null` si el cálculo falla
  - `textoLastre`
  - `intentoAbierto(pasos, indice)`: el intento cuyo formulario se muestra
  - `leerDatosTest`: valida lo guardado
- **Pantalla:**
  - La página pasa al cronómetro `pesoInicial` y `hoy`.
  - `Cronometro` añade el modo test.
  - `FormularioResultadoTest` se apoya en `guardarEvaluacion`.
- **e2e:** un test corto con un intento: apuntar el intento, ver la carga del 7:3, «No puedo más», guardar el resultado y registrar.
