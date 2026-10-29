// Utilidades para generar series de indicadores realistas y reproducibles.

/** Generador pseudoaleatorio con semilla (siempre entrega los mismos datos). */
export function semilla(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Devuelve n fechas operativas (lunes a sábado) desde una fecha ISO. */
export function fechasOperativas(inicioISO: string, n: number): { fecha: string; diaSemana: number }[] {
  const out: { fecha: string; diaSemana: number }[] = [];
  const d = new Date(inicioISO + 'T12:00:00');
  while (out.length < n) {
    const ds = d.getDay();
    if (ds !== 0) {
      out.push({
        fecha: `${DIAS[ds]} ${String(d.getDate()).padStart(2, '0')}-${MESES[d.getMonth()]}`,
        diaSemana: ds,
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** 0 antes de `inicio`, sube linealmente hasta 1 en `dur` días. */
export function rampa(dia: number, inicio: number, dur = 3) {
  if (dia < inicio) return 0;
  return Math.min(1, (dia - inicio + 1) / dur);
}

export function redondear(v: number, dec = 0) {
  const f = Math.pow(10, dec);
  return Math.round(v * f) / f;
}

export function limitar(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** Ruido centrado en 0 con amplitud ±amp */
export function ruido(r: () => number, amp: number) {
  return (r() * 2 - 1) * amp;
}

export function clp(v: number) {
  return '$' + Math.round(v).toLocaleString('es-CL');
}

export function horaDesdeDecimal(h: number) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}
