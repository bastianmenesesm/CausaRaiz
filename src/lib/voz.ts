// Lectura en voz alta con la Web Speech API del navegador (gratis, sin servidor).
// Funciona mejor en Google Chrome o Microsoft Edge en Windows.
import type { Voz } from '../types';

const FEMENINAS = /(sabina|helena|laura|paulina|elvira|dalia|monica|mónica|paloma|lucia|lucía|elena|catalina|camila|francisca|marisol|paola|carmen|ximena|isabel|google español|female|mujer|salome|salomé|ines|inés|valentina|lia|lía|renata|luciana|sofia|sofía)/i;
const MASCULINAS = /(pablo|raul|raúl|jorge|alvaro|álvaro|gerardo|diego|enrique|juan|carlos|lorenzo|tomas|tomás|alonso|federico|male|hombre|andres|andrés|lucas|mateo|gonzalo|emilio|rodrigo)/i;

let cacheVoces: SpeechSynthesisVoice[] = [];

export function vozDisponible() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function cargarVoces(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!vozDisponible()) return resolve([]);
    const listar = () => {
      cacheVoces = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'));
      return cacheVoces;
    };
    const ya = listar();
    if (ya.length) return resolve(ya);
    const t = setTimeout(() => resolve(listar()), 1500);
    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(t);
      resolve(listar());
    };
  });
}

function prioridadIdioma(v: SpeechSynthesisVoice) {
  const l = v.lang.toLowerCase();
  if (l === 'es-cl') return 0;
  if (l === 'es-419' || l === 'es-us' || l === 'es-mx' || l === 'es-ar' || l === 'es-co') return 1;
  if (l === 'es-es') return 2;
  return 3;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Elige una voz del género pedido, distinta según el personaje cuando hay varias. */
export function elegirVoz(cfg: Voz, idPersonaje: string): SpeechSynthesisVoice | undefined {
  const voces = cacheVoces.length ? cacheVoces : [];
  if (!voces.length) return undefined;
  const re = cfg.genero === 'f' ? FEMENINAS : MASCULINAS;
  const otra = cfg.genero === 'f' ? MASCULINAS : FEMENINAS;
  let candidatas = voces.filter((v) => re.test(v.name));
  if (!candidatas.length) candidatas = voces.filter((v) => !otra.test(v.name));
  if (!candidatas.length) candidatas = voces;
  const mejor = Math.min(...candidatas.map(prioridadIdioma));
  // Preferimos las de mejor idioma, pero si hay pocas, mezclamos para variar.
  const top = candidatas.filter((v) => prioridadIdioma(v) === mejor);
  const pool = top.length >= 2 ? top : candidatas;
  return pool[hash(idPersonaje) % pool.length];
}

/** Divide el texto en frases cortas (Chrome corta las locuciones largas). */
function trozos(texto: string): string[] {
  const limpio = texto.replace(/[«»"“”]/g, '').replace(/\s+/g, ' ').trim();
  const partes = limpio.match(/[^.!?…]+[.!?…]*/g) ?? [limpio];
  const out: string[] = [];
  for (const p of partes) {
    const t = p.trim();
    if (!t) continue;
    if (t.length < 220) out.push(t);
    else out.push(...t.split(/,\s*/).map((x) => x.trim()).filter(Boolean));
  }
  return out;
}

let turno = 0;

export function detener() {
  turno++;
  if (vozDisponible()) window.speechSynthesis.cancel();
}

/** Lee varios párrafos en voz alta. Devuelve una promesa que termina al acabar (o al detener). */
export function hablar(parrafos: string[], cfg: Voz, idPersonaje: string, onFin?: () => void) {
  if (!vozDisponible()) {
    onFin?.();
    return;
  }
  detener();
  const miTurno = ++turno;
  const voz = elegirVoz(cfg, idPersonaje);
  const frases = parrafos.flatMap(trozos);
  let i = 0;
  const siguiente = () => {
    if (miTurno !== turno) return;
    if (i >= frases.length) {
      onFin?.();
      return;
    }
    const u = new SpeechSynthesisUtterance(frases[i++]);
    if (voz) {
      u.voice = voz;
      u.lang = voz.lang;
    } else {
      u.lang = 'es-CL';
    }
    u.pitch = cfg.tono;
    u.rate = cfg.velocidad;
    u.onend = siguiente;
    u.onerror = () => {
      if (miTurno === turno) siguiente();
    };
    window.speechSynthesis.speak(u);
  };
  // Pequeña espera: Chrome a veces ignora speak() justo después de cancel().
  setTimeout(siguiente, 60);
}

export const VOZ_NARRADOR: Voz = { genero: 'f', tono: 1, velocidad: 1 };
