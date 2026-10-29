import { useSim } from '../contexto';
import type { Idea } from '../types';
import { CabeceraPaso, NavPasos } from '../components/ui';
import { CUADRANTES, MatrizSvg, cuadrante, evaluada, type Cuadrante } from '../components/MatrizSvg';

export function Matriz() {
  const { esc, prog, actualizar, irA } = useSim();
  const ideas = prog.ideas;
  const setIdea = (id: string, cambios: Partial<Idea>) => actualizar((p) => ({ ...p, ideas: p.ideas.map((i) => (i.id === id ? { ...i, ...cambios } : i)) }));
  const pendientes = ideas.filter((i) => !evaluada(i)).length;
  const orden: Cuadrante[] = ['quick', 'proyecto', 'menor', 'evitar'];

  if (ideas.length === 0) {
    return (
      <>
        <CabeceraPaso eyebrow="Paso 9 · Converger" titulo="Matriz de esfuerzo e impacto" />
        <div className="vacio-estado">
          Primero necesitan ideas.{' '}
          <button className="btn btn-sm" onClick={() => irA(8)}>
            Ir a la lluvia de ideas
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <CabeceraPaso eyebrow="Paso 9 · Converger" titulo="Matriz de esfuerzo e impacto">
        Evalúen cada idea de 1 a 10. <b>Impacto</b>: cuánto reduce el problema o evita que vuelva. <b>Esfuerzo</b>: costo, tiempo, personas y dificultad para implementarla. Arrastren los puntos o usen los
        controles.
      </CabeceraPaso>

      {pendientes > 0 && (
        <div className="tip naranjo" style={{ marginBottom: 14 }}>
          <span>⏳</span>
          <span>
            Faltan {pendientes} {pendientes === 1 ? 'idea' : 'ideas'} por evaluar. Aparecerán en la matriz cuando les asignen impacto y esfuerzo.
          </span>
        </div>
      )}

      <div className="matriz-layout">
        <div style={{ position: 'sticky', top: 0 }}>
          <MatrizSvg ideas={ideas} onMover={(id, esfuerzo, impacto) => setIdea(id, { esfuerzo, impacto })} />
        </div>
        <div className="panel" style={{ padding: '6px 16px' }}>
          {ideas.map((i, n) => {
            const q = cuadrante(i);
            return (
              <div className="idea-fila" key={i.id}>
                <span className="num" style={{ background: q ? CUADRANTES[q].color : '#9aa3ae' }}>
                  {n + 1}
                </span>
                <div className="pila" style={{ gap: 6 }}>
                  <div className="fila separa" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                    <span style={{ fontSize: 14.5 }}>{i.texto}</span>
                    {q ? (
                      <span className={'cuadrante-tag ' + CUADRANTES[q].clase}>{CUADRANTES[q].nombre}</span>
                    ) : (
                      <button className="btn btn-sm" onClick={() => setIdea(i.id, { impacto: 5, esfuerzo: 5 })}>
                        Evaluar
                      </button>
                    )}
                  </div>
                  {evaluada(i) && (
                    <>
                      <label className="deslizador">
                        Impacto
                        <input type="range" min={1} max={10} value={i.impacto} onChange={(e) => setIdea(i.id, { impacto: Number(e.target.value) })} />
                        <b className="mono">{i.impacto}</b>
                      </label>
                      <label className="deslizador">
                        Esfuerzo
                        <input type="range" min={1} max={10} value={i.esfuerzo} onChange={(e) => setIdea(i.id, { esfuerzo: Number(e.target.value) })} />
                        <b className="mono">{i.esfuerzo}</b>
                      </label>
                      {(q === 'quick' || q === 'proyecto') && (
                        <input
                          type="text"
                          style={{ fontSize: 13, padding: '5px 8px' }}
                          value={i.kpi}
                          placeholder="¿Qué indicador mostraría que funcionó? (ej.: % a tiempo PM > 90%)"
                          onChange={(e) => setIdea(i.id, { kpi: e.target.value })}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <h2 style={{ margin: '24px 0 10px' }}>Priorización resultante</h2>
      <div className="grid-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {orden.map((q) => {
          const lista = ideas.map((i, n) => ({ i, n })).filter(({ i }) => cuadrante(i) === q).sort((a, b) => b.i.impacto - a.i.impacto || a.i.esfuerzo - b.i.esfuerzo);
          return (
            <div key={q} className="panel" style={{ borderTop: `4px solid ${CUADRANTES[q].color}`, padding: 14 }}>
              <h3 style={{ fontSize: 18, marginBottom: 2 }}>{CUADRANTES[q].nombre}</h3>
              <div className="small muted" style={{ marginBottom: 8 }}>
                {CUADRANTES[q].desc}
              </div>
              {lista.length === 0 ? (
                <span className="small muted">—</span>
              ) : (
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13.5 }}>
                  {lista.map(({ i, n }) => (
                    <li key={i.id} style={{ marginBottom: 4 }}>
                      <b>#{n + 1}</b> {i.texto}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>

      {pendientes === 0 && (
        <details className="panel" style={{ marginTop: 16 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Comparen con ideas de referencia para este caso</summary>
          <ul style={{ marginTop: 10 }}>
            {esc.solucion.ideasReferencia.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="small muted" style={{ marginBottom: 0 }}>
            No son «la respuesta correcta»: sirven para discutir qué se les pasó y por qué sus ideas pueden ser mejores para esta empresa.
          </p>
        </details>
      )}

      <NavPasos atras={() => irA(8)} siguiente={() => irA(10)} textoSiguiente="Generar informe →" />
    </>
  );
}
