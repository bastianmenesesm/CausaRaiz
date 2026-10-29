import type { CausaIshikawa } from '../types';
import { CATEGORIAS_6M } from '../types';

function partirTexto(t: string, max: number, lineas: number) {
  const palabras = t.split(/\s+/);
  const out: string[] = [];
  let actual = '';
  for (const w of palabras) {
    if ((actual + ' ' + w).trim().length > max) {
      if (actual) out.push(actual);
      actual = w;
    } else actual = (actual + ' ' + w).trim();
  }
  if (actual) out.push(actual);
  if (out.length > lineas) {
    const cortado = out.slice(0, lineas);
    cortado[lineas - 1] = cortado[lineas - 1].replace(/.{0,2}$/, '') + '…';
    return cortado;
  }
  return out;
}

function recortar(t: string, n: number) {
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
}

/** Diagrama de Ishikawa (espina de pescado) dibujado a partir de las causas del grupo. */
export function Fishbone({ efecto, causas, compacto = false }: { efecto: string; causas: CausaIshikawa[]; compacto?: boolean }) {
  const W = 1100;
  const H = 540;
  const yEsp = 270;
  const bases = [350, 600, 850];
  const dx = 130;
  const efectoLineas = partirTexto(efecto || 'Efecto / problema (complétalo arriba)', 22, 6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="ishikawa-svg" role="img" aria-label="Diagrama de Ishikawa">
      <defs>
        <pattern id="cuadricula" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#f1ede5" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#cuadricula)" />
      {/* espina */}
      <line x1={40} y1={yEsp} x2={872} y2={yEsp} stroke="#1c2430" strokeWidth={5} strokeLinecap="round" />
      <path d={`M860 ${yEsp - 18} L884 ${yEsp} L860 ${yEsp + 18}Z`} fill="#1c2430" />
      {/* cabeza */}
      <rect x={886} y={yEsp - 92} width={200} height={184} rx={10} fill="#f26b1d" />
      <text x={986} y={yEsp - 70} textAnchor="middle" fill="#fff" fontFamily="Barlow Condensed, sans-serif" fontSize={13} fontWeight={700} letterSpacing="1.5">
        EFECTO
      </text>
      {efectoLineas.map((l, i) => (
        <text key={i} x={986} y={yEsp - 44 + i * 19 + (6 - efectoLineas.length) * 8} textAnchor="middle" fill="#fff" fontFamily="IBM Plex Sans, sans-serif" fontSize={14} fontWeight={600}>
          {l}
        </text>
      ))}

      {CATEGORIAS_6M.map((cat, idx) => {
        const arriba = idx < 3;
        const base = bases[idx % 3];
        const yFin = arriba ? 48 : H - 48;
        const xFin = base - dx;
        const lista = causas.filter((c) => c.categoria === cat);
        const visibles = lista.slice(0, compacto ? 5 : 6);
        return (
          <g key={cat}>
            <line x1={base} y1={yEsp} x2={xFin} y2={yFin} stroke="#1c2430" strokeWidth={3} strokeLinecap="round" />
            <rect x={xFin - 82} y={arriba ? yFin - 32 : yFin + 4} width={164} height={28} rx={6} fill="#1c2430" />
            <text x={xFin} y={arriba ? yFin - 13 : yFin + 23} textAnchor="middle" fill="#fff" fontFamily="Barlow Condensed, sans-serif" fontSize={16} fontWeight={700} letterSpacing="0.5">
              {cat.toUpperCase()}
              {lista.length ? ` · ${lista.length}` : ''}
            </text>
            {visibles.map((c, i) => {
              const n = visibles.length;
              const t = (i + 1) / (n + 1);
              const y = arriba ? yFin + 22 + t * (yEsp - yFin - 40) : yEsp + 18 + t * (yFin - yEsp - 40);
              const frac = arriba ? (y - yFin) / (yEsp - yFin) : (yFin - y) / (yFin - yEsp);
              const xBone = xFin + dx * frac;
              return (
                <g key={c.id}>
                  <title>{c.texto}</title>
                  <line x1={xBone - 200} y1={y} x2={xBone} y2={y} stroke={c.probable ? '#f26b1d' : '#9aa3ae'} strokeWidth={c.probable ? 2 : 1.2} />
                  {c.probable && <circle cx={xBone - 200} cy={y} r={3.5} fill="#f26b1d" />}
                  <text x={xBone - 8} y={y - 4} textAnchor="end" fontFamily="IBM Plex Sans, sans-serif" fontSize={11.5} fontWeight={c.probable ? 700 : 400} fill={c.probable ? '#b4470b' : '#1c2430'}>
                    {recortar(c.texto, 33)}
                  </text>
                </g>
              );
            })}
            {lista.length > visibles.length && (
              <text x={base - dx / 2 - 30} y={arriba ? yEsp - 10 : yEsp + 20} fontSize={11} fill="#7b8594" fontFamily="IBM Plex Sans, sans-serif">
                +{lista.length - visibles.length} más
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
