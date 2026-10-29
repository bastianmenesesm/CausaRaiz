import { useEffect, useState, type ReactNode } from 'react';
import type { Animo, KpiDef, Personaje, Voz } from '../types';
import { detener, hablar, vozDisponible } from '../lib/voz';
import { tieneAudio } from '../lib/audio';
import { clp, horaDesdeDecimal } from '../lib/datos';

export const ANIMOS: Record<Animo, { emoji: string; label: string }> = {
  furioso: { emoji: '😡', label: 'Furioso' },
  molesto: { emoji: '😠', label: 'Molesto' },
  nervioso: { emoji: '😬', label: 'Nervioso' },
  asustado: { emoji: '😨', label: 'Asustado' },
  defensivo: { emoji: '🤨', label: 'A la defensiva' },
  neutral: { emoji: '😐', label: 'Neutral' },
  cooperador: { emoji: '🙂', label: 'Cooperador' },
  aliviado: { emoji: '😌', label: 'Aliviado' },
  entusiasta: { emoji: '😄', label: 'Entusiasta' },
  triste: { emoji: '😔', label: 'Dolido' },
};

export function iniciales(nombre: string) {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export function Avatar({ p, animo, size = 48 }: { p: Pick<Personaje, 'nombre' | 'color'>; animo?: Animo; size?: number }) {
  return (
    <div className="avatar" style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden>
        <circle cx="24" cy="24" r="24" fill={p.color} />
        <circle cx="24" cy="19" r="8.5" fill="rgba(255,255,255,0.22)" />
        <path d="M8 42c3-8 9.5-11 16-11s13 3 16 11" fill="rgba(255,255,255,0.22)" />
        <text x="24" y="29" textAnchor="middle" fontFamily="Barlow Condensed, sans-serif" fontWeight={700} fontSize="17" fill="#fff">
          {iniciales(p.nombre)}
        </text>
      </svg>
      {animo && (
        <span className="emoji" title={ANIMOS[animo].label}>
          {ANIMOS[animo].emoji}
        </span>
      )}
    </div>
  );
}

let hablandoGlobal: string | null = null;
const oyentes = new Set<(id: string | null) => void>();
function setHablando(id: string | null) {
  hablandoGlobal = id;
  oyentes.forEach((f) => f(id));
}

/** Hook para saber qué texto se está leyendo en este momento */
export function useHablando() {
  const [h, setH] = useState<string | null>(hablandoGlobal);
  useEffect(() => {
    oyentes.add(setH);
    return () => {
      oyentes.delete(setH);
    };
  }, []);
  return h;
}

/** Lee en voz alta. `audio` es la clave del MP3 grabado (ver lib/claves.ts). */
export function leer(clave: string, parrafos: string[], voz: Voz, idPersonaje: string, audio?: string) {
  setHablando(clave);
  hablar(
    parrafos,
    voz,
    idPersonaje,
    () => {
      if (hablandoGlobal === clave) setHablando(null);
    },
    audio,
  );
}

export function pararLectura() {
  detener();
  setHablando(null);
}

export function BotonVoz({ clave, parrafos, voz, idPersonaje, audio, etiqueta = 'Escuchar' }: { clave: string; parrafos: string[]; voz: Voz; idPersonaje: string; audio?: string; etiqueta?: string }) {
  const h = useHablando();
  const grabado = tieneAudio(audio, parrafos);
  if (!vozDisponible() && !grabado) return null;
  const activo = h === clave;
  return (
    <button
      className={'btn btn-voz' + (activo ? ' activo' : '')}
      onClick={() => (activo ? pararLectura() : leer(clave, parrafos, voz, idPersonaje, audio))}
      title={activo ? 'Detener' : grabado ? 'Escuchar (voz grabada)' : 'Escuchar (voz del navegador)'}
    >
      {activo ? '■ Detener' : '▶ ' + etiqueta}
    </button>
  );
}

export function formatear(v: number | string | undefined, k: KpiDef) {
  if (v === undefined || v === '') return '–';
  const n = Number(v);
  switch (k.formato) {
    case 'hora':
      return horaDesdeDecimal(n);
    case 'clp':
      return clp(n);
    case 'pct':
      return n.toLocaleString('es-CL', { minimumFractionDigits: k.decimales, maximumFractionDigits: k.decimales }) + '%';
    default:
      return n.toLocaleString('es-CL', { minimumFractionDigits: k.decimales, maximumFractionDigits: k.decimales }) + (k.unidad && !['entregas', 'pedidos', 'pallets', 'reclamos', 'incidencias', 'líneas', 'personas', 'equipos', 'furgones', 'paradas'].includes(k.unidad) ? ' ' + k.unidad : '');
  }
}

export function CabeceraPaso({ eyebrow, titulo, children, derecha }: { eyebrow: string; titulo: string; children?: ReactNode; derecha?: ReactNode }) {
  return (
    <div className="cabecera-paso">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{titulo}</h1>
        {children && <p>{children}</p>}
      </div>
      {derecha}
    </div>
  );
}

export function NavPasos({ atras, siguiente, textoSiguiente = 'Siguiente paso →' }: { atras?: () => void; siguiente?: () => void; textoSiguiente?: string }) {
  return (
    <div className="nav-pasos">
      {atras ? (
        <button className="btn" onClick={atras}>
          ← Paso anterior
        </button>
      ) : (
        <span />
      )}
      {siguiente && (
        <button className="btn btn-primary" onClick={siguiente}>
          {textoSiguiente}
        </button>
      )}
    </div>
  );
}

export function EspinaDecorativa({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 300" className={className} aria-hidden>
      <g stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round">
        <path d="M20 150h400" />
        <path d="M120 150 70 40M240 150 190 40M360 150 310 40M120 150 70 260M240 150 190 260M360 150 310 260" />
      </g>
      <path d="M420 100 500 150 420 200Z" fill="#f26b1d" />
    </svg>
  );
}
