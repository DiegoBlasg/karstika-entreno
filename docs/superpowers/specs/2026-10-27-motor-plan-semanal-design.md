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
- **Sin `huecos`, o con `huecos: []`:** el comportamiento es exactamente el actual. Se comprueba con las pruebas existentes, que no cambian.

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
3. **Puntuación** de un reparto, incluyendo la sesión pedida:
   - Por cada tipo con cupo en la fase, `min(sesiones del tipo en los 7 días que acaban en el último hueco, cupo)`
     × peso de prioridad.
   - El peso de prioridad es la longitud de `fase.prioridad` menos la posición del tipo, para que un puesto
     más alto valga más.
   - Las sesiones de carga alta solo puntúan dentro del cupo, como hoy.
   - Desempate 1: más minutos totales de sesión.
   - Desempate 2: lo más prioritario, antes en la semana.
   - Desempate 3: orden lexicográfico de los tipos, para que el resultado sea determinista.
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
  - Quitar un hueco nunca sube la puntuación.
- **Regla P-68:** prueba propia en `seguridad.test.ts`.
