import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSim } from '../contexto';
import type { KpiDef } from '../types';
import { CabeceraPaso, NavPasos, formatear } from '../components/ui';
import { redondear } from '../lib/datos';

const COLORES = ['#f26b1d', '#2f6fb0'];

function promedio(vals: number[]) {
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function Sparkline({ vals, color }: { vals: number[]; color: string }) {
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const rango = max - min || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * 100},${22 - ((v - min) / rango) * 20}`).join(' ');
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" style={{ width: '100%', height: 24 }} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Indicadores() {
  const { esc, irA, agregarHallazgo, tieneHallazgo } = useSim();
  const [sel, setSel] = useState<string[]>([...esc.kpisIniciales]);
  const [vista, setVista] = useState<'grafico' | 'comparar' | 'tabla'>('grafico');
  const [diaMarcado, setDiaMarcado] = useState<number | null>(null);
  const [verEventos, setVerEventos] = useState(true);
  const [corte, setCorte] = useState(16);
  const [obs, setObs] = useState('');

  const kpiPorKey = useMemo(() => Object.fromEntries(esc.kpis.map((k) => [k.key, k])), [esc]);
  const grupos = useMemo(() => {
    const g: Record<string, KpiDef[]> = {};
    esc.kpis.forEach((k) => (g[k.grupo] ??= []).push(k));
    return g;
  }, [esc]);
  const serie = (k: string) => esc.dias.map((d) => Number(d[k]));
  const diasEventos = [...new Set(esc.bitacora.map((b) => b.dia))];

  const alternar = (key: string) => {
    setSel((s) => {
      if (s.includes(key)) return s.length > 1 ? s.filter((x) => x !== key) : s;
      return s.length >= 2 ? [s[1], key] : [...s, key];
    });
  };

  const marcarDia = (d: number) => {
    setDiaMarcado(d);
    const dia = esc.dias[d - 1];
    setObs(sel.map((k) => `${kpiPorKey[k].nombre}: ${formatear(dia[k], kpiPorKey[k])}`).join(' · ') + ` (día ${d}, ${dia.fecha}). `);
  };

  const unidadEje = (k?: KpiDef) => (k ? (k.formato === 'hora' ? 'hora' : k.unidad) : '');
  const kA = kpiPorKey[sel[0]];
  const kB = sel[1] ? kpiPorKey[sel[1]] : undefined;
  const mismoEje = kB && unidadEje(kA) === unidadEje(kB);

  const tickFmt = (k?: KpiDef) => (v: number) => {
    if (!k) return String(v);
    if (k.formato === 'clp') return '$' + Math.round(v / 1000).toLocaleString('es-CL') + 'k';
    if (k.formato === 'hora') return formatear(v, k);
    return redondear(v, 1).toLocaleString('es-CL');
  };

  return (
    <>
      <CabeceraPaso
        eyebrow="Paso 2 · Datos antes que opiniones"
        titulo="Tablero de indicadores · 30 días"
        derecha={
          <div className="pestanas">
            <button className={vista === 'grafico' ? 'on' : ''} onClick={() => setVista('grafico')}>
              Gráfico
            </button>
            <button className={vista === 'comparar' ? 'on' : ''} onClick={() => setVista('comparar')}>
              Comparar períodos
            </button>
            <button className={vista === 'tabla' ? 'on' : ''} onClick={() => setVista('tabla')}>
              Tabla de datos
            </button>
          </div>
        }
      >
        ¿Qué indicador cambió? ¿Desde qué día? ¿Qué indicadores <b>no</b> cambiaron? Lo que no cambia también es evidencia: sirve para descartar hipótesis. Anoten lo que encuentren con 📌.
      </CabeceraPaso>

      {vista === 'grafico' && (
        <div className="grid-2" style={{ gridTemplateColumns: '1.75fr 1fr', marginBottom: 18 }}>
          <div className="panel">
            <div className="grafico-cab">
              <div className="leyenda">
                {sel.map((k, i) => (
                  <span key={k}>
                    <i style={{ background: COLORES[i] }} />
                    {kpiPorKey[k].nombre} <span className="muted">({kpiPorKey[k].unidad})</span>
                  </span>
                ))}
              </div>
              <label className="small fila" style={{ gap: 6 }}>
                <input type="checkbox" checked={verEventos} onChange={(e) => setVerEventos(e.target.checked)} /> Eventos de bitácora
              </label>
            </div>
            <div style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer>
                <LineChart
                  data={esc.dias}
                  margin={{ top: 10, right: 10, left: 4, bottom: 0 }}
                  onClick={(s: any) => {
                    const d = Number(s?.activeLabel ?? (typeof s?.activeTooltipIndex === 'number' ? s.activeTooltipIndex + 1 : s?.activeIndex !== undefined ? Number(s.activeIndex) + 1 : NaN));
                    if (d >= 1 && d <= esc.dias.length) marcarDia(d);
                  }}
                  style={{ cursor: 'crosshair' }}
                >
                  <CartesianGrid stroke="#ebe7de" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={{ stroke: '#ddd8cd' }} interval={1} />
                  <YAxis yAxisId="a" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fill: COLORES[0] }} tickLine={false} axisLine={false} width={58} domain={['auto', 'auto']} tickFormatter={tickFmt(kA)} />
                  {kB && !mismoEje && (
                    <YAxis yAxisId="b" orientation="right" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono', fill: COLORES[1] }} tickLine={false} axisLine={false} width={58} domain={['auto', 'auto']} tickFormatter={tickFmt(kB)} />
                  )}
                  <Tooltip
                    labelFormatter={(d) => `Día ${d} · ${esc.dias[Number(d) - 1]?.fecha ?? ''}`}
                    formatter={(v: any, _n: any, item: any) => [formatear(v, kpiPorKey[item.dataKey]), kpiPorKey[item.dataKey].nombre]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #ddd8cd', fontSize: 13 }}
                  />
                  {verEventos && diasEventos.map((d) => <ReferenceLine key={'e' + d} x={d} yAxisId="a" stroke="#c9c2b4" strokeDasharray="2 4" />)}
                  {diaMarcado && <ReferenceLine x={diaMarcado} yAxisId="a" stroke="#1c2430" strokeWidth={1.5} label={{ value: `Día ${diaMarcado}`, position: 'insideTopLeft', fontSize: 11, fill: '#1c2430' }} />}
                  <Line yAxisId="a" dataKey={sel[0]} stroke={COLORES[0]} strokeWidth={2.4} dot={{ r: 2.5 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                  {sel[1] && <Line yAxisId={mismoEje ? 'a' : 'b'} dataKey={sel[1]} stroke={COLORES[1]} strokeWidth={2.4} dot={{ r: 2.5 }} activeDot={{ r: 5 }} isAnimationActive={false} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="small muted" style={{ marginTop: 6 }}>
              Haz clic en el gráfico para marcar un día. Elige hasta 2 indicadores en las tarjetas de abajo. Las líneas punteadas grises son días con eventos en la bitácora.
            </div>
            {diaMarcado && (
              <div className="panel-plano" style={{ marginTop: 12 }}>
                <div className="fila separa" style={{ marginBottom: 6 }}>
                  <b>
                    Día {diaMarcado} · {esc.dias[diaMarcado - 1].fecha}
                  </b>
                  <button className="btn btn-ghost btn-sm" onClick={() => setDiaMarcado(null)}>
                    Quitar marca
                  </button>
                </div>
                {esc.bitacora.filter((b) => b.dia === diaMarcado).map((b, i) => (
                  <div key={i} className="small" style={{ marginBottom: 4 }}>
                    📋 <b>{b.area}:</b> {b.texto}
                  </div>
                ))}
                <div className="agregar" style={{ marginTop: 6 }}>
                  <input type="text" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Escriban su observación..." />
                  <button
                    className="btn btn-dark btn-sm"
                    disabled={!obs.trim() || tieneHallazgo(obs.trim())}
                    onClick={() => agregarHallazgo({ fuente: 'Indicadores', texto: obs.trim() })}
                  >
                    {tieneHallazgo(obs.trim()) ? '✓ Anotado' : '📌 Anotar'}
                  </button>
                </div>
                <div className="small muted" style={{ marginTop: 4 }}>
                  Completen la observación con su interpretación (por ejemplo: «desde este día cae...»).
                </div>
              </div>
            )}
          </div>

          <div className="panel" style={{ maxHeight: 560, overflowY: 'auto' }}>
            <h3>Bitácora de la operación</h3>
            <p className="small muted">Registro de eventos del período. No todos son importantes: algunos son ruido.</p>
            <ul className="bitacora">
              {esc.bitacora.map((b, i) => {
                const texto = `Día ${b.dia} (${esc.dias[b.dia - 1].fecha}) · ${b.area}: ${b.texto}`;
                const ya = tieneHallazgo(texto);
                return (
                  <li key={i} className={diaMarcado === b.dia ? 'resaltado' : ''}>
                    <button className="btn btn-ghost btn-sm mono" style={{ padding: '0 4px' }} onClick={() => marcarDia(b.dia)} title="Marcar este día en el gráfico">
                      Día {b.dia}
                    </button>
                    <span>
                      <span className="area">{b.area}</span>
                      {b.texto}
                    </span>
                    <button className="btn btn-ghost btn-icon btn-sm" disabled={ya} title="Anotar como hallazgo" onClick={() => agregarHallazgo({ fuente: 'Bitácora', texto })}>
                      {ya ? '✓' : '📌'}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {vista === 'comparar' && (
        <div className="panel" style={{ marginBottom: 18 }}>
          <div className="comparador-ctl" style={{ marginBottom: 12 }}>
            <b>Estratificar en el tiempo:</b>
            <span>Período A: días 1 a {corte - 1}</span>
            <span>·</span>
            <span>
              Período B: desde el día{' '}
              <select value={corte} onChange={(e) => setCorte(Number(e.target.value))}>
                {esc.dias.slice(1).map((d) => (
                  <option key={d.dia} value={d.dia}>
                    {d.dia} ({d.fecha})
                  </option>
                ))}
              </select>{' '}
              al {esc.dias.length}
            </span>
          </div>
          <div className="tip" style={{ marginBottom: 12 }}>
            <span>💡</span>
            <span>Prueben distintos días de corte. Cuando eligen el día en que realmente cambió la operación, las diferencias se hacen más nítidas.</span>
          </div>
          <div className="tabla-wrap" style={{ maxHeight: 'none' }}>
            <table className="datos">
              <thead>
                <tr>
                  <th style={{ minWidth: 280 }}>Indicador</th>
                  <th>Prom. A</th>
                  <th>Prom. B</th>
                  <th>Variación</th>
                  <th style={{ minWidth: 60 }} />
                </tr>
              </thead>
              <tbody>
                {esc.kpis.map((k) => {
                  const v = serie(k.key);
                  const a = promedio(v.slice(0, corte - 1));
                  const b = promedio(v.slice(corte - 1));
                  const delta = a !== 0 ? ((b - a) / Math.abs(a)) * 100 : 0;
                  const relevante = Math.abs(delta) >= 5;
                  const empeora = k.mayorEsMejor ? delta < 0 : delta > 0;
                  const clase = !relevante ? '' : empeora ? 'delta-mal' : 'delta-bien';
                  const txtDelta = k.formato === 'hora' ? `${b - a >= 0 ? '+' : ''}${Math.round((b - a) * 60)} min` : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;
                  const texto = `${k.nombre}: promedio ${formatear(a, k)} (días 1–${corte - 1}) vs ${formatear(b, k)} (días ${corte}–${esc.dias.length}), variación ${txtDelta}.`;
                  const ya = tieneHallazgo(texto);
                  return (
                    <tr key={k.key}>
                      <td style={{ fontFamily: 'var(--font-body)' }}>
                        {k.nombre} <span className="muted small">· {k.grupo}</span>
                      </td>
                      <td>{formatear(a, k)}</td>
                      <td>{formatear(b, k)}</td>
                      <td className={clase}>{txtDelta}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" disabled={ya} onClick={() => agregarHallazgo({ fuente: 'Indicadores', texto })}>
                          {ya ? '✓' : '📌'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {vista === 'tabla' && (
        <div className="tabla-wrap" style={{ marginBottom: 18 }}>
          <table className="datos">
            <thead>
              <tr>
                <th style={{ minWidth: 110 }}>Día</th>
                {esc.kpis.map((k) => (
                  <th key={k.key} title={k.descripcion}>
                    {k.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {esc.dias.map((d) => (
                <tr key={d.dia} className={diaMarcado === d.dia ? 'marcado' : ''} onClick={() => setDiaMarcado(d.dia)} style={{ cursor: 'pointer' }}>
                  <td>
                    {String(d.dia).padStart(2, '0')} · {d.fecha} {diasEventos.includes(d.dia) ? '📋' : ''}
                  </td>
                  {esc.kpis.map((k) => (
                    <td key={k.key}>{formatear(d[k.key], k)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {vista !== 'tabla' &&
        Object.entries(grupos).map(([g, ks]) => (
          <div className="kpi-grupo" key={g}>
            <h4>{g}</h4>
            <div className="kpis">
              {ks.map((k) => {
                const v = serie(k.key);
                const i = sel.indexOf(k.key);
                return (
                  <button key={k.key} className={'kpi' + (i >= 0 ? ` sel-${i}` : '')} onClick={() => { alternar(k.key); setVista('grafico'); }} title={k.descripcion}>
                    <span className="nom">{k.nombre}</span>
                    <span className="val">{formatear(promedio(v), k)}</span>
                    <span className="sub">Promedio 30 días · último: {formatear(v[v.length - 1], k)}</span>
                    <Sparkline vals={v} color={i >= 0 ? COLORES[i] : '#9aa3ae'} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}

      <NavPasos atras={() => irA(1)} siguiente={() => irA(3)} textoSiguiente="Definir el problema →" />
    </>
  );
}
