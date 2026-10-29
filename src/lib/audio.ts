// Reproducción de las voces grabadas (archivos MP3 en public/audio).
// Si un audio no existe o su texto cambió, se usa la voz del navegador.
import { huella } from './claves';

type Manifest = Record<string, { h: string }>;

let manifest: Manifest = {};
let cargado = false;
let actual: HTMLAudioElement | null = null;

export async function cargarManifest() {
  try {
    const r = await fetch('/audio/manifest.json', { cache: 'no-cache' });
    manifest = r.ok ? ((await r.json()) as Manifest) : {};
  } catch {
    manifest = {};
  }
  cargado = true;
  return Object.keys(manifest).length;
}

export function audiosCargados() {
  return cargado ? Object.keys(manifest).length : 0;
}

export function tieneAudio(clave: string | undefined, parrafos: string[]) {
  if (!clave) return false;
  const e = manifest[clave];
  return !!e && e.h === huella(parrafos);
}

export function detenerAudio() {
  if (actual) {
    actual.pause();
    actual.src = '';
    actual = null;
  }
}

/** Reproduce el MP3. Llama a onFin al terminar, o a onFalla si no se pudo reproducir. */
export function reproducirAudio(clave: string, onFin: () => void, onFalla: () => void) {
  detenerAudio();
  const a = new Audio(`/audio/${clave}.mp3`);
  actual = a;
  a.onended = () => {
    if (actual === a) {
      actual = null;
      onFin();
    }
  };
  a.onerror = () => {
    if (actual === a) {
      actual = null;
      onFalla();
    }
  };
  a.play().catch(() => {
    if (actual === a) {
      actual = null;
      onFalla();
    }
  });
}
