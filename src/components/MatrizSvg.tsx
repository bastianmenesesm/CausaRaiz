import { useRef, useState } from 'react';
import type { Idea } from '../types';

export const CUADRANTES = {
  quick: { nombre: 'Ganancias rápidas', desc: 'Alto impacto · bajo esfuerzo: hacer primero', clase: 'q-quick', color: '#2e8b57' },
  proyecto: { nombre: 'Proyectos estratégicos', desc: 'Alto impacto · alto esfuerzo: planificar', clase: 'q-proyecto', color: '#2f6fb0' },
  menor: { nombre: 'Tareas menores', desc: 'Bajo impacto · bajo esfuerzo: si sobra tiempo', clase: 'q-menor', color: '#c98d06' },
  evitar: { nombre: 'Evitar', desc: 'Bajo impacto · alto esfuerzo: descartar', clase: 'q-evitar', color: '#c0392b' },
} as const;
export type Cuadrante = keyof typeof CUADRANTES;

export function evaluada(i: Idea) {
  return i.impacto > 0 && i.esfuerzo > 0;
}

export function cuadrante(i: Idea): Cuadrante | null {
  if (!evaluada(i)) return null;
  const alto = i.impacto > 5;
  const bajoEsf = i.esfuerzo <= 5;
  if (alto && bajoEsf) return 'quick';
  if (alto) return 'proyecto';
  if (bajoEsf) return 'menor';
  return 'evitar';
}

const X0 = 64, X1 = 500, Y0 = 24, Y1 = 460;
const sx = (e: number) => X0 + ((e - 0.5) / 10) * (X1 - X0);
const sy = (im: number) => Y1 - ((im - 0.5) / 10) * (Y1 - Y0);

/** Matriz esfuerzo / impacto con puntos arrastrables (escala 1 a 10). */
export function MatrizSvg({ ideas, onMover, soloLectura = false }: { ideas: Idea[]; onMover?: (id: string, esfuerzo: number, impacto: number) => void; soloLectura?: boolean }) {
  const ref = useRef<SVGSVGElement>(null);
  const [arrastrando, setArrastrando] = useState<string | null>(null);

  const aCoord = (ev: React.PointerEvent) => {
    const svg = ref.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = pt.matrixTransform(m.inverse());
    const esf = Math.round(Math.min(10, Math.max(1, 0.5 + ((p.x - X0) / (X1 - X0)) * 10)));
    const imp = Math.round(Math.min(10, Math.max(1, 0.5 + ((Y1 - p.y) / (Y1 - Y0)) * 10)));
    return { esf, imp };
  };

  const ev = ideas.map((i, n) => ({ i, n })).filter(({ i }) => evaluada(i));
  // Separar puntos que caen en la misma celda
  const grupos = new Map<string, number>();
  const pos = ev.map(({ i, n }) => {
    const k = `${i.esfuerzo}-${i.impacto}`;
    const j = grupos.get(k) ?? 0;
    grupos.set(k, j + 1);
    const ang = j * 2.1;
    const rad = j === 0 ? 0 : 13;
    return { i, n, x: sx(i.esfuerzo) + Math.cos(ang) * rad, y: sy(i.impacto) + Math.sin(ang) * rad };
  });

  return (
    <svg
      ref={ref}
      viewBox="0 0 520 510"
      className="matriz-svg"
      onPointerMove={(e) => {
        if (!arrastrando || !onMover) return;
        const c = aCoord(e);
        if (c) onMover(arrastrando, c.esf, c.imp);
      }}
      onPointerUp={() => setArrastrando(null)}
      onPointerCancel={() => setArrastrando(null)}
      role="img"
      aria-label="Matriz de esfuerzo e impacto"
    >
      <rect x={X0} y={Y0} width={(X1 - X0) / 2} height={(Y1 - Y0) / 2} fill="#e1f2e8" />
      <rect x={(X0 + X1) / 2} y={Y0} width={(X1 - X0) / 2} height={(Y1 - Y0) / 2} fill="#e1ecf7" />
      <rect x={X0} y={(Y0 + Y1) / 2} width={(X1 - X0) / 2} height={(Y1 - Y0) / 2} fill="#fbf0d4" />
      <rect x={(X0 + X1) / 2} y={(Y0 + Y1) / 2} width={(X1 - X0) / 2} height={(Y1 - Y0) / 2} fill="#f8e1de" />
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
        <g key={v}>
          <line x1={sx(v)} y1={Y1} x2={sx(v)} y2={Y1 + 5} stroke="#7b8594" />
          <text x={sx(v)} y={Y1 + 17} textAnchor="middle" fontSize={10.5} fill="#7b8594" fontFamily="IBM Plex Mono, monospace">{v}</text>
          <line x1={X0 - 5} y1={sy(v)} x2={X0} y2={sy(v)} stroke="#7b8594" />
          <text x={X0 - 9} y={sy(v) + 3.5} textAnchor="end" fontSize={10.5} fill="#7b8594" fontFamily="IBM Plex Mono, monospace">{v}</text>
        </g>
      ))}
      <line x1={(X0 + X1) / 2} y1={Y0} x2={(X0 + X1) / 2} y2={Y1} stroke="#1c2430" strokeDasharray="5 4" strokeWidth={1.2} />
      <line x1={X0} y1={(Y0 + Y1) / 2} x2={X1} y2={(Y0 + Y1) / 2} stroke="#1c2430" strokeDasharray="5 4" strokeWidth={1.2} />
      <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} fill="none" stroke="#1c2430" strokeWidth={1.5} />
      {(
        [
          ['quick', X0 + 10, Y0 + 20, 'start'],
          ['proyecto', X1 - 10, Y0 + 20, 'end'],
          ['menor', X0 + 10, Y1 - 12, 'start'],
          ['evitar', X1 - 10, Y1 - 12, 'end'],
        ] as const
      ).map(([q, x, y, a]) => (
        <text key={q} x={x} y={y} textAnchor={a} fontFamily="Barlow Condensed, sans-serif" fontWeight={700} fontSize={13} fill={CUADRANTES[q].color} letterSpacing="0.4">
          {CUADRANTES[q].nombre.toUpperCase()}
        </text>
      ))}
      <text x={(X0 + X1) / 2} y={500} textAnchor="middle" fontFamily="Barlow Condensed, sans-serif" fontWeight={700} fontSize={15} fill="#1c2430" letterSpacing="1">
        ESFUERZO →
      </text>
      <text x={16} y={(Y0 + Y1) / 2} textAnchor="middle" transform={`rotate(-90 16 ${(Y0 + Y1) / 2})`} fontFamily="Barlow Condensed, sans-serif" fontWeight={700} fontSize={15} fill="#1c2430" letterSpacing="1">
        IMPACTO →
      </text>
      {pos.map(({ i, n, x, y }) => {
        const q = cuadrante(i)!;
        return (
          <g
            key={i.id}
            style={{ cursor: soloLectura ? 'default' : arrastrando === i.id ? 'grabbing' : 'grab' }}
            onPointerDown={(e) => {
              if (soloLectura) return;
              ref.current?.setPointerCapture?.(e.pointerId);
              setArrastrando(i.id);
            }}
          >
            <title>{i.texto}</title>
            <circle cx={x} cy={y} r={arrastrando === i.id ? 15 : 13} fill={CUADRANTES[q].color} stroke="#fff" strokeWidth={2.5} />
            <text x={x} y={y + 4.5} textAnchor="middle" fill="#fff" fontSize={12.5} fontWeight={700} fontFamily="IBM Plex Mono, monospace" pointerEvents="none">
              {n + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
