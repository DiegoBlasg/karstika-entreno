# Batería de tests sin dinamómetro

Fecha: 2026-11-01 · Rama: `bateria-tests` · Base: `docs/evidencia/informe-2026-10-31-tests-ejercicios.md` (§«La batería propuesta»)

## Decisiones de Diego (2026-11-01)

1. La resistencia del test pasa del **7:3 al 60 %** al **colgado continuo en canto de 30 mm a peso corporal, hasta
   soltar** (batería IRCRA; r 0,81-0,87 con el grado). Los 7:3 antiguos se conservan, pero la tendencia de resistencia
   empieza una serie nueva.
2. El **power slap** entra en el test de dedos del rocódromo.
3. **Dominadas máximas** y **apertura de cadera (straddle)** van en un **«test en casa»** aparte (~15 min), que el
   entrenador propone una mañana en casa en los 10 días siguientes al test de dedos.
4. **Cambio real** por prueba: fuerza ≥ 10 %, colgado ≥ 25 %, power slap ≥ 10 cm, dominadas ≥ 2, cadera ≥ 3 cm
   (menos es mejor), o la misma dirección en 3 tests seguidos.

## 1. Test de dedos (rocódromo, ~45 min)

Bloques: calentamiento → subida de carga → suspensión máxima de 10 s en 20 mm (como ahora) → descanso → **colgado
continuo en 30 mm** → **power slap**.

- Colgado continuo: a peso corporal, hasta soltar. Si no llegas a 10 s, repítelo con descarga (polea o pies) y apunta
  los segundos (nota de la ficha). En el cronómetro es un paso `fallo` **continuo** (`trabajoS` = 600, sin descanso,
  `continuo: true`): cuenta hacia arriba el tiempo colgado y lo guarda con «No puedo más».
- Power slap: paso manual, «3 intentos, vale el mejor»: desde colgado en barra o presas grandes, dominada explosiva y
  palmada lo más alto posible sobre una cinta métrica en la pared; se apunta la altura en cm por encima de la mano.
- Resultado al final (`FormularioResultadoTest`): lastre del mejor intento, **segundos colgado (30 mm)**, **power slap
  (cm)** y técnica 1-7. Se quita el campo del 7:3 y la carga del 7:3 del cronómetro.
- Sin tiempo para el bloque de resistencia (como hoy): solo la máxima.

## 2. Test en casa (`test-casa`, nuevo tipo, ~15 min)

- Bloques: calentamiento en barra (5 min) → dominadas estrictas máximas (manual) → apertura de cadera (manual).
  Suave; no cuenta como carga alta ni en cupos.
- Lugar: casa.
- Cuándo: si en los 10 días anteriores hay una sesión de `evaluacion-dedos` y no hay `test-casa` desde entonces, y el
  contexto es casa, el motor lo propone como **principal** (por delante del resto); las alternativas siguen siendo las
  de siempre.
- Al terminar en el cronómetro: formulario «Resultado del test en casa» (dominadas, cm de cadera) que guarda en
  `pruebas_casa` con la fecha de hoy.

## 3. Datos

Migración `007_bateria_tests.sql`:
- `evaluaciones` + `colgado_30_s double precision check (colgado_30_s > 0 and colgado_30_s <= 3600)` y
  `power_slap_cm double precision check (power_slap_cm >= 0 and power_slap_cm <= 300)`.
- Tabla `pruebas_casa (id uuid pk, fecha date unique not null, dominadas integer check (0..100),
  cadera_cm double precision check (0..200), creada_en timestamptz default now())`, al menos uno de los dos no nulo.
- La rama `escaladas` renumerará su migración a 008.

`EvaluacionDedos` (motor) gana `colgado30S?` y `powerSlapCm?`. `DatosAtleta` gana `pruebasCasa`.

## 4. Progreso y cambio real

- `P-19` gana los umbrales: `{ fuerzaPct: 10, colgadoPct: 25, powerSlapCm: 10, dominadas: 2, caderaCm: 3, tecnicaPuntos: 1 }`.
- `diagnosticar`: fuerza con 10 % (antes 5 %) y resistencia con la serie del **colgado 30 mm** (25 %); el resto igual
  (3 tests, las 2 últimas confirman, o la misma dirección en 3 seguidos).
- Progreso: tarjeta **«Tus tests»** con una fila por prueba (fuerza % del peso, colgado s, power slap cm, dominadas,
  cadera cm): último valor, cambio desde el anterior y «cambio real» si supera su umbral (o 3 seguidos en la misma
  dirección). Debajo, en pequeño, «7:3 antiguos: …» si los hay.
- Progreso permite apuntar a mano: el formulario de evaluación gana colgado y power slap; uno nuevo «Test en casa».

## 5. Pruebas

Motor (plantilla del test con colgado y power slap; `test-casa` y cuándo se propone; umbrales de P-19 en el
diagnóstico), cronómetro (fallo continuo), datos (`pruebas_casa`, cambio real por prueba), `probar-bd` (checks
nuevos), e2e del test guiado con los campos nuevos.
