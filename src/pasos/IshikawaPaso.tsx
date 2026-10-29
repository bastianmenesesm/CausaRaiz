import { useEffect, useState } from 'react';
import { useSim } from '../contexto';
import { CATEGORIAS_6M, type Categoria6M } from '../types';
import { CabeceraPaso, NavPasos } from '../components/ui';
import { Fishbone } from '../components/Fishbone';
import { uid } from '../lib/datos';

export const DEF_6M: Record<Categoria6M, string> = {
  'Mano de obra': 'Personas: habilidades, carga de trabajo, dotación, motivación.',
  'Método': 'Procedimientos, políticas, coordinación, forma de hacer el trabajo.',
  'Máquina': 'Equipos, vehículos, sistemas y software.',
  'Material': 'Productos, carga, insumos, embalajes.',
  'Medición': 'Indicadores, registros, controles, información disponible.',
  'Medio ambiente': 'Entorno: clima, infraestructura, condiciones externas.',
};

export function IshikawaPaso() {
  const { prog, actualizar, irA } = useSim();
  const { efecto, causas } = prog.ishikawa;
  const [nuevos, setNuevos] = useState<Record<string, string>>({});
  const [evid, setEvid] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!efecto.trim() && (prog.enunciado.trim() || prog.w5h2.que.trim())) {
      actualizar((p) => ({ ...p, ishikawa: { ...p.ishikawa, efecto: (p.w5h2.que || p.enunciado).slice(0, 140) } }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCausas = (fn: (c: typeof causas) => typeof causas) => actualizar((p) => ({ ...p, ishikawa: { ...p.ishikawa, causas: fn(p.ishikawa.causas) } }));

  const agregar = (cat: Categoria6M, texto: string, hallazgoId?: string) => {
    if (!texto.trim()) return;
    setCausas((c) => [...c, { id: uid(), categoria: cat, texto: texto.trim(), hallazgoId, probable: false }]);
  };

  const sinClasificar = prog.hallazgos.filter((h) => !causas.some((c) => c.hallazgoId === h.id));
  const idx = (id?: string) => (id ? prog.hallazgos.findIndex((h) => h.id === id) + 1 : 0);

  return (
    <>
      <CabeceraPaso eyebrow="Paso 5 · Diagrama causa-efecto" titulo="Ishikawa · 6M">
        Ordenen las posibles causas en las seis familias. Escriban cada causa como un hecho concreto («el software usa 4 min por parada»), no como un juicio («la gente es floja»). Marquen con ★ las
        causas más probables según la evidencia.
      </CabeceraPaso>

      <div className="campo" style={{ marginBottom: 12 }}>
        <label>Efecto (cabeza del pescado): el problema definido en el 5W2H</label>
        <input type="text" value={efecto} placeholder="Ej.: cae el % de entregas a tiempo desde el día X" onChange={(e) => actualizar((p) => ({ ...p, ishikawa: { ...p.ishikawa, efecto: e.target.value } }))} />
      </div>

      <Fishbone efecto={efecto} causas={causas} />

      {sinClasificar.length > 0 && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3>Hallazgos sin clasificar ({sinClasificar.length})</h3>
          <p className="small muted">Conviertan cada hallazgo relevante en una causa: elijan la familia y luego ajusten la redacción. Los hallazgos que solo describen el problema son síntomas: no los pongan como causa.</p>
          <div className="pila" style={{ gap: 8 }}>
            {sinClasificar.map((h) => (
              <div key={h.id} className="fila" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', borderBottom: '1px solid var(--line-2)', paddingBottom: 8 }}>
                <span className="mono small" style={{ color: 'var(--accent-ink)', minWidth: 30 }}>
                  H{idx(h.id)}
                </span>
                <span className="small" style={{ flex: 1 }}>
                  <b>{h.fuente}:</b> {h.texto}
                  {h.nota && <em className="muted"> — {h.nota}</em>}
                </span>
                <select
                  style={{ width: 170 }}
                  value=""
                  onChange={(e) => {
                    const cat = e.target.value as Categoria6M;
                    if (cat) agregar(cat, h.nota || (h.texto.length > 110 ? h.texto.slice(0, 108) + '…' : h.texto), h.id);
                  }}
                >
                  <option value="">Clasificar en…</option>
                  {CATEGORIAS_6M.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="cat-grid" style={{ marginTop: 16 }}>
        {CATEGORIAS_6M.map((cat) => {
          const lista = causas.filter((c) => c.categoria === cat);
          return (
            <div className="cat-card" key={cat}>
              <h3>
                {cat} <span className="small muted mono">{lista.length}</span>
              </h3>
              <div className="def">{DEF_6M[cat]}</div>
              {lista.map((c) => (
                <div className="causa" key={c.id}>
                  <button className={'estrella' + (c.probable ? ' on' : '')} title="Marcar como causa más probable" onClick={() => setCausas((cs) => cs.map((x) => (x.id === c.id ? { ...x, probable: !x.probable } : x)))}>
                    ★
                  </button>
                  <span>
                    <textarea
                      value={c.texto}
                      rows={2}
                      style={{ border: 'none', background: 'transparent', padding: 0, minHeight: 0, fontSize: 13.5, boxShadow: 'none' }}
                      onChange={(e) => setCausas((cs) => cs.map((x) => (x.id === c.id ? { ...x, texto: e.target.value } : x)))}
                    />
                    {c.hallazgoId && <span className="ev">Evidencia: H{idx(c.hallazgoId)}</span>}
                  </span>
                  <button className="x" title="Eliminar" onClick={() => setCausas((cs) => cs.filter((x) => x.id !== c.id))}>
                    ✕
                  </button>
                </div>
              ))}
              <div className="agregar">
                <input
                  type="text"
                  placeholder="Nueva causa…"
                  value={nuevos[cat] ?? ''}
                  onChange={(e) => setNuevos({ ...nuevos, [cat]: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      agregar(cat, nuevos[cat] ?? '', evid[cat] || undefined);
                      setNuevos({ ...nuevos, [cat]: '' });
                    }
                  }}
                />
                <button
                  className="btn btn-dark btn-sm"
                  onClick={() => {
                    agregar(cat, nuevos[cat] ?? '', evid[cat] || undefined);
                    setNuevos({ ...nuevos, [cat]: '' });
                  }}
                >
                  +
                </button>
              </div>
              {prog.hallazgos.length > 0 && (
                <select className="small" style={{ fontSize: 12.5, padding: '4px 6px' }} value={evid[cat] ?? ''} onChange={(e) => setEvid({ ...evid, [cat]: e.target.value })}>
                  <option value="">Evidencia para la nueva causa (opcional)</option>
                  {prog.hallazgos.map((h, i) => (
                    <option key={h.id} value={h.id}>
                      H{i + 1} · {h.texto.slice(0, 60)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>

      <div className="tip naranjo" style={{ marginTop: 16 }}>
        <span>🔍</span>
        <span>
          Antes de avanzar, revisen cada ★: ¿hay un dato o una entrevista que la respalde? ¿Coincide en el tiempo con el inicio del problema? Si una causa existía antes de que empezara el problema, difícilmente lo explica.
        </span>
      </div>

      <NavPasos atras={() => irA(4)} siguiente={() => irA(6)} textoSiguiente="Aplicar los 5 Porqués →" />
    </>
  );
}
