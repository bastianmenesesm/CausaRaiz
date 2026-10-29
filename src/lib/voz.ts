// Voces de los personajes.
// 1) Si existe el audio grabado (public/audio), se reproduce el MP3 (voz humana con emoción).
// 2) Si no, se usa la voz del navegador, prefiriendo las voces neuronales «Natural»
//    de Microsoft Edge (hay voces chilenas: Catalina y Lorenzo).
import type { Voz } from '../types';
import { detenerAudio, reproducirAudio, tieneAudio } from './audio';

const FEMENINAS = /(sabina|helena|laura|paulina|elvira|dalia|monica|mónica|paloma|lucia|lucía|elena|catalina|camila|francisca|marisol|paola|carmen|ximena|isabel|google español|female|mujer|salome|salomé|ines|inés|valentina|lia|lía|renata|luciana|sofia|sofía|ana\b|tania|karina|yolanda|andrea|beatriz|estrella|irene|larissa|marta|nuria|triana|vera|abril|belkys|lupe|penelope|teresa|sara)/i;
const MASCULINAS = /(pablo|raul|raúl|jorge|alvaro|álvaro|gerardo|diego|enrique|juan|carlos|lorenzo|tomas|tomás|alonso|federico|male|hombre|andres|andrés|lucas|mateo|gonzalo|emilio|rodrigo|alex\b|arnau|dario|darío|elias|elías|gerardo|liberto|nil|saul|saúl|teo|cecilio|luciano|mario|sebastian|sebastián|victor|víctor|kevin|roberto|rogelio|yago|marcelo|carlos)/i;
const LATAM = ['es-cl', 'es-ar', 'es-uy', 'es-pe', 'es-bo', 'es-co', 'es-ve', 'es-ec', 'es-mx', 'es-us', 'es-419', 'es-py', 'es-cr', 'es-pa', 'es-do', 'es-gt', 'es-hn', 'es-ni', 'es-sv', 'es-pr', 'es-cu'];

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

export const esNatural = (v: SpeechSynthesisVoice) => /natural|neural|online/i.test(v.name) && !/google/i.test(v.name);

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Elige una voz del género pedido, distinta según el personaje cuando hay varias. */
export function elegirVoz(cfg: Voz, idPersonaje: string): SpeechSynthesisVoice | undefined {
  const voces = cacheVoces;
  if (!voces.length) return undefined;
  const re = cfg.genero === 'f' ? FEMENINAS : MASCULINAS;
  const otra = cfg.genero === 'f' ? MASCULINAS : FEMENINAS;
  let delGenero = voces.filter((v) => re.test(v.name));
  if (!delGenero.length) delGenero = voces.filter((v) => !otra.test(v.name));
  if (!delGenero.length) delGenero = voces;

  const lang = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-');
  const naturales = delGenero.filter(esNatural);
  // 1° voz neuronal chilena, luego otras neuronales latinoamericanas, luego cualquier neuronal
  const chilenas = naturales.filter((v) => lang(v) === 'es-cl');
  const latam = naturales.filter((v) => LATAM.includes(lang(v)));
  let pool: SpeechSynthesisVoice[];
  if (chilenas.length) {
    // La mitad de los personajes usa la voz chilena; el resto se reparte entre otras latinoamericanas para variar
    const h = hash(idPersonaje);
    pool = h % 2 === 0 || latam.length <= chilenas.length ? chilenas : latam;
  } else if (latam.length) pool = latam;
  else if (naturales.length) pool = naturales;
  else {
    const orden = (v: SpeechSynthesisVoice) => (lang(v) === 'es-cl' ? 0 : LATAM.includes(lang(v)) ? 1 : 2);
    const mejor = Math.min(...delGenero.map(orden));
    pool = delGenero.filter((v) => orden(v) === mejor);
  }
  return pool[hash(idPersonaje + 'v') % pool.length];
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
  detenerAudio();
  if (vozDisponible()) window.speechSynthesis.cancel();
}

function hablarNavegador(parrafos: string[], cfg: Voz, idPersonaje: string, miTurno: number, onFin?: () => void) {
  if (!vozDisponible()) {
    onFin?.();
    return;
  }
  const voz = elegirVoz(cfg, idPersonaje);
  const natural = voz ? esNatural(voz) : false;
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
    // Las voces neuronales se deforman con cambios grandes de tono: los suavizamos.
    u.pitch = natural ? 1 + (cfg.tono - 1) * 0.45 : cfg.tono;
    u.rate = natural ? 1 + (cfg.velocidad - 1) * 0.7 : cfg.velocidad;
    u.onend = siguiente;
    u.onerror = () => {
      if (miTurno === turno) siguiente();
    };
    window.speechSynthesis.speak(u);
  };
  // Pequeña espera: Chrome a veces ignora speak() justo después de cancel().
  setTimeout(siguiente, 60);
}

/** Lee varios párrafos: con el audio grabado si existe, o con la voz del navegador. */
export function hablar(parrafos: string[], cfg: Voz, idPersonaje: string, onFin?: () => void, claveAudio?: string) {
  detener();
  const miTurno = ++turno;
  if (claveAudio && tieneAudio(claveAudio, parrafos)) {
    reproducirAudio(
      claveAudio,
      () => miTurno === turno && onFin?.(),
      () => miTurno === turno && hablarNavegador(parrafos, cfg, idPersonaje, miTurno, onFin),
    );
    return;
  }
  hablarNavegador(parrafos, cfg, idPersonaje, miTurno, onFin);
}

export const VOZ_NARRADOR: Voz = { genero: 'f', tono: 1, velocidad: 1 };
