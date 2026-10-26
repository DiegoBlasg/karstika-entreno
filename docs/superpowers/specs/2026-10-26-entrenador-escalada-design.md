# Karstika Entreno — Diseño global

Fecha: 2026-10-26 · Estado: aprobado en brainstorming, pendiente de revisión escrita

## 1. Objetivo

App web personal que actúa como entrenador de escalada para pasar de **6b a 7a en vía deportiva en roca**.
Gestiona plan, semana, sesiones, evaluación, progreso y consejos. **Toda decisión de entrenamiento debe
estar respaldada por evidencia citada y trazable.**

### Usuario inicial (perfil de partida)

- Grado actual: 6b (deportiva). Objetivo: encadenar 7a deportiva en roca.
- Experiencia: < 2 años escalando, sin entrenamiento estructurado previo.
- Lesiones: ninguna.
- Material: rocódromo (bloque y vía), board de entrenamiento, multipresa en casa. No va a roca con frecuencia.
- Disponibilidad: **variable** cada semana → la planificación semanal es adaptativa.

### Alcance de usuarios

Uso personal al principio, pero **ampliable**: cuentas y datos aislados por usuario desde el día uno
(Supabase Auth + RLS por `user_id`). No se construye nada multiusuario más allá de eso (sin equipos, sin
roles de entrenador) hasta que haga falta.

### Fuera de alcance

- IA/LLM: el entrenador es **100 % reglas deterministas** (decisión explícita del usuario).
- Integración con Karstika (CRM del club): repo y proyecto Supabase independientes.
- Notificaciones push, social, wearables.

## 2. Base de evidencia

Catálogo de hallazgos como datos tipados en `evidencia/*.ts`, navegable en la app (Biblioteca).

Cada hallazgo:

| Campo | Contenido |
|---|---|
| `id` | p. ej. `EV-DEDOS-007` |
| `afirmacion` | enunciado concreto y comprobable |
| `fuentes[]` | autores, año, revista/libro, DOI o URL |
| `nivel` | **A** ensayo controlado/metaanálisis · **B** estudio observacional/fisiológico en escaladores · **C** consenso de entrenadores expertos / práctica establecida |
| `aplica_a` | nivel, años de experiencia, objetivo |
| `limitaciones` | tamaño de muestra, contradicciones, población |

**Regla de oro:** ninguna regla del motor existe sin al menos un hallazgo enlazado (verificado por test).
Las decisiones apoyadas solo en nivel C se muestran como tales, nunca como "ciencia".

### Bloques de investigación

1. Determinantes del rendimiento en deportiva (fuerza de dedos relativa, *critical force*, capacidad aeróbica del antebrazo).
2. Fuerza de dedos: suspensiones máximas, *repeaters*, *no-hangs*, regleta, agarres, seguridad en escaladores con poca experiencia.
3. Fuerza y potencia generales: dominadas lastradas, board, campus (prerrequisitos y contraindicaciones).
4. Resistencia: ARC/capacidad, resistencia de fuerza, 4x4, intervalos.
5. Técnica y aprendizaje motor: práctica deliberada, variabilidad, lectura de vía.
6. Táctica de proyecto y rendimiento en roca: pegues, descanso entre intentos, transferencia de sala a roca.
7. Periodización y carga: lineal / ondulante / bloques, RPE de sesión, descargas, interferencia.
8. Lesiones y prevención: poleas, codo, hombro, calentamiento, señales de alarma.
9. Recuperación y estilo de vida: sueño, nutrición básica, disponibilidad energética (RED-S), peso.

Método: investigación profunda en paralelo por bloque, priorizando estudios originales y revisiones;
contrastar afirmaciones de divulgación con su fuente primaria.

### Batería de evaluación (definida por los bloques 1–2)

Suspensión máxima a 20 mm (en % del peso corporal), dominada máxima lastrada, *critical force* o
intermitente 7:3, test de resistencia en pared y autoevaluación técnica guiada. Protocolos adaptados al
material disponible; reevaluación cada 6–8 semanas (cifra a confirmar por la investigación).

## 3. Arquitectura

- Repo: `D:\karstika-entreno`, independiente.
- Stack: Next.js (App Router; leer la documentación de la versión instalada en `node_modules/next/dist/docs/` antes de escribir código), Supabase (proyecto nuevo, RLS por `user_id`), Vercel, PWA instalable.

Tres capas con fronteras estrictas:

1. **`evidencia/`**: solo datos.
2. **`motor/`**: TypeScript puro, sin React ni Supabase. Funciones deterministas `entrada → { plan, explicacion }`.
3. **`app/`**: interfaz y persistencia. Llama al motor y no contiene lógica de entrenamiento.

### Modelo de datos

| Tabla | Contenido |
|---|---|
| `perfiles` | peso, años escalando, grado actual y objetivo, material, lesiones |
| `evaluaciones` | resultados de tests con fecha |
| `macrociclos`, `fases` | plan hasta la fecha objetivo y fases con fechas y objetivo |
| `semanas` | días disponibles y sesiones asignadas |
| `sesiones_plan` | sesión prescrita: ejercicios, series, cargas, `regla_ids` justificantes |
| `sesiones_registro` | lo realizado: cargas, RPE de sesión, duración, sensaciones, molestias (zona y dolor 0–10) |
| `escaladas` | vías/bloques: grado, estilo, roca/sala, pegues, notas de proyecto |
| `chequeo_diario` | sueño, fatiga, ganas, molestias |

Toda salida del motor se persiste junto con su explicación (`regla`, `evidencias[]`, `motivo`).

### Flujo

Perfil + evaluación → macrociclo → (días disponibles de la semana) → plan semanal → registro de cada
sesión → ajuste de la siguiente → reevaluación periódica → recalibración y cambio de fase.

## 4. Motor de decisión

Todas las cifras concretas (umbrales, porcentajes, descansos) **las fija la investigación**. Este diseño
fija la mecánica.

1. **Diagnóstico.** Compara los tests con perfiles de referencia publicados de escaladores de 6b–7a y obtiene puntuación y prioridad por limitante (dedos, resistencia de antebrazo, tirón, técnica, táctica/cabeza). Aplica un modificador por experiencia (< 2 años: más técnica y volumen, intensidad de dedos acotada).
2. **Macrociclo.** Fases: base técnica y adaptación tendinosa → fuerza → resistencia de fuerza → rendimiento y proyecto en roca, con descargas intercaladas. El modelo de periodización es configuración (no código) y lo elige el bloque 7. Duración por defecto de 16–24 semanas si no hay fecha objetivo (a confirmar).
3. **Planificador semanal.** Entrada: días disponibles y fase. Cada fase tiene una lista de sesiones por prioridad; **restricciones duras** (descanso mínimo entre sesiones intensas de dedos, máximo de días seguidos de carga alta) que nunca se violan, y **blandas** (intensidad antes que volumen, reparto de carga) que se optimizan. Determinista. Si recorta sesiones por falta de días, explica qué y por qué. Al mover una sesión manualmente, valida las restricciones y avisa.
4. **Autorregulación.** Progresión de carga según cumplimiento y RPE frente al objetivo. El chequeo diario puede sustituir una sesión intensa por técnica o volumen suave. **Semáforo de dolor:** por encima del umbral bloquea la carga afectada, muestra un protocolo y recomienda fisioterapeuta, sin diagnosticar. Descargas programadas o adelantadas por la tendencia de fatiga y RPE.
5. **Explicación.** Cada decisión lleva `{regla, evidencias[], motivo}` → botón "¿Por qué?".
6. **Consejos.** Catálogo con condiciones de activación (fase, víspera de roca, molestia registrada, estancamiento…), cada consejo ligado a evidencia. Temas: calentamiento, táctica de pegues, chapado, descanso entre intentos, sueño, nutrición, cabeza y caídas.

## 5. Pantallas (móvil primero)

1. **Hoy:** sesión del día con cargas exactas y motivo, chequeo de 10 s, botón "Empezar".
2. **Modo sesión:** temporizador (suspensiones, 4x4, ARC) y registro rápido por serie, RPE final, molestias.
3. **Semana:** calendario de 7 días, días disponibles, reparto automático, mover sesiones con validación.
4. **Plan:** línea temporal del macrociclo, fase actual, próxima reevaluación, fecha objetivo.
5. **Evaluación:** tests guiados con temporizador e histórico.
6. **Progreso:** fuerza de dedos relativa, CF, dominada, carga semanal (RPE × min), pirámide de grados (roca y sala), molestias en el tiempo, limitantes frente a la referencia de 7a.
7. **Escaladas:** registro de vías y bloques, fichas de proyecto en roca.
8. **Biblioteca:** ejercicios, consejos y la base de evidencia navegable.
9. **Perfil y ajustes.**

Primera vez: perfil → batería de tests en 2 sesiones → plan generado con explicación.
Sin conexión: la sesión del día se cachea; el registro va a una cola local que se sincroniza de forma idempotente.

## 6. Seguridad, errores y tests

- Aviso de que la app no sustituye a un médico ni a un fisioterapeuta.
- Límites de seguridad codificados en el motor (progresión semanal máxima, descanso mínimo de dedos, prerrequisitos de campus). No se pueden saltar desde la interfaz.
- Datos atípicos (saltos de carga o peso imposibles) requieren confirmación antes de que el motor los use.
- Validación en la interfaz y en la base de datos. Si no hay plan posible (p. ej., 0 días disponibles), se dice explícitamente.
- **Tests del motor:** unitarios por regla, escenarios completos, propiedades (determinismo, nunca se viola una restricción dura, toda decisión tiene evidencia).
- **Tests de evidencia:** referencias válidas, fuente y nivel presentes.
- **Tests de la app:** RLS (aislamiento entre usuarios) y e2e de los flujos clave (primera vez, Hoy, Semana).

## 7. Orden de construcción

Cada subproyecto tiene su propio ciclo de especificación, plan e implementación:

1. **Investigación:** base de evidencia completa + documento de conclusiones y decisiones del plan. Antes de cualquier código.
2. **Motor + tests:** TypeScript puro.
3. **App mínima:** perfil, evaluación, Hoy, modo sesión, Semana.
4. **Completar:** Plan, Progreso, Escaladas, Biblioteca, sin conexión y PWA.
