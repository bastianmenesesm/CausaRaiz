# Simulador Causa Raíz · Logística

Simulador web para entrenar a estudiantes de logística en la identificación de causas raíz con **5W2H**, **Ishikawa (6M)** y **5 Porqués**, y en la priorización de mejoras con **lluvia de ideas** y **matriz de esfuerzo e impacto**.

Los grupos revisan 30 días de indicadores de una empresa ficticia de Santiago, entrevistan a trabajadores, jefaturas, clientes y proveedores (con guion, personalidad y voz) y entregan un informe en PDF.

## Casos incluidos

| Caso | Empresa ficticia | Problema visible |
|---|---|---|
| Última milla | Despachos Cordillera SpA (Quilicura) | Cae el % de entregas a tiempo y en primer intento |
| Primera milla | Transportes Maipo Frío Ltda. (Paine, Buin, Talagante → Pudahuel) | Rechazos de lechuga por temperatura en el CD |
| Almacenamiento | Distribuidora Ferretera Andes (CD Lampa) | Pedidos incompletos con la bodega llena |

Cada caso trae entre 6 y 7 personajes y unas 50 a 70 preguntas con repreguntas que se desbloquean.

## Recorrido del alumno (60 min)

1. Briefing (3′) · 2. Indicadores (8′) · 3. 5W2H (7′) · 4. Entrevistas (17′) · 5. Ishikawa (7′) · 6. 5 Porqués (6′) · 7. Validar causa raíz (2′) · 8. Lluvia de ideas (5′) · 9. Matriz esfuerzo/impacto (5′) · 10. Informe PDF

- El avance se guarda solo en el navegador del computador (localStorage). Si se recarga la página, no se pierde nada.
- Los personajes hablan con **voces grabadas** (humanas, con acento chileno y emoción) si las generas una vez, gratis, con el cuaderno de Google Colab (ver más abajo). Si falta algún audio, se usa la voz del navegador; en **Microsoft Edge** esas voces son neuronales y suenan bastante mejor que en Chrome. Se recomiendan audífonos para cada grupo.
- El PDF se genera con «Descargar PDF» → en el cuadro de impresión elegir **Guardar como PDF**.

---

## Paso a paso: de esta carpeta a Vercel

### 1. Probar en tu computador (opcional, recomendado)

Necesitas [Node.js](https://nodejs.org) versión 20.19 o superior (la versión LTS sirve).

```bash
npm install
npm run dev
```

Abre la dirección que aparece (normalmente http://localhost:5173).

### 2. Subir a GitHub con GitHub Desktop

1. Abre **GitHub Desktop**; el repositorio **CausaRaiz** debería aparecer con todos los archivos nuevos en la pestaña *Changes*.
2. Escribe un resumen, por ejemplo `Primera versión del simulador`, y presiona **Commit to main**.
3. Presiona **Publish repository** (o **Push origin** si ya estaba publicado).
   - Si quieres que los alumnos no vean el código, deja marcada la opción *Keep this code private*. Vercel funciona igual con repositorios privados.

> La carpeta `node_modules` y `dist` no se suben (están en `.gitignore`). Es correcto.

### 3. Desplegar en Vercel

1. Entra a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. **Add New… → Project**.
3. Busca el repositorio **CausaRaiz** y presiona **Import** (si no aparece, usa *Adjust GitHub App Permissions* y dale acceso).
4. Vercel detecta **Vite** automáticamente. Verifica:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - **No necesitas variables de entorno.**
5. Presiona **Deploy**. En 1 o 2 minutos tendrás una URL tipo `https://causa-raiz.vercel.app`.
6. (Opcional) En *Settings → Domains* puedes cambiar el nombre de la URL.

### 4. Actualizaciones

Cada vez que hagas *Commit* + *Push* en GitHub Desktop, Vercel vuelve a publicar solo.

---

## Voces humanas con emoción (100% gratis, se hace una sola vez)

Los diálogos (≈ 217 audios) se graban **una sola vez** y quedan como archivos MP3 en `public/audio/`. Vercel los publica junto al sitio, así que no hay costos ni claves.

La opción gratuita usa **Chatterbox**, un modelo de voz de código abierto (licencia MIT) que habla español y permite subir o bajar la intensidad emocional. Se ejecuta en **Google Colab**, que presta una GPU gratis con cualquier cuenta de Google, **sin tarjeta**. Cada respuesta se graba con la emoción del personaje en ese momento (furioso, asustado, aliviado…), y el acento chileno lo aportan **voces de referencia chilenas**:

- el dataset público de Google *Crowdsourced Chilean Spanish* (OpenSLR 71), que se descarga solo, o
- grabaciones tuyas o de colegas, de 10 a 20 segundos por personaje y siempre con su permiso. Con ellas cada personaje suena aún más distinto.

### Paso a paso

**A. En tu computador: preparar el guion** (ya viene incluido; repite este paso solo si cambias diálogos)

```bash
npm install
npm run voces -- --exportar
```

Esto actualiza `scripts/colab/guion-voces.json`.

**B. En Google Colab: grabar**

1. Entra a [colab.research.google.com](https://colab.research.google.com) con tu cuenta de Google.
2. **Archivo → Subir cuaderno** y elige `scripts/colab/Voces_CausaRaiz.ipynb` de la carpeta del proyecto.
3. **Entorno de ejecución → Cambiar tipo de entorno de ejecución → GPU T4 → Guardar.**
4. Ejecuta las celdas en orden con el botón ▶:
   1. **Preparar:** instala el modelo y conecta tu Google Drive (acepta los permisos). Si pide reiniciar la sesión, acepta y vuelve a ejecutar esta celda.
   2. **Cargar el guion:** se descarga solo desde GitHub (si el repositorio es privado, deja la dirección vacía y sube `scripts/colab/guion-voces.json`).
   3. **Voces de referencia:** deja «Dataset chileno de Google» o elige «Mis propias grabaciones» y sube archivos con el nombre del personaje (`jonathan.m4a`, `rosa.mp3`…). Muestra qué voz quedó asignada a cada personaje.
   4. **(Opcional) Escuchar locutores y cambiar voces:** para elegir otra voz, escribe por ejemplo `luis=clm_08784`.
   5. **Motor de voz:** carga el modelo (≈ 1 minuto).
   6. **Prueba:** graba los 23 saludos y los reproduce ahí mismo. Si una voz no te convence, cámbiala en la celda 4 y repite la 6.
   7. **Grabar todo:** de 1 a 2 horas. Puedes dejarlo corriendo con la pestaña abierta. Si Colab se desconecta, ejecuta otra vez las celdas 1, 2, 3, 5 y 7: continúa donde quedó, porque todo se guarda en Drive (`CausaRaiz_voces`).
   8. **Descargar:** baja `audio.zip`.

**C. En tu computador: publicar**

1. Descomprime `audio.zip` en **`public/audio`** dentro del proyecto. Debe quedar `public/audio/manifest.json` junto a las carpetas `ultima-milla`, `primera-milla` y `almacenamiento`.
2. Escucha con `npm run dev` (http://localhost:5173 → un caso → Entrevistas).
3. En GitHub Desktop haz **Commit** y luego **Push**. Vercel publica las voces solo.

> El plan gratuito de Colab no garantiza GPU todo el tiempo. Si aparece «no hay GPU disponible», inténtalo más tarde.
> Si usas el dataset de Google, mantén el archivo `CREDITOS.txt` que viene en el zip, que da crédito a sus autores.

### Sin grabar nada (también gratis)

Si un audio no existe, la app usa la voz del navegador. En **Microsoft Edge** esas voces son neuronales y hay dos chilenas (Catalina y Lorenzo): suenan bastante humanas, aunque sin emoción.

### Opciones de pago (no necesarias)

El script `npm run voces` también puede grabar con servicios de pago: ElevenLabs, que es la voz más expresiva; OpenAI; o Azure, que exige una cuenta con tarjeta. Todos requieren una clave de API.

#### ElevenLabs (de pago: la más humana y expresiva)

Usa el modelo *Eleven v3*, que actúa emociones, suspiros y risas.

1. Crea una cuenta en [elevenlabs.io](https://elevenlabs.io). Para ~45.000 créditos necesitas un plan pagado por **un mes** (revisa en *Pricing* el más barato que los cubra; después puedes cancelarlo).
2. **Elige voces chilenas** (muy recomendado): en *Voice Library* filtra por *Spanish* y acento *Chilean* (o *Latin American*). Escucha y presiona **Add to my voices** en unas 4 mujeres y 6 hombres de distintas edades.
3. En *Developers → API Keys* crea una clave.
4. Abre una terminal en la carpeta (en GitHub Desktop: *Repository → Open in Command Prompt*) y ejecuta:

   ```bash
   npm install
   npm run voces -- --proveedor elevenlabs --listar-voces
   ```

   La primera vez te pedirá la clave de API: pégala y responde `s` para guardarla en `.env.local` (ese archivo **no** se sube a GitHub).

   Copia el `voice_id` de cada voz en `scripts/voces.config.json`, sección `elevenlabs.voces`, junto al personaje que quieras (la lista de personajes está en la guía docente). Si dejas alguno vacío, el script asigna automáticamente una voz de tu cuenta del mismo género.
5. **Prueba primero** (solo los saludos, ~3.000 créditos):

   ```bash
   npm run voces -- --proveedor elevenlabs --prueba
   npm run dev
   ```

   Abre la app, entra a Entrevistas y escucha a cada personaje. Si una voz no te convence, cambia su `voice_id` y repite con `npm run voces -- --proveedor elevenlabs --personaje jonathan --forzar`.
6. Genera todo:

   ```bash
   npm run voces -- --proveedor elevenlabs
   ```

   El script muestra el costo estimado y pide confirmación. Si se corta, vuelve a ejecutarlo: continúa donde quedó.

#### OpenAI (de pago, pero muy barata)

Usa `gpt-4o-mini-tts` con instrucciones de acento y emoción. Todo cuesta menos de 1 dólar, aunque suena menos chileno y menos expresivo que ElevenLabs.

1. Crea una clave en [platform.openai.com](https://platform.openai.com) (requiere cargar saldo, basta con el mínimo).
2. Ejecuta `npm run voces -- --proveedor openai --prueba`, pega la clave cuando la pida, escucha en la app (`npm run dev`) y luego ejecuta `npm run voces -- --proveedor openai`.

> OpenAI anunció el retiro de este modelo para enero de 2027. Los audios que ya generaste siguen funcionando para siempre: el retiro solo impide generar audios nuevos.

### Si cambias un guion

Cada audio guarda una huella de su texto. Si editas una respuesta en `src/data/`, la app usa la voz del navegador para esa línea hasta que vuelvas a grabarla: ejecuta `npm run voces -- --exportar`, sube el guion nuevo en la celda 2 de Colab (marca «subir_nuevo») y ejecuta la celda 7, que graba **solo** lo que cambió.

La portada indica que las voces fueron generadas con inteligencia artificial, como exigen los proveedores.

## Antes de la clase

- Prueba el audio en un computador del laboratorio. Con las voces grabadas basta cualquier navegador; sin ellas, usa Edge (voces neuronales) o revisa que Windows tenga una voz en español (Configuración → Hora e idioma → Voz).
- Si dos grupos usan el mismo computador para el mismo caso, el segundo debe presionar **Reiniciar caso** en la portada.
- Los grupos pueden desactivar la «Voz automática» en la barra superior y escuchar solo cuando presionen ▶.

## Estructura del proyecto

```
src/
  data/            ← los casos (indicadores, bitácora, personajes, guiones, solución)
    ultimaMilla.ts
    primeraMilla.ts
    almacenamiento.ts
    index.ts       ← lista de casos activos
  pasos/           ← cada pantalla del recorrido
  components/      ← Ishikawa, matriz, cuaderno, avatar, voz
  lib/             ← generación de datos, voz, audio grabado, guardado local
    data/actuacion.ts ← dirección actoral de cada personaje (para las voces)
scripts/
  colab/Voces_CausaRaiz.ipynb ← cuaderno GRATUITO para grabar las voces en Google Colab
  colab/guion-voces.json      ← guion que se sube al cuaderno (npm run voces -- --exportar)
  generar-voces.ts     ← exporta el guion / graba con servicios de pago
  voces.config.json    ← qué voz usa cada personaje
public/audio/          ← audios generados (MP3) + manifest.json
docs/
  CREAR_ESCENARIOS.md  ← cómo escribir un caso nuevo
```

La guía docente con las soluciones se entrega aparte (no está en el repositorio) para que los alumnos no la encuentren en GitHub.

## Tecnología

React 19 + TypeScript + Vite 7, gráficos con Recharts. Sitio 100% estático: sin base de datos, sin login y sin costos de API durante el uso (las voces se generan una vez, antes de publicar).
