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
- La voz usa la síntesis de voz del navegador: **gratis y sin servidor**. Funciona mejor en **Google Chrome** o **Microsoft Edge** en Windows. Se recomiendan audífonos para cada grupo.
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

## Antes de la clase

- Prueba la voz en un computador del laboratorio con Chrome o Edge. Si suena en inglés o no suena, revisa que Windows tenga instalada una voz en español (Configuración → Hora e idioma → Voz).
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
  lib/             ← generación de datos, voz, guardado local
docs/
  CREAR_ESCENARIOS.md  ← cómo escribir un caso nuevo
```

La guía docente con las soluciones se entrega aparte (no está en el repositorio) para que los alumnos no la encuentren en GitHub.

## Tecnología

React 19 + TypeScript + Vite 7, gráficos con Recharts. Sitio 100% estático: sin base de datos, sin login y sin costos de API.
