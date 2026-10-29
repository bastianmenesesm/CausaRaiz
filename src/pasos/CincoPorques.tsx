import { useEffect } from 'react';
import { useSim } from '../contexto';
import type { NivelPorque } from '../types';
import { CabeceraPaso, NavPasos } from '../components/ui';

export function CincoPorques() {
  const { prog, actualizar, irA } = useSim();
  const { problema, niveles } = prog.porques;
  const probables = prog.ishikawa.causas.filter((c) => c.probable);

  useEffect(() => {
    if (!problema.trim() && (prog.ishikawa.efecto || prog.enunciado)) {
      actualizar((p) => ({ ...p, porques: { ...p.porques, problema: p.ishikawa.efecto || p.enunciado } }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setNiveles = (fn: (n: NivelPorque[]) => NivelPorque[]) => actualizar((p) => ({ ...p, porques: { ...p.porques, niveles: fn(p.porques.niveles) } }));
  const llenos = niveles.filter((n) => n.texto.trim());
  const anterior = (i: number) => (i === 0 ? problema : niveles[i - 1].texto) || '…';

  return (
    <>
      <CabeceraPaso eyebrow="Paso 6 · Profundizar" titulo="5 Porqués">
        Partan del problema y pregunten «¿por qué?» hasta llegar a una causa que, si se corrige, evita que el problema vuelva a ocurrir. Cada respuesta debe apoyarse en evidencia. No siempre son exactamente
        cinco: pueden ser cuatro, seis o siete.
      </CabeceraPaso>

      {probables.length > 0 && (
        <div className="panel-plano" style={{ marginBottom: 14 }}>
          <b className="small">Sus causas marcadas con ★ en el Ishikawa:</b>
          <div className="fila" style={{ marginTop: 6, gap: 6 }}>
            {probables.map((c) => (
              <span key={c.id} className="chip" style={{ background: 'var(--warn-soft)', color: '#7a5604' }}>
                ★ {c.categoria}: {c.texto.slice(0, 70)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid-2" style={{ gridTemplateColumns: '1.4fr 1fr', alignItems: 'start' }}>
        <div className="porques">
          <div className="porque problema">
            <div className="n">P</div>
            <div className="caja">
              <span className="label">Problema</span>
              <textarea rows={2} value={problema} onChange={(e) => actualizar((p) => ({ ...p, porques: { ...p.porques, problema: e.target.value } }))} />
            </div>
          </div>
          {niveles.map((n, i) => (
            <div className="porque" key={i}>
              <div className="n">{i + 1}</div>
              <div className="caja">
                <span className="label">¿Por qué ocurre «{anterior(i).slice(0, 90)}{anterior(i).length > 90 ? '…' : ''}»?</span>
                <textarea rows={2} value={n.texto} placeholder="Porque…" onChange={(e) => setNiveles((ns) => ns.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)))} />
                <div className="fila" style={{ gap: 6 }}>
                  <select
                    style={{ flex: 1, fontSize: 13, padding: '5px 8px' }}
                    value={n.evidencia ?? ''}
                    onChange={(e) => setNiveles((ns) => ns.map((x, j) => (j === i ? { ...x, evidencia: e.target.value || undefined } : x)))}
                  >
                    <option value="">¿Qué evidencia lo respalda? (elijan un hallazgo)</option>
                    {prog.hallazgos.map((h, k) => (
                      <option key={h.id} value={h.id}>
                        H{k + 1} · {h.fuente}: {h.texto.slice(0, 70)}
                      </option>
                    ))}
                  </select>
                  {niveles.length > 3 && (
                    <button className="btn btn-ghost btn-sm" title="Quitar este nivel" onClick={() => setNiveles((ns) => ns.filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  )}
                </div>
                {n.texto.trim() && !n.evidencia && <span className="small" style={{ color: 'var(--warn)' }}>⚠ Sin evidencia: ¿es un hecho o una suposición?</span>}
              </div>
            </div>
          ))}
          {niveles.length < 7 && (
            <button className="btn" style={{ marginLeft: 70, alignSelf: 'flex-start' }} onClick={() => setNiveles((ns) => [...ns, { texto: '' }])}>
              + Otro «¿por qué?»
            </button>
          )}
        </div>

        <div className="pila" style={{ position: 'sticky', top: 0 }}>
          <div className="panel">
            <h3>Prueba de la lectura inversa</h3>
            <p className="small muted">Lean la cadena desde abajo hacia arriba usando «por lo tanto». Si alguna frase no tiene sentido, falta un eslabón o hay un salto lógico.</p>
            {llenos.length < 2 ? (
              <div className="vacio-estado small">Completen al menos dos porqués para ver la lectura inversa.</div>
            ) : (
              <div className="lectura-inversa">
                {[...llenos].reverse().map((n, i) => (
                  <span key={i}>
                    {i > 0 && <b> → por lo tanto, </b>}
                    {n.texto.trim().replace(/^porque\s+/i, '')}
                  </span>
                ))}
                <b> → por lo tanto, </b>
                {problema}
              </div>
            )}
          </div>
          <div className="tip">
            <span>🎯</span>
            <span>
              Señales de que llegaron a la causa raíz: está bajo el control de la empresa, explica <b>cuándo</b> empezó el problema y <b>dónde</b> se concentra, y si la corrigen, el problema no
              vuelve. Si la respuesta es «error humano» o el nombre de una persona, sigan preguntando: ¿por qué el sistema permitió ese error?
            </span>
          </div>
        </div>
      </div>

      <NavPasos atras={() => irA(5)} siguiente={() => irA(7)} textoSiguiente="Validar la causa raíz →" />
    </>
  );
}
