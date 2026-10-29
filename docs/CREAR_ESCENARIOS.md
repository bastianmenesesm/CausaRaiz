# Cómo crear un caso nuevo

Cada caso es un archivo TypeScript en `src/data/`. La forma más rápida es **copiar uno existente** (por ejemplo `ultimaMilla.ts`), renombrarlo y editar su contenido.

## 1. Diseña la historia antes de escribir

Escribe primero, en papel, la cadena de porqués de la solución. Ejemplo:

1. Problema visible en un indicador (y desde qué día)
2. Causa física directa
3. Causa técnica
4. Qué cambió en la operación
5. **Causa raíz**: un proceso, política o coordinación que falta (no una persona)

Luego decide:

- **Pistas en los datos**: indicadores que cambian el mismo día que el problema, y otros que **no** cambian (sirven para descartar hipótesis).
- **Distractores**: 2 o 3 eventos que parecen culpables pero no lo son (un evento de un solo día, algo que ocurrió antes del inicio del problema, una opinión de la jefatura).
- **Quién sabe qué**: reparte la verdad entre 6 o 7 personajes. Nadie debe contarla completa.

## 2. Partes del archivo

| Campo | Qué es |
|---|---|
| `id`, `tipo`, `titulo`, `empresa`, `ubicacion`, `resumen`, `color` | Datos de la portada |
| `briefing` | Lo que dice quien encarga el análisis (`personajeId` debe existir en `personajes`) |
| `kpis` | Lista de indicadores: `key`, `nombre`, `unidad`, `mayorEsMejor`, `decimales`, `formato` (`'pct'`, `'hora'`, `'clp'` o nada), `grupo`, `descripcion` |
| `kpisIniciales` | Los dos indicadores que se grafican al abrir el tablero |
| `dias` | 30 filas con un valor por cada `key`. Lo normal es generarlas con la función `generarDias()` |
| `bitacora` | Eventos del período (`dia`, `area`, `texto`). Mezcla pistas y ruido |
| `personajes` | Ver abajo |
| `opcionesCausa` | 6 o 7 afirmaciones para la validación. `nivel`: `'raiz'` (solo una), `'intermedia'`, `'sintoma'` o `'distractor'`. `retro` es lo que se lee al elegirla |
| `solucion` | `cadena` (porqués de referencia), `ishikawa` (causas por categoría), `explicacion` e `ideasReferencia` |

## 3. Personajes

```ts
{
  id: 'luis',
  nombre: 'Luis Pizarro',
  cargo: 'Conductor',
  organizacion: 'Transportes X',
  tipo: 'Trabajador',            // 'Trabajador' | 'Jefatura' | 'Cliente' | 'Proveedor'
  personalidad: 'Veterano gruñón…',
  animoInicial: 'molesto',       // furioso, molesto, nervioso, asustado, defensivo, neutral, cooperador, aliviado, entusiasta, triste
  color: '#a0522d',
  voz: { genero: 'm', tono: 0.8, velocidad: 0.9 },   // tono 0.5–2, velocidad 0.6–1.6
  saludo: ['Lo primero que dice…'],
  preguntas: [
    { id: 'l1', texto: '¿Cómo es su recorrido?', respuesta: ['Párrafo 1', 'Párrafo 2'] },
    { id: 'l2', texto: 'Repregunta…', requiere: ['l1'], animo: 'cooperador', clave: true, respuesta: ['…'] },
  ],
}
```

- `requiere`: la pregunta aparece solo después de hacer esas otras (repregunta).
- `animo`: cambia el estado de ánimo del personaje después de responder.
- `clave: true`: marca para uso docente (no se muestra al alumno).
- Los `id` de pregunta deben ser únicos dentro de cada personaje.

Consejos para las voces: tono bajo (0.8) y velocidad alta (1.2) suena enojado; tono alto (1.15) y velocidad baja (0.9) suena nervioso.

## 4. Activar el caso

En `src/data/index.ts` importa el archivo y agrégalo a la lista `ESCENARIOS`. Prueba con `npm run dev` y luego haz *Commit* + *Push*.
