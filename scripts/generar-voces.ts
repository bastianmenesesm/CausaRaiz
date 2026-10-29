/* ─────────────────────────────────────────────────────────────
   Genera las voces grabadas de todos los personajes.

   Uso (desde la carpeta del proyecto):
     npm run voces -- --prueba            → solo los saludos (para escuchar las voces, barato)
     npm run voces                        → todo lo que falte o haya cambiado
     npm run voces -- --listar-voces      → (Azure / ElevenLabs) lista las voces disponibles
     npm run voces -- --exportar          → crea scripts/colab/guion-voces.json para la opción
                                            GRATUITA (Chatterbox en Google Colab). No usa clave.

   Opciones:
     --proveedor azure | elevenlabs | openai   (por defecto, el de scripts/voces.config.json)
     --caso ultima-milla                  solo un caso
     --personaje jonathan                 solo un personaje
     --forzar                             vuelve a generar aunque ya exista
     --si                                 no pide confirmación de costo
     --limpiar                            borra audios que ya no se usan

   La primera vez el script pide la clave de API y ofrece guardarla en
   .env.local (archivo que NO se sube a GitHub).
   ───────────────────────────────────────────────────────────── */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { ESCENARIOS } from '../src/data';
import { ACENTO, ACTUACION, EMOCION_CHATTERBOX, EMOCION_TAG, EMOCION_TEXTO, gestosElevenLabs } from '../src/data/actuacion';
import { animoRespuesta, claveAudio, huella } from '../src/lib/claves';
import type { Animo, Personaje } from '../src/types';
import { construirSSML, listarVocesAzure, sintetizarAzure, type VozAzure } from './azure';

type Proveedor = 'azure' | 'openai' | 'elevenlabs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIR_AUDIO = join(RAIZ, 'public', 'audio');
const RUTA_MANIFEST = join(DIR_AUDIO, 'manifest.json');
const RUTA_CONFIG = join(RAIZ, 'scripts', 'voces.config.json');

// ── Argumentos ────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (n: string) => args.includes('--' + n);
const opcion = (n: string) => {
  const i = args.indexOf('--' + n);
  return i >= 0 ? args[i + 1] : undefined;
};

// ── .env.local ────────────────────────────────────────────────
for (const f of ['.env.local', '.env']) {
  const ruta = join(RAIZ, f);
  if (!existsSync(ruta)) continue;
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// ── Configuración ─────────────────────────────────────────────
interface Config {
  proveedor: Proveedor;
  openai: { modelo: string; voces: Record<string, string> };
  elevenlabs: { modelo: string; estabilidad: number; formato: string; voces: Record<string, string> };
  azure: { region: string; formato: string; vozFemenina: string; vozMasculina: string; voces: Record<string, string> };
}
const config: Config = JSON.parse(readFileSync(RUTA_CONFIG, 'utf8'));
const proveedor = (opcion('proveedor') ?? config.proveedor) as Proveedor;
if (!['azure', 'openai', 'elevenlabs'].includes(proveedor)) salir(`Proveedor desconocido: ${proveedor}. Usa azure, elevenlabs u openai.`);

const BASE_OPENAI = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
const BASE_11 = process.env.ELEVENLABS_BASE_URL ?? 'https://api.elevenlabs.io';
const NOMBRE_KEY = proveedor === 'openai' ? 'OPENAI_API_KEY' : proveedor === 'azure' ? 'AZURE_SPEECH_KEY' : 'ELEVENLABS_API_KEY';
let KEY = process.env[NOMBRE_KEY];
let REGION = (process.env.AZURE_SPEECH_REGION ?? config.azure?.region ?? '').trim();
const NOMBRE_PROV = { azure: 'Azure Speech', openai: 'OpenAI', elevenlabs: 'ElevenLabs' }[proveedor];

/** Si no hay clave en .env.local, se pide en la terminal (y opcionalmente se guarda). */
async function asegurarClave() {
  const faltaRegion = proveedor === 'azure' && !REGION;
  if (KEY && !faltaRegion) return;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const nuevas: Record<string, string> = {};
  if (!KEY) {
    KEY = (await rl.question(`\nPega tu clave de ${NOMBRE_PROV} (${proveedor === 'azure' ? 'KEY 1' : 'API key'}) y presiona Enter: `)).trim();
    if (!KEY) salir('No se ingresó una clave.');
    nuevas[NOMBRE_KEY] = KEY;
  }
  if (faltaRegion) {
    REGION = (await rl.question('Escribe la región de tu recurso de Azure, tal como aparece en el portal (ej.: brazilsouth, eastus): ')).trim().toLowerCase().replace(/\s+/g, '');
    if (!REGION) salir('No se ingresó la región.');
    nuevas.AZURE_SPEECH_REGION = REGION;
  }
  const guardar = (await rl.question('¿Guardar estos datos en .env.local para no volver a escribirlos? Ese archivo no se sube a GitHub. (s/n) ')).trim().toLowerCase();
  rl.close();
  if (guardar.startsWith('s')) {
    const ruta = join(RAIZ, '.env.local');
    let previo = existsSync(ruta) ? readFileSync(ruta, 'utf8') : '';
    for (const k of Object.keys(nuevas)) previo = previo.replace(new RegExp(`^${k}=.*$\\r?\\n?`, 'm'), '');
    previo = previo.trim();
    writeFileSync(ruta, (previo ? previo + '\n' : '') + Object.entries(nuevas).map(([k, v]) => `${k}=${v}`).join('\n') + '\n');
    console.log('Guardado en .env.local');
  }
}

function salir(msg: string): never {
  console.error('\n✖ ' + msg + '\n');
  process.exit(1);
}

// ── Manifest ──────────────────────────────────────────────────
type Entrada = { h: string; proveedor: Proveedor; voz: string };
const manifest: Record<string, Entrada> = existsSync(RUTA_MANIFEST) ? JSON.parse(readFileSync(RUTA_MANIFEST, 'utf8')) : {};
function guardarManifest() {
  mkdirSync(DIR_AUDIO, { recursive: true });
  const ordenado = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(RUTA_MANIFEST, JSON.stringify(ordenado, null, 1));
}

// ── Lista de clips ────────────────────────────────────────────
interface Clip {
  clave: string;
  escenario: string;
  p: Personaje;
  parrafos: string[];
  animo: Animo;
  contexto: string;
  esSaludo: boolean;
}

function construirClips(): Clip[] {
  const out: Clip[] = [];
  for (const e of ESCENARIOS) {
    const g = e.personajes.find((p) => p.id === e.briefing.personajeId)!;
    out.push({ clave: claveAudio.briefing(e.id), escenario: e.id, p: g, parrafos: e.briefing.texto, animo: g.animoInicial, contexto: 'Le está explicando el problema a un equipo de analistas que acaba de llegar; está preocupada/o y apurada/o.', esSaludo: true });
    for (const p of e.personajes) {
      out.push({ clave: claveAudio.saludo(e.id, p.id), escenario: e.id, p, parrafos: p.saludo, animo: p.animoInicial, contexto: 'Es lo primero que dice cuando llegan a entrevistarle.', esSaludo: true });
      for (const q of p.preguntas) {
        out.push({ clave: claveAudio.respuesta(e.id, p.id, q.id), escenario: e.id, p, parrafos: q.respuesta, animo: animoRespuesta(p, q), contexto: `Le acaban de preguntar: «${q.texto}»`, esSaludo: false });
      }
    }
    for (const o of e.opcionesCausa) {
      out.push({ clave: claveAudio.retro(e.id, o.id), escenario: e.id, p: g, parrafos: [o.retro], animo: o.nivel === 'raiz' ? 'entusiasta' : 'cooperador', contexto: 'Ahora da retroalimentación a estudiantes, como mentor cercano: claro, pausado y alentador.', esSaludo: false });
    }
    out.push({ clave: claveAudio.explicacion(e.id), escenario: e.id, p: g, parrafos: e.solucion.explicacion, animo: 'cooperador', contexto: 'Explica la solución del caso a estudiantes, con calma, como en una clase.', esSaludo: false });
  }
  return out;
}

// ── Voces ─────────────────────────────────────────────────────
async function vocesElevenLabs() {
  const r = await fetch(`${BASE_11}/v1/voices`, { headers: { 'xi-api-key': KEY! } });
  if (!r.ok) salir(`ElevenLabs respondió ${r.status} al listar voces: ${await r.text()}`);
  const j = (await r.json()) as { voices: { voice_id: string; name: string; labels?: Record<string, string>; category?: string }[] };
  return j.voices;
}

async function asegurarVocesElevenLabs(clips: Clip[]) {
  const faltan = [...new Set(clips.map((c) => c.p.id))].filter((id) => !config.elevenlabs.voces[id]);
  if (!faltan.length) return;
  console.log(`\nAsignando automáticamente voces de tu cuenta de ElevenLabs a ${faltan.length} personajes…`);
  const voces = await vocesElevenLabs();
  if (!voces.length) salir('Tu cuenta de ElevenLabs no tiene voces. Agrega voces desde la Voice Library.');
  const porGenero = (g: string) => voces.filter((v) => (v.labels?.gender ?? '').toLowerCase() === g);
  const fem = porGenero('female').length ? porGenero('female') : voces;
  const mas = porGenero('male').length ? porGenero('male') : voces;
  const usadas: Record<string, number> = {};
  for (const id of faltan) {
    const p = clips.find((c) => c.p.id === id)!.p;
    const lista = p.voz.genero === 'f' ? fem : mas;
    const k = p.voz.genero;
    const i = (usadas[k] = (usadas[k] ?? -1) + 1);
    config.elevenlabs.voces[id] = lista[i % lista.length].voice_id;
    console.log(`  ${p.nombre.padEnd(20)} → ${lista[i % lista.length].name}`);
  }
  writeFileSync(RUTA_CONFIG, JSON.stringify(config, null, 2));
  console.log('  (Guardado en scripts/voces.config.json. Puedes cambiar cualquier voz por una chilena de la Voice Library.)');
}

function vozDe(c: Clip) {
  if (proveedor === 'azure') return config.azure.voces[c.p.id] || (c.p.voz.genero === 'f' ? config.azure.vozFemenina : config.azure.vozMasculina);
  return proveedor === 'openai' ? config.openai.voces[c.p.id] ?? (c.p.voz.genero === 'f' ? 'marin' : 'cedar') : config.elevenlabs.voces[c.p.id];
}

// ── Azure: catálogo de voces ─────────────────────────────────
let catalogoAzure: Map<string, VozAzure> = new Map();
async function cargarCatalogoAzure() {
  try {
    const voces = await listarVocesAzure(REGION, KEY!);
    catalogoAzure = new Map(voces.map((v) => [v.ShortName, v]));
  } catch (e) {
    const err = e as Error & { status?: number; cuerpo?: string };
    if (err.status) salir(`Azure rechazó la clave o la región (${err.status}). Revisa que la región «${REGION}» sea la de tu recurso y que la clave sea la KEY 1 o KEY 2.\nSi las guardaste, corrige o borra el archivo .env.local.`);
    salir(`No se pudo conectar con Azure en la región «${REGION}»: ${err.message}`);
  }
}
function verificarVocesAzure(clips: Clip[]) {
  const faltan = [...new Set(clips.map(vozDe))].filter((v) => !catalogoAzure.has(v));
  if (faltan.length) {
    const sugeridas = [...catalogoAzure.values()].filter((v) => v.Locale.startsWith('es-')).slice(0, 12).map((v) => v.ShortName).join(', ');
    salir(`Estas voces no existen en Azure: ${faltan.join(', ')}.\nRevisa scripts/voces.config.json. Algunas disponibles: ${sugeridas}\n(Usa npm run voces -- --listar-voces para ver todas.)`);
  }
}

// ── Llamadas a la API ─────────────────────────────────────────
function instruccionesOpenAI(c: Clip) {
  const act = c.p.actuacion ?? ACTUACION[c.p.id] ?? c.p.personalidad;
  return [
    ACENTO,
    `Personaje: ${c.p.nombre}, ${c.p.cargo} (${c.p.organizacion}). ${act}`,
    `En esta línea: ${EMOCION_TEXTO[c.animo]} ${c.contexto}`,
    'Actúa la emoción con la voz (volumen, ritmo, pausas, suspiros, risa si corresponde). Lee exactamente el texto, sin agregar ni omitir palabras.',
  ].join('\n\n');
}

function textoElevenLabs(c: Clip) {
  const tag = EMOCION_TAG[c.animo];
  return c.parrafos.map((t, i) => (i === 0 && tag ? `${tag} ` : '') + gestosElevenLabs(t)).join('\n\n');
}

async function sintetizar(c: Clip): Promise<Buffer> {
  if (proveedor === 'azure') {
    const voz = catalogoAzure.get(vozDe(c))!;
    const r = await sintetizarAzure(REGION, KEY!, construirSSML(c.p, voz, c.animo, c.parrafos), config.azure.formato);
    if (!r.ok) throw new ErrorApi(r.status, (await r.text()) || r.statusText, Number(r.headers.get('retry-after')) || 0);
    return Buffer.from(await r.arrayBuffer());
  }
  if (proveedor === 'openai') {
    const r = await fetch(`${BASE_OPENAI}/audio/speech`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.openai.modelo, voice: vozDe(c), input: c.parrafos.join('\n\n'), instructions: instruccionesOpenAI(c), response_format: 'mp3' }),
    });
    if (!r.ok) throw new ErrorApi(r.status, await r.text());
    return Buffer.from(await r.arrayBuffer());
  }
  const cfg = config.elevenlabs;
  const r = await fetch(`${BASE_11}/v1/text-to-speech/${vozDe(c)}?output_format=${cfg.formato}`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY!, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: textoElevenLabs(c), model_id: cfg.modelo, voice_settings: { stability: cfg.estabilidad, similarity_boost: 0.8 } }),
  });
  if (!r.ok) throw new ErrorApi(r.status, await r.text());
  return Buffer.from(await r.arrayBuffer());
}

class ErrorApi extends Error {
  constructor(
    public status: number,
    public cuerpo: string,
    public reintentarEn = 0,
  ) {
    super(`HTTP ${status}: ${cuerpo.slice(0, 300)}`);
  }
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function conReintentos(c: Clip) {
  for (let intento = 0; ; intento++) {
    try {
      return await sintetizar(c);
    } catch (e) {
      const err = e as ErrorApi;
      if (err.status === 401 || err.status === 403) salir(`La API rechazó la clave (${err.status}). Revisa la clave (si la guardaste, edita o borra el archivo .env.local).\n${err.cuerpo}`);
      const reintentable = !err.status || err.status === 429 || err.status >= 500;
      if (!reintentable || intento >= 4) throw e;
      const ms = Math.max(err.reintentarEn * 1000, (proveedor === 'azure' ? 4000 : 2000) * 2 ** intento);
      console.log(`  … ${err.status ?? 'red'} en ${c.clave}, reintento en ${ms / 1000}s`);
      await esperar(ms);
    }
  }
}

// ── Principal ─────────────────────────────────────────────────
function exportarGuion() {
  const clips = construirClips();
  const guion = {
    version: 1,
    generado: new Date().toISOString(),
    clips: clips.map((c) => ({
      clave: c.clave,
      h: huella(c.parrafos),
      escenario: c.escenario,
      personaje: c.p.id,
      nombre: c.p.nombre,
      genero: c.p.voz.genero,
      animo: c.animo,
      saludo: c.esSaludo,
      parrafos: c.parrafos,
      ...EMOCION_CHATTERBOX[c.animo],
    })),
  };
  const ruta = join(RAIZ, 'scripts', 'colab', 'guion-voces.json');
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, JSON.stringify(guion, null, 1));
  console.log(`\n✓ ${clips.length} audios exportados a scripts/colab/guion-voces.json. Súbelo al cuaderno de Colab.\n`);
}

async function main() {
  if (flag('exportar')) return exportarGuion();
  await asegurarClave();
  if (proveedor === 'azure') await cargarCatalogoAzure();
  if (flag('listar-voces') && proveedor === 'azure') {
    const es = [...catalogoAzure.values()].filter((v) => v.Locale.startsWith('es-')).sort((a, b) => (a.Locale === 'es-CL' ? -1 : 0) - (b.Locale === 'es-CL' ? -1 : 0) || a.Locale.localeCompare(b.Locale));
    console.log(`\n${es.length} voces en español (primero las chilenas):\n`);
    for (const v of es) console.log(`${v.ShortName.padEnd(34)} ${v.Gender === 'Female' ? 'mujer ' : 'hombre'}  ${v.Locale}  ${v.StyleList?.length ? 'emociones: ' + v.StyleList.join(', ') : ''}`);
    console.log('\nPara cambiar la voz de un personaje, escribe su nombre (columna 1) en scripts/voces.config.json → azure.voces.<personaje>.\n');
    return;
  }
  if (flag('listar-voces')) {
    if (proveedor !== 'elevenlabs') salir('--listar-voces funciona con Azure y ElevenLabs. Las voces de OpenAI son: alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, verse, marin, cedar.');
    const voces = await vocesElevenLabs();
    console.log(`\n${voces.length} voces en tu cuenta:\n`);
    for (const v of voces) {
      const l = v.labels ?? {};
      console.log(`${v.voice_id}  ${v.name.padEnd(28)} ${[l.gender, l.age, l.accent, l.language].filter(Boolean).join(' · ')}`);
    }
    console.log('\nCopia el voice_id en scripts/voces.config.json → elevenlabs.voces.<personaje>.\n');
    return;
  }

  let clips = construirClips();
  const todas = new Set(clips.map((c) => c.clave));
  const caso = opcion('caso');
  const pers = opcion('personaje');
  if (caso) clips = clips.filter((c) => c.escenario === caso);
  if (pers) clips = clips.filter((c) => c.p.id === pers);
  if (flag('prueba')) clips = clips.filter((c) => c.esSaludo);

  if (proveedor === 'elevenlabs') await asegurarVocesElevenLabs(clips);
  if (proveedor === 'azure') verificarVocesAzure(clips);

  const pendientes = clips.filter((c) => {
    if (flag('forzar')) return true;
    const m = manifest[c.clave];
    const archivo = join(DIR_AUDIO, c.clave + '.mp3');
    return !m || m.h !== huella(c.parrafos) || m.proveedor !== proveedor || m.voz !== vozDe(c) || !existsSync(archivo);
  });

  const huerfanas = Object.keys(manifest).filter((k) => !todas.has(k));
  if (flag('limpiar') && huerfanas.length) {
    for (const k of huerfanas) {
      rmSync(join(DIR_AUDIO, k + '.mp3'), { force: true });
      delete manifest[k];
    }
    guardarManifest();
    console.log(`Se borraron ${huerfanas.length} audios que ya no se usan.`);
  } else if (huerfanas.length) console.log(`(Hay ${huerfanas.length} audios que ya no se usan; bórralos con --limpiar)`);

  if (!pendientes.length) {
    console.log('\n✓ Todo está al día: no hay audios por generar.\n');
    return;
  }

  const chars = pendientes.reduce((a, c) => a + c.parrafos.join(' ').length, 0);
  const minutos = chars / 15 / 60; // ~15 caracteres por segundo hablado
  const costo = proveedor === 'azure' ? `gratis dentro del plan F0 (usa ${chars.toLocaleString('es-CL')} de los 500.000 caracteres mensuales; toma ≈ ${Math.ceil((pendientes.length * 3.2) / 60)} min)` : proveedor === 'openai' ? `≈ US$${Math.max(0.01, minutos * 0.015).toFixed(2)} (≈ ${Math.round(minutos)} min de audio)` : `≈ ${Math.round(chars * 1.05).toLocaleString('es-CL')} créditos (≈ US$${((chars * 1.05 * 0.1) / 1000).toFixed(2)} a precio de API)`;
  console.log(`\nProveedor: ${proveedor} · ${pendientes.length} audios por generar · ${chars.toLocaleString('es-CL')} caracteres`);
  console.log(`Costo estimado: ${costo}\n`);

  if (!flag('si')) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const resp = (await rl.question('¿Continuar? (s/n) ')).trim().toLowerCase();
    rl.close();
    if (!resp.startsWith('s')) return console.log('Cancelado.');
  }

  let hechos = 0;
  let fallidos = 0;
  const cola = [...pendientes];
  // El plan gratuito de Azure admite ~20 solicitudes por minuto: vamos de a una, con pausa.
  const paralelos = proveedor === 'azure' ? 1 : 2;
  const pausa = proveedor === 'azure' ? 3200 : 0;
  let ultimo = 0;
  const trabajador = async () => {
    for (let c = cola.shift(); c; c = cola.shift()) {
      const espera = ultimo + pausa - Date.now();
      if (espera > 0) await esperar(espera);
      ultimo = Date.now();
      try {
        const buf = await conReintentos(c);
        const archivo = join(DIR_AUDIO, c.clave + '.mp3');
        mkdirSync(dirname(archivo), { recursive: true });
        writeFileSync(archivo, buf);
        manifest[c.clave] = { h: huella(c.parrafos), proveedor, voz: vozDe(c) };
        guardarManifest();
        hechos++;
        console.log(`  ✓ [${hechos + fallidos}/${pendientes.length}] ${c.clave}  (${c.p.nombre}, ${c.animo})`);
      } catch (e) {
        fallidos++;
        console.log(`  ✖ [${hechos + fallidos}/${pendientes.length}] ${c.clave}: ${(e as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: paralelos }, trabajador));
  console.log(`\nListo: ${hechos} audios generados${fallidos ? `, ${fallidos} con error (vuelve a ejecutar el comando para reintentarlos)` : ''}.`);
  console.log('Revisa en la app (npm run dev) y luego haz Commit + Push en GitHub Desktop para publicarlos.\n');
}

main().catch((e) => salir((e as Error).message));
