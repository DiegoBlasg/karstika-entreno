# Fuerza y forma, y cardio suave

Fecha: 2026-11-05 · Rama: `fuerza-forma`

## Decisiones de Diego (2026-11-05)

1. Objetivo extra: verse fuerte y definido, **con la escalada mandando** (no quita sesiones ni rendimiento).
2. **Sin piernas**: las entrena en la montaña los fines de semana.
3. Alimentación: **consejos, sin contar calorías** (respetando P-58: ningún objetivo de peso ni de grasa).
4. Quiere **hacer algo que canse todos los días**: los días sin escalada, cardio suave; un día a la semana libre.
5. Fuerza y forma **2 días por semana** (el volumen semanal es lo que cuenta, no los días).

## 1. Datos

Migración `010_objetivo_estetico.sql`: `perfil.objetivo_estetico boolean not null default false`. En Yo: «También
quiero verme fuerte y definido». El motor lo recibe como `Peticion.objetivoEstetico`.

## 2. Tipos nuevos

- `fuerza-forma` («Fuerza y forma»), casa, suave para los dedos (no es carga alta), 35 min: calentamiento 5 min
  (movilidad de hombro y flexiones suaves), empuje 15 min (flexiones con progresión y pike push-ups, 3 series cada uno),
  core 15 min (hollow o L-sit según nivel, elevaciones de piernas colgado y plancha lateral, 3 series). Dosis: 6-15
  repeticiones a 1-3 del fallo; con 15 limpias, la variante siguiente. Sin tirón (ya lo dan la escalada y las
  dominadas) ni piernas (montaña).
- `cardio` («Cardio suave»), cualquier lugar: 30 o 45 min de correr, bici, andar rápido o montaña a ritmo de poder
  hablar. Suave, no es carga alta. Mejor bici o andar que correr para no restar fuerza (Wilson 2012).

## 3. Cuándo se proponen (P-77 y P-78)

- **Fuerza y forma** (solo con `objetivoEstetico`, en casa): como mucho 2 en la semana natural (lunes a domingo,
  contando las planificadas); nunca el mismo día ni el día antes de una sesión de carga alta del historial; no en
  descarga; no con hombro, codo o muñeca fuera del verde ni con el chequeo bajo. Va de principal si lo que había era
  hombro, dominadas o core y movilidad (lo que había pasa a alternativa); si lo que había es de escalada (multipresa,
  test en casa…), de alternativa; si tocaba descanso recomendado, de primera alternativa.
- **Cardio suave** (para todos): cuando la propuesta es descanso (salvo rojo o chequeo bajo), primera alternativa, y
  solo si en la semana natural quedaría al menos un día sin ninguna sesión.
- Como mucho 2 alternativas.

## 4. Consejos (P-57, P-58)

Con `objetivoEstetico`: proteína suficiente repartida (P-57); definir es sobre todo bajar algo de grasa, despacio, sin
pasar hambre y nunca en fase de fuerza ni la semana de un test, y hacer abdominales no quema la grasa de la tripa
(Vispute 2011); comer de menos baja el rendimiento y sube el riesgo de lesión (RED-S, P-58). Sin cifras ni objetivos de
peso.

## 5. Evidencia nueva

EV-FUERZA: volumen semanal (Schoenfeld, Ogborn y Krieger 2017, A), cargas bajas cerca del fallo (Schoenfeld et al. 2017,
A), flexiones como press (Kikuchi y Nakazato 2017, A), frecuencia con volumen igualado (Schoenfeld, Grgic y Krieger
2019, A), entrenamiento concurrente (Wilson et al. 2012, A). EV-RECUP: abdominales y grasa abdominal (Vispute et al.
2011, A). Todas no escaladores: extrapolación.

## 6. Biblioteca

Grupo «Fuerza y forma»: flexiones con progresión, flexiones diamante, pike push-up, L-sit, cardio suave (además de
hollow, elevaciones colgado y plancha lateral, que ya existen).

## 7. Pruebas

Plantillas (minutos, dosis, sin tirón ni piernas); reglas de cuándo (cupo, día antes de carga alta, descarga, zonas,
día libre de la semana); consejos; perfil y migración; e2e: activar el objetivo en Yo y ver «Fuerza y forma» en casa.
