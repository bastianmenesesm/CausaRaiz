// Síntesis con Azure AI Speech (plan gratuito F0: 500.000 caracteres/mes).
// La emoción se logra con SSML: velocidad, tono, volumen y pausas según el ánimo,
// y con estilos emocionales (mstts:express-as) solo si la voz elegida los soporta.
import type { Animo, Personaje } from '../src/types';

export interface VozAzure {
  ShortName: string;
  DisplayName: string;
  LocalName: string;
  Gender: 'Female' | 'Male';
  Locale: string;
  StyleList?: string[];
  VoiceType?: string;
}

/** Ajustes de prosodia por emoción (en %, relativos a la voz base del personaje). */
const PROSODIA: Record<Animo, { rate: number; pitch: number; volume: number }> = {
  furioso: { rate: 12, pitch: 6, volume: 30 },
  molesto: { rate: 5, pitch: -2, volume: 12 },
  nervioso: { rate: 10, pitch: 8, volume: 0 },
  asustado: { rate: -8, pitch: 10, volume: -20 },
  defensivo: { rate: 4, pitch: 2, volume: 5 },
  neutral: { rate: 0, pitch: 0, volume: 0 },
  cooperador: { rate: 0, pitch: 2, volume: 0 },
  aliviado: { rate: -6, pitch: 0, volume: -5 },
  entusiasta: { rate: 10, pitch: 10, volume: 10 },
  triste: { rate: -14, pitch: -8, volume: -15 },
};

/** Estilos de Azure que se intentan (en orden) para cada emoción, si la voz los tiene. */
const ESTILOS: Record<Animo, string[]> = {
  furioso: ['angry', 'shouting'],
  molesto: ['disgruntled', 'unfriendly', 'angry'],
  nervioso: ['fearful', 'embarrassed'],
  asustado: ['terrified', 'fearful'],
  defensivo: ['serious', 'unfriendly'],
  neutral: [],
  cooperador: ['friendly', 'chat'],
  aliviado: ['gentle', 'calm'],
  entusiasta: ['excited', 'cheerful'],
  triste: ['sad', 'depressed'],
};

const limitar = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const pct = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v)}%`;

function escapar(t: string) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Pausas naturales: puntos suspensivos y muletillas. */
function conPausas(t: string) {
  return escapar(t)
    .replace(/(\.\.\.|…)/g, '…<break time="420ms"/>')
    .replace(/\b(Eh|Mmm|Uf|Uy|Ah|Bueno)([,.])/g, '$1$2<break time="250ms"/>');
}

export function construirSSML(p: Personaje, voz: VozAzure, animo: Animo, parrafos: string[]) {
  // Voz base del personaje (sus valores de tono/velocidad), más el ajuste por emoción.
  const baseTono = (p.voz.tono - 1) * 60;
  const baseVel = (p.voz.velocidad - 1) * 50;
  const e = PROSODIA[animo];
  const rate = pct(limitar(baseVel + e.rate, -30, 35));
  const pitch = pct(limitar(baseTono + e.pitch, -25, 25));
  const volume = pct(limitar(e.volume, -30, 40));
  const estilo = ESTILOS[animo].find((s) => voz.StyleList?.includes(s));
  const cuerpo = parrafos.map((t) => conPausas(t)).join('<break time="500ms"/>');
  const prosodia = `<prosody rate="${rate}" pitch="${pitch}" volume="${volume}">${cuerpo}</prosody>`;
  const interior = estilo ? `<mstts:express-as style="${estilo}" styledegree="1.4">${prosodia}</mstts:express-as>` : prosodia;
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${voz.Locale}">` +
    `<voice name="${voz.ShortName}">${interior}</voice></speak>`
  );
}

export function baseAzure(region: string) {
  return process.env.AZURE_SPEECH_BASE_URL ?? `https://${region}.tts.speech.microsoft.com`;
}

export async function listarVocesAzure(region: string, key: string): Promise<VozAzure[]> {
  const r = await fetch(`${baseAzure(region)}/cognitiveservices/voices/list`, { headers: { 'Ocp-Apim-Subscription-Key': key } });
  if (r.status === 401 || r.status === 403) throw Object.assign(new Error('Clave o región de Azure incorrecta'), { status: r.status, cuerpo: await r.text() });
  if (!r.ok) throw new Error(`Azure respondió ${r.status} al listar voces: ${await r.text()}`);
  return (await r.json()) as VozAzure[];
}

export async function sintetizarAzure(region: string, key: string, ssml: string, formato: string) {
  return fetch(`${baseAzure(region)}/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': formato,
      'User-Agent': 'simulador-causa-raiz',
    },
    body: ssml,
  });
}
