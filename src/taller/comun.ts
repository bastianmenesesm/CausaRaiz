// ─────────────────────────────────────────────────────────────
// Taller de datos: tipos y utilidades comunes.
// Cada caso genera una base "transaccional" (una fila por guía,
// viaje o pedido) a partir de los mismos 30 días del tablero.
// La semilla depende del grupo: cada grupo recibe números propios
// con la misma historia de fondo.
// ─────────────────────────────────────────────────────────────
import { semilla } from '../lib/datos';

export type Formato = 'texto' | 'entero' | 'dec1' | 'dec2' | 'clp' | 'fecha' | 'fechahora' | 'hora';

export interface Columna {
  titulo: string;
  formato: Formato;
  desc: string;
  ancho?: number;
}

export type Celda = string | number | null;

export interface Hoja {
  nombre: string;
  desc: string;
  columnas: Columna[];
  filas: Celda[][];
}

export interface Reto {
  id: string;
  indicador: string;
  pregunta: string;
  unidad: string; // '%', 'CLP', 'h', 'min', '°C', 'guías/ruta'…
  decimales: number;
  /** Diferencia máxima aceptada (absoluta, en la unidad del reto). */
  tolerancia: number;
  respuesta: number;
  formula: string;
  pista: string;
}

export interface BaseDatos {
  archivo: string;
  intro: string;
  hojas: Hoja[];
  retos: Reto[];
  preguntasGuia: string[];
}

/** Semilla estable a partir de un texto (FNV-1a). */
export function hashTexto(t: string) {
  let h = 0x811c9dc5;
  for (const ch of t) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function claveGrupo(nombre: string, curso: string) {
  return (nombre.trim() + '|' + curso.trim()).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export class Azar {
  private r: () => number;
  constructor(seed: number) {
    this.r = semilla(seed);
  }
  u() {
    return this.r();
  }
  /** Entero entre a y b (ambos incluidos) */
  int(a: number, b: number) {
    return a + Math.floor(this.r() * (b - a + 1));
  }
  entre(a: number, b: number) {
    return a + this.r() * (b - a);
  }
  normal(media = 0, desv = 1) {
    const u1 = Math.max(this.r(), 1e-12);
    const u2 = this.r();
    return media + desv * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  elegir<T>(xs: readonly T[]) {
    return xs[Math.floor(this.r() * xs.length)];
  }
  /** Elige según pesos [valor, peso] */
  ponderado<T>(xs: readonly (readonly [T, number])[]) {
    const tot = xs.reduce((a, x) => a + x[1], 0);
    let u = this.r() * tot;
    for (const [v, p] of xs) {
      if ((u -= p) <= 0) return v;
    }
    return xs[xs.length - 1][0];
  }
  /** Mezcla determinista (Fisher-Yates): igual en todos los navegadores. */
  mezclar<T>(xs: readonly T[]) {
    const a = [...xs];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  binomial(n: number, p: number) {
    let k = 0;
    for (let i = 0; i < n; i++) if (this.r() < p) k++;
    return k;
  }
}

// ── Fechas como número de serie de Excel (días desde 1899-12-30) ──
const EPOCA = Date.UTC(1899, 11, 30);

export interface DiaOp {
  /** número de día del período (1–30) */
  dia: number;
  /** número de serie Excel de la fecha a las 00:00 */
  serie: number;
  /** 6 = sábado */
  diaSemana: number;
  iso: string;
}

/** Días operativos (lunes a sábado) desde una fecha ISO, igual que el tablero. */
export function diasOperativos(inicioISO: string, n: number): DiaOp[] {
  const [y, m, d] = inicioISO.split('-').map(Number);
  const out: DiaOp[] = [];
  let t = Date.UTC(y, m - 1, d);
  while (out.length < n) {
    const f = new Date(t);
    if (f.getUTCDay() !== 0) {
      out.push({ dia: out.length + 1, serie: Math.round((t - EPOCA) / 86400000), diaSemana: f.getUTCDay(), iso: f.toISOString().slice(0, 10) });
    }
    t += 86400000;
  }
  return out;
}

/** Serie Excel a partir de la fecha del día y una hora decimal (puede pasar de 24 o ser negativa). */
export function enHora(serieDia: number, horaDecimal: number) {
  return serieDia + horaDecimal / 24;
}

/** Redondea una hora decimal al minuto. */
export function aMinuto(h: number) {
  return Math.round(h * 60) / 60;
}

/** Redondea un número de serie Excel al minuto. */
export function serieAMinuto(x: number) {
  return Math.round(x * 1440) / 1440;
}

export function redondearA(v: number, dec: number) {
  const f = Math.pow(10, dec);
  return Math.round(v * f) / f;
}

export function promedio(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function suma(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0);
}

/** Interpreta lo que escribe el alumno: «84,3», «84.3 %», «$2.315», «2315». */
export function leerNumero(txt: string, unidad: string): number | null {
  let s = txt.trim().replace(/\s/g, '').replace(/[%$°C]|clp|h|min/gi, '');
  if (!s) return null;
  if (unidad === 'CLP') {
    // en pesos los puntos y comas son separadores de miles salvo un decimal final de 1–2 dígitos
    const m = s.match(/^(.*?)[.,](\d{1,2})$/);
    s = m && !/[.,]/.test(m[1]) && m[2].length !== 3 ? m[1] + '.' + m[2] : s.replace(/[.,](?=\d{3}(\D|$))/g, '');
    s = s.replace(',', '.');
  } else if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else {
    s = s.replace(',', '.');
  }
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

export function formatoValor(v: number, r: Pick<Reto, 'unidad' | 'decimales'>) {
  const n = v.toLocaleString('es-CL', { minimumFractionDigits: r.decimales, maximumFractionDigits: r.decimales });
  if (r.unidad === 'CLP') return '$' + n;
  if (r.unidad === '%') return n + '%';
  return n + ' ' + r.unidad;
}
