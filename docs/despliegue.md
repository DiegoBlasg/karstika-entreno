# Despliegue de Karstika Entreno

Pasos que hace Diego a mano (una vez). La base de datos es Postgres de Neon; Supabase no se usa.

## 1. Base de datos (Neon)

1. Crea el proyecto en Vercel (paso 3) y, en su pestaña **Storage**, añade **Neon** (plan gratuito, región
   Frankfurt). Vercel crea `DATABASE_URL` en las variables del proyecto. También vale crear el proyecto directamente
   en neon.tech y copiar la cadena de conexión.
2. En la consola de Neon, crea una **rama** llamada `pruebas` a partir de `main`. Su cadena de conexión es
   `E2E_DATABASE_URL`. Las pruebas vacían esa rama; nunca uses la de `main` para pruebas.

## 2. `.env.local` (en tu ordenador, nunca en git)

    DATABASE_URL=postgresql://…(rama main)…
    E2E_DATABASE_URL=postgresql://…(rama pruebas)…
    CLAVE_ACCESO=<tu contraseña de la app>
    E2E_CLAVE_ACCESO=<otra contraseña, solo para pruebas>
    SECRETO_SESION=<40 caracteres aleatorios>

Para generar el secreto: `node -e "console.log(crypto.randomBytes(30).toString('base64url'))"`.

`CLAVE_ACCESO` tiene que ser **larga y aleatoria**: genérala igual que el secreto (el mismo comando) y guárdala en tu
gestor de contraseñas. La página de entrada es pública y el límite de 5 intentos por minuto y por IP vive **en
memoria y es por instancia**: se reinicia con cada despliegue y cada instancia de Vercel lleva su propia cuenta, así
que lo que de verdad frena la fuerza bruta es la entropía de la contraseña, no el límite.

Después:

    npm run migrar           # aplica el esquema en main
    npm run migrar:pruebas   # aplica el esquema en pruebas y la marca como base de pruebas
    npm run probar-bd        # comprueba las restricciones en pruebas
    npx playwright install chromium
    npm run e2e              # flujo completo contra pruebas

Salida esperada de `npm run probar-bd`: `base de datos correcta: 19 casos rechazados`.

Nota: `npm run migrar:pruebas` se niega a ejecutarse si la URL de pruebas apunta a la misma base de datos que
`DATABASE_URL` (incluso a través del host `-pooler`) o si la base ya contiene datos.

## 3. Vercel

1. El repo necesita estar en GitHub para conectarlo a Vercel (o se despliega con `npx vercel` desde el ordenador).
2. Nuevo proyecto en Vercel con este repo. Variables de entorno (Production): `CLAVE_ACCESO` y `SECRETO_SESION` (las
   mismas que en `.env.local` o nuevas); `DATABASE_URL` la pone Neon.
3. Antes de cada despliegue que traiga una migración nueva: `npm run migrar` con la `DATABASE_URL` de producción.
