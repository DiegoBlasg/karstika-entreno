# Motor: plan semanal con los huecos disponibles (tramo 2e)

Fecha: 2026-10-27 · Estado: aprobado en brainstorming, pendiente de revisión escrita

## 1. Problema

El generador decide cada sesión con lo ya hecho, sin mirar lo que queda de semana. Con la disponibilidad real de
Diego eso falla. Una simulación de 16 semanas lo muestra:

- **Disponibilidad:**
  - Mañanas de lunes a jueves: siempre, en casa, de 45 a 60 min, con multipresa, barra y hombro.
  - Tardes: según la semana, normalmente lunes, martes y jueves. Unas veces solo y otras con gente.
  - Viernes a domingo: nada.
- **Lo que pasa en la fuerza:**
  - La multipresa intensa del lunes bloquea el martes, porque P-14 exige un día completo entre sesiones intensas de dedos.
  - El martes con amigos y cuerda se queda en técnica suave todas las semanas.
  - Algunos jueves salen de descanso (P-16).
- **Por qué no caben todos los cupos:** con 4 días seguidos y el tope de novel (P-12), caben como mucho 2 días intensos de dedos por semana, y la fase de fuerza pide 3.

## 2. Objetivo

Cuando se pide una sesión, el motor recibe también los **huecos** que quedan hasta el domingo y elige el reparto de
la semana que mejor cubre los cupos de la fase. Devuelve la sesión del hueco pedido y el plan del resto, para
mostrarlo. Recalcula en cada petición, así que se adapta si se salta un hueco, si sale un ámbar o rojo, o si cambian
los huecos.

Fuera de alcance: la pantalla «Mi semana» de la app (tramo aparte, después de este) y cualquier calendario fijo.

## 3. Entrada

```ts
interface Hueco {
  fecha: string            // 'AAAA-MM-DD'
  horaInicio: number       // mañana o tarde, en horas
  contexto: Contexto       // compañía, lugar y minutos
}
```

- `Peticion` gana `huecos?: Hueco[]`, que son los huecos **posteriores** a la sesión pedida, hasta el domingo de esa semana.
- **Validación:**
  - Fechas iguales o posteriores a la de la petición, como mucho hasta el domingo de esa semana.
  - Sin solapes entre huecos ni con la petición.
  - Contextos válidos (`validarContexto`).
  - Como mucho 2 huecos por día.
- **Sin `huecos`:** el comportamiento es exactamente el actual, y las pruebas existentes no cambian. Con `huecos: []` (el último hueco de la semana) se usa el plan; ver §9.

## 4. Búsqueda del reparto (P-67, decisión de diseño)

1. **Opciones de cada hueco**, en orden de fecha y hora. Son las sesiones que el generador actual propondría en ese
   hueco con el historial más las sesiones ya elegidas para los huecos anteriores del reparto, más la opción
   «nada». Se usan la principal, las alternativas y, si el motor recomienda descanso, sus alternativas suaves.
   Todas pasan por las reglas de seguridad y de estado de siempre, porque se calculan con `proponer`.
2. **Repartos:** se recorren todas las combinaciones de qué huecos llevan una sesión de **carga alta**
   (`esCargaAlta`), descartando antes las que rompen una regla evidente:
   - dos huecos de carga alta el mismo día;
   - días intensos de dedos sin un día completo entre ellos;
   - más de 2 días seguidos de carga alta.

   Para cada combinación, los huecos se rellenan en orden con la mejor opción de carga alta o suave que permite la
   combinación.
3. **Puntuación** de un reparto, incluyendo la sesión pedida: un vector con, para cada tipo de `fase.prioridad`
   en su orden, `min(sesiones del tipo en los 7 días que acaban en el último hueco, cupo)` (contando también los
   complementos de `incluye`). Los vectores se comparan **lexicográficamente**: manda el cupo del tipo que la fase
   pone primero, después el siguiente, y así. Por ejemplo, en la fuerza «vía al límite + 1 multipresa» gana a
   «2 multipresas». (Al hacer el plan se vio que sumar cupos por pesos dejaba que los complementos inclinaran la
   balanza al lado contrario.) Desempates: más minutos totales; después, lo más prioritario antes en la semana; por
   último, el orden lexicográfico de los tipos, para que sea determinista.
   - Si el generador recomienda descanso en un hueco (principal nula), el hueco se queda vacío: se respeta la decisión
     de Diego de que el descanso sea la propuesta principal.
4. **Resultado:** la sesión del hueco pedido sale del mejor reparto, completada con sus complementos como ahora.
   Las alternativas son las de hoy, y cada una lleva una nota: elegirla puede cambiar el resto de la semana.

Límite de coste: con 8 huecos hay 256 combinaciones como mucho, y se podan antes de simular. Si en la práctica pasa
de unos 300 ms, se reduce con una cota (por ejemplo, descartar ramas que no pueden superar la mejor puntuación).

## 5. Regla de seguridad nueva (P-68, decisión de diseño)

`seguridad.carga-alta-mismo-dia`: no puede haber dos sesiones de carga alta el mismo día natural. Vale también sin
plan, por ejemplo al pedir dos sesiones sueltas el mismo día. Lo decidió Diego: con mañana y tarde, una de las dos
es suave.

## 6. Salida

- `Propuesta` gana `semana?: { hueco: Hueco; sesion: Sesion | null }[]`, el plan del resto de huecos, y su
  explicación (`plan.semana`).
- **La explicación** dice qué se reserva y por qué, por ejemplo: «El martes por la tarde se reserva para la vía al
  límite con cuerda, así que hoy la multipresa va suave».
- **Bloques:** las sesiones del plan solo llevan tipo, intensidad y minutos. Los bloques y las cargas se calculan
  cuando se pide cada una.
- **Sin cambios en el resto:** `principal`, `alternativas`, `descanso` y `estado` funcionan igual. Si el mejor
  reparto deja vacío el hueco pedido, la principal es el descanso, con el motivo «hoy descansas para…».

## 7. Parámetros

- P-67 (diseño, sin evidencia): reparto semanal por huecos, con la puntuación de §4.
- P-68 (diseño, sin evidencia): una sola sesión de carga alta por día.
- Se añaden a `docs/evidencia/parametros.md` (CRLF) y se regenera `motor/metadatos.ts`.

## 8. Pruebas

- **Comportamiento actual intacto:** las 710 pruebas actuales siguen en verde, sin huecos.
- **Simulación** de 16 semanas con los huecos reales:
  - Lunes y miércoles por la mañana en casa, 60 min.
  - Tardes de lunes y jueves solo en el rocódromo, 90 min.
  - Martes por la tarde con gente, 120 min.

  Criterios en la fuerza:
  - La vía al límite cae en el martes en todas las semanas de fuerza sin descarga y sin un test que la desplace.
  - Las multipresas intensas no caen en la víspera del martes.
  - Ningún hueco se queda vacío sin una regla o un cupo que lo explique.
  - Nunca hay dos sesiones de carga alta el mismo día.
- **Propiedades:**
  - Determinista.
  - Ninguna sesión del plan viola una regla de seguridad con el historial más el plan.
  - Con un solo hueco, el resultado es el del generador actual.
  - Con todas las sesiones del plan en el historial a la vez, ninguna viola una regla de seguridad.
- **Regla P-68:** prueba propia en `seguridad.test.ts`.

## 9. Tras las revisiones (2026-10-27)

Una revisión de código y otra de producto (44 semanas simuladas con variantes) llevaron a estos cambios:

- **Decisiones de Diego:**
  - Los cupos de la fase se cuentan por **semana natural**, de lunes a domingo, en el generador y en el plan (P-30). Las reglas de seguridad siguen en ventanas móviles.
  - El **hombro** tiene tope: como mucho 2 por semana y una vez al día, como sesión o como complemento (P-41).
  - El **ámbar** con dos sesiones al día:
    - P-45 pide ámbar en 2 días distintos.
    - Una zona que no aparece en un registro toma el valor del chequeo de ese día.
    - La app precargará en el registro las molestias del chequeo, en el tramo de «Mi semana».
- **Búsqueda:**
  - Se abre una rama por cada opción de carga alta de un hueco, otra por la mejor suave y, si esa suave lleva dominadas, otra con la misma sin dominadas (P-39).
  - Se poda una rama cuando ni en el mejor caso puede superar al reparto actual.
  - Las llamadas internas usan los últimos 75 días de historial, que es lo que miran las reglas, como mucho 70 días (P-08). La sesión de hoy se recalcula con el historial completo.
  - Medido: unos 300 ms con 8 huecos y un año de historial. Tras añadir las ramas del rocódromo (abajo), unos 650-750 ms en el peor caso (8 huecos); casi no crece con el historial. Para una app de un solo usuario se acepta; el test de presupuesto pide menos de 1,5 s.
- **Ids `semana-*`:** reservados en el historial, como `propuesta-*`.
- **Textos:**
  - Las explicaciones usan nombres en español (`motor/nombres.ts`, que la app reexporta) y dicen «pide N por semana y esta semana llevas M».
  - Las alternativas avisan de que elegirlas puede cambiar el resto de la semana (`plan.semana-alternativa`).
- **Desviación del §4.1:** no se ofrece «nada» como opción de un hueco que tiene sesiones posibles. Con las reglas actuales no mejora ningún reparto, porque descansar a propósito no desbloquea nada que no desbloquee una sesión suave. Por eso tampoco existe el caso «hoy descansas para…» del §6.
- **El rocódromo manda** (decisión de Diego: «priorizar siempre el rocódromo y hacer las mejores sesiones ahí»):
  - Tras el vector de cupos, desempatan las sesiones de carga alta fuera de casa, después los minutos fuera de casa y por último los minutos totales.
  - En un hueco de rocódromo o roca no se deja la tarde vacía por el descanso recomendado (P-16): se prueban sus alternativas suaves, y si no hay ninguna suave entre las primeras opciones, se pide la mejor suave.
  - Un hueco cuyas opciones son todas de carga alta también se puede dejar libre. Si queda libre el hueco pedido, la principal es no entrenar (`plan.semana-libre`) y las alternativas son solo suaves.
- **`huecos: []`** (último hueco de la semana) también usa el plan, para que estas reglas valgan en ese hueco. Sin `huecos`, el generador de siempre.
- **Con una zona en rojo no se planifica:** se devuelve la propuesta de siempre.
- **Descanso:** cuando la principal sale del plan, la respuesta no lleva `descanso`.

