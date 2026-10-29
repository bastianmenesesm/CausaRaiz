// ─────────────────────────────────────────────────────────────
// Dirección actoral para las voces grabadas.
// Se usa SOLO al generar los audios (npm run voces).
// Describe la voz como se le explicaría a un actor de doblaje.
// Si un personaje nuevo no aparece aquí, se usa su campo `actuacion`
// o, en último caso, su `personalidad`.
// ─────────────────────────────────────────────────────────────
import type { Animo } from '../types';

export const ACENTO =
  'Habla en español de Chile, con acento, ritmo y entonación de Santiago de Chile (no español de España, ni mexicano, ni neutro). ' +
  'Pronuncia como un chileno real: aspira suavemente la «s» final, usa el tono cantadito chileno y dice con naturalidad los modismos (po, cachai, altiro, harto, pega). ' +
  'Suena como una persona real conversando, no como locutor: con pausas naturales, respiración y pequeñas vacilaciones donde el texto las sugiere.';

export const ACTUACION: Record<string, string> = {
  // ── Última milla ──
  claudia: 'Mujer de 45 años, gerenta. Voz firme y rápida, de alguien con poco tiempo y mucha presión del directorio. Profesional, algo tensa; cuando reconoce errores baja el ritmo.',
  jonathan: 'Hombre de 24 años, conductor de reparto de La Florida. Muy nervioso y asustado de perder su trabajo: voz algo temblorosa, titubea, dice «eh» y hace pausas, habla bajito al principio. Se va soltando y aliviando a medida que lo tratan bien.',
  rodrigo: 'Hombre de 40 años, vecino de La Florida, furioso. Habla fuerte, rápido, indignado, casi gritando en algunas frases, con sarcasmo. Exagera con rabia los números («¡dos veces!»). Se calma un poco cuando le piden disculpas.',
  marcelo: 'Hombre de 35 años, planificador de rutas. Técnico y algo soberbio: tono condescendiente y seguro, como quien explica algo obvio. Cuando lo descubren en un error se pone nervioso y se le quiebra la seguridad.',
  felipe: 'Hombre de 32 años, ejecutivo comercial. Entusiasta, vendedor, habla rápido y con energía, sonriendo. Cuando se da cuenta de los problemas, se le apaga el entusiasmo y suena incómodo.',
  carmen: 'Mujer de 52 años, supervisora de bodega con 12 años en la empresa. Voz algo ronca y cansada, directa, práctica, sin rodeos; un poco maternal con los conductores y algo irónica con «los de la oficina».',
  hector: 'Hombre de 58 años, vendedor de una empresa de arriendo de furgones. Bonachón, relajado y bromista: se ríe de sus propios chistes, habla pausado, con calidez de vendedor antiguo.',
  // ── Primera milla ──
  andrea: 'Mujer de 40 años, jefa de operaciones. Segura, orgullosa de sus decisiones, habla con rapidez y decisión. Cuando la confrontan con datos se pone a la defensiva y luego reconoce, con cierta incomodidad.',
  luis: 'Hombre de 60 años, camionero veterano con 25 años en camiones de frío. Gruñón, voz grave y rasposa, habla pausado y con sarcasmo campechano, le dice «mijo» a todos. Se enoja de verdad si lo acusan.',
  ricardo: 'Hombre de 50 años, jefe de recepción de un centro de distribución. Furioso, intimidante, autoritario: voz fuerte y cortante, frases secas, sube el volumen cuando habla de las tiendas sin producto.',
  rosa: 'Mujer de 62 años, agricultora de Paine. Cariñosa y campesina, habla con calidez y le dice «mijito», pero está dolida e indignada porque la culpan injustamente; se le nota la pena en la voz.',
  kevin: 'Hombre de 26 años, coordinador de rutas sobrepasado. Ansioso, habla muy rápido, atropellado, suspira, se disculpa, como si estuviera atendiendo tres teléfonos a la vez.',
  tomas: 'Hombre de 34 años, técnico en refrigeración. Preciso, entusiasta de la técnica, un poco nerd: explica con paciencia y gusto, como profesor que disfruta su tema.',
  // ── Almacenamiento ──
  'rodrigo-s': 'Hombre de 47 años, gerente de un centro de distribución. Estresado, habla rápido, suspira, suena agobiado pero abierto a escuchar.',
  brayan: 'Hombre de 27 años, operador de grúa del turno noche. Relajado, irónico, bueno para la talla, se ríe; habla con mucha soltura y jerga chilena juvenil, pero honesto.',
  marisol: 'Mujer de 38 años, preparadora de pedidos. Conversadora, chismosa y frustrada; habla rápido, exagera, enfatiza sílabas («un de-sas-tre») y cuenta todo con dramatismo.',
  sergio: 'Hombre de 63 años, dueño de una ferretería de barrio. Muy molesto, sarcástico e impaciente, voz de viejo comerciante enojado que se siente pasado a llevar.',
  valentina: 'Mujer de 36 años, jefa de abastecimiento. Ejecutiva segura, algo altanera y orgullosa de sus logros; habla con aplomo. Cuando entiende el problema, pierde seguridad y suena preocupada.',
  ignacio: 'Hombre de 30 años, soporte técnico de software. Formal, preciso, algo defensivo al principio; voz calmada y ordenada, como quien lee registros.',
  oscar: 'Hombre de 55 años, supervisor del turno noche. Autoritario, orgulloso, voz dura y tajante. Cuando lo confrontan titubea, se pone nervioso e intenta justificarse.',
};

/** Emoción en palabras (para OpenAI) */
export const EMOCION_TEXTO: Record<Animo, string> = {
  furioso: 'Está furioso: habla fuerte, rápido, indignado, casi gritando, con rabia contenida que se escapa.',
  molesto: 'Está molesto e irritado: tono seco, impaciente, con algo de sarcasmo.',
  nervioso: 'Está nervioso: habla algo más rápido, con dudas, pausas cortas y voz insegura.',
  asustado: 'Está asustado: voz baja y temblorosa, titubea, teme las consecuencias.',
  defensivo: 'Está a la defensiva: tono tenso y justificativo, como quien se siente acusado.',
  neutral: 'Tono neutro y conversacional.',
  cooperador: 'Está colaborador y abierto: tono amable, tranquilo, dispuesto a ayudar.',
  aliviado: 'Está aliviado y agradecido: se relaja, suena más tranquilo y cálido.',
  entusiasta: 'Está entusiasmado: energía alta, sonrisa en la voz, ritmo animado.',
  triste: 'Está dolido y triste: voz más baja y lenta, se le nota la pena.',
};

/** Etiquetas de audio para ElevenLabs v3 */
export const EMOCION_TAG: Record<Animo, string> = {
  furioso: '[furious]',
  molesto: '[annoyed]',
  nervioso: '[nervous]',
  asustado: '[scared]',
  defensivo: '[defensive]',
  neutral: '',
  cooperador: '[friendly]',
  aliviado: '[relieved]',
  entusiasta: '[excited]',
  triste: '[sad]',
};

/** Añade gestos no verbales a partir del propio texto (solo ElevenLabs v3). */
export function gestosElevenLabs(t: string) {
  return t
    .replace(/\bja,\s*ja\b[.!]?/gi, '[laughs]')
    .replace(/^(Uf|Uy)\b/i, '[sighs] $1')
    .replace(/^(Mmm)\b/i, '[thoughtfully] $1');
}

/** Parámetros de Chatterbox (modelo gratuito de código abierto) por emoción.
 *  exaggeration: intensidad emocional (0.25–2). cfg_weight: más bajo = más pausado y libre. */
export const EMOCION_CHATTERBOX: Record<Animo, { exaggeration: number; cfg_weight: number; temperature: number }> = {
  furioso: { exaggeration: 1.0, cfg_weight: 0.3, temperature: 0.85 },
  molesto: { exaggeration: 0.75, cfg_weight: 0.4, temperature: 0.8 },
  nervioso: { exaggeration: 0.7, cfg_weight: 0.4, temperature: 0.85 },
  asustado: { exaggeration: 0.75, cfg_weight: 0.35, temperature: 0.85 },
  defensivo: { exaggeration: 0.6, cfg_weight: 0.45, temperature: 0.8 },
  neutral: { exaggeration: 0.45, cfg_weight: 0.5, temperature: 0.75 },
  cooperador: { exaggeration: 0.5, cfg_weight: 0.5, temperature: 0.75 },
  aliviado: { exaggeration: 0.45, cfg_weight: 0.5, temperature: 0.75 },
  entusiasta: { exaggeration: 0.85, cfg_weight: 0.35, temperature: 0.85 },
  triste: { exaggeration: 0.6, cfg_weight: 0.45, temperature: 0.8 },
};
