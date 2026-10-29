// Claves de audio y huella de texto. Las usa tanto la app como el
// script que genera las voces, así ambos se ponen de acuerdo.
import type { Animo, Personaje, Pregunta } from '../types';

export const claveAudio = {
  briefing: (esc: string) => `${esc}/briefing`,
  saludo: (esc: string, p: string) => `${esc}/${p}/saludo`,
  respuesta: (esc: string, p: string, q: string) => `${esc}/${p}/${q}`,
  retro: (esc: string, o: string) => `${esc}/retro/${o}`,
  explicacion: (esc: string) => `${esc}/explicacion`,
};

/** Huella FNV-1a del texto: si el guion cambia, el audio antiguo deja de usarse. */
export function huella(parrafos: string[]) {
  const s = parrafos.join('\n');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Ánimo con que el personaje dice una respuesta (el de la pregunta, o el que traía). */
export function animoRespuesta(p: Personaje, q: Pregunta): Animo {
  let actual: Pregunta | undefined = q;
  const vistos = new Set<string>();
  while (actual && !vistos.has(actual.id)) {
    if (actual.animo) return actual.animo;
    vistos.add(actual.id);
    const previa: string | undefined = actual.requiere?.[actual.requiere.length - 1];
    actual = previa ? p.preguntas.find((x) => x.id === previa) : undefined;
  }
  return p.animoInicial;
}
