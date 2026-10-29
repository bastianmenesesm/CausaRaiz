import { useEffect } from 'react';
import { useSim } from '../contexto';
import { CabeceraPaso, NavPasos } from '../components/ui';
import { Fishbone } from '../components/Fishbone';
import { CUADRANTES, MatrizSvg, cuadrante, type Cuadrante } from '../components/MatrizSvg';
import { CAMPOS_W } from './Definicion';
import { NIVEL_TXT } from './Validacion';

const Vacio = () => <span className="vacio">Sin completar</span>;

export function Informe() {
  const { esc, prog, grupo, irA } = useSim();

  useEffect(() => {
    const previo = document.title;
    const limpio = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '_');
    document.title = `Informe_CausaRaiz_${limpio(grupo.nombre || 'grupo')}_${limpio(esc.tipo)}`;
    return () => {
      document.title = previo;
    };
  }, [grupo.nombre, esc.tipo]);

  const idx = (id?: string) => (id ? prog.hallazgos.findIndex((h) => h.id === id) + 1 : 0);
  const ultimaOpcion = esc.opcionesCausa.find((o) => o.id === prog.causaRaiz.intentos[prog.causaRaiz.intentos.length - 1]);
  const encontrada = prog.causaRaiz.intentos.some((id) => esc.opcionesCausa.find((o) => o.id === id)?.nivel === 'raiz');
  const minutos = prog.inicioMs ? Math.round((Date.now() - prog.inicioMs) / 60000) : 0;
  const totalPreg = Object.values(prog.conversaciones).reduce((a, l) => a + l.length, 0);
  const orden: Cuadrante[] = ['quick', 'proyecto', 'menor', 'evitar'];
  const ideasOrdenadas = prog.ideas
    .map((i, n) => ({ i, n }))
    .sort((a, b) => {
      const qa = cuadrante(a.i), qb = cuadrante(b.i);
      return (qa ? orden.indexOf(qa) : 9) - (qb ? orden.indexOf(qb) : 9) || b.i.impacto - a.i.impacto;
    });
  const niveles = prog.porques.niveles.filter((n) => n.texto.trim());
  const fecha = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <>
      <CabeceraPaso
        eyebrow="Paso 10 · Entrega"
        titulo="Informe final"
        derecha={
          <button className="btn btn-primary no-print" onClick={() => window.print()}>
            🖨️ Descargar PDF
          </button>
        }
      >
        Revisen el informe. Al presionar «Descargar PDF», en el cuadro de impresión elijan <b>Destino: Guardar como PDF</b> y envíen el archivo a su docente. Si falta algo, vuelvan al paso
        correspondiente: todo se actualiza aquí.
      </CabeceraPaso>

      <article className="informe">
        <div className="bloque">
          <div className="small" style={{ color: 'var(--accent-ink)', fontFamily: 'var(--font-display)', letterSpacing: '0.12em', fontWeight: 700 }}>
            INFORME DE ANÁLISIS DE CAUSA RAÍZ · {esc.tipo.toUpperCase()}
          </div>
          <h1>
            {esc.empresa}: {esc.titulo}
          </h1>
          <div className="meta">
            <span>
              <b>Grupo:</b> {grupo.nombre || '—'}
            </span>
            <span>
              <b>Curso:</b> {grupo.curso || '—'}
            </span>
            <span>
              <b>Fecha:</b> {fecha}
            </span>
            <span>
              <b>Tiempo de trabajo:</b> {minutos} min
            </span>
          </div>
          <div className="small" style={{ marginTop: 4 }}>
            <b>Integrantes:</b> {grupo.integrantes.filter((x) => x.trim()).join(', ') || '—'}
          </div>
        </div>

        <h2>1. Definición del problema (5W2H)</h2>
        <table className="bloque">
          <tbody>
            {CAMPOS_W.map((c) => (
              <tr key={c.k}>
                <th>
                  {c.letra} <span className="muted" style={{ fontWeight: 400 }}>· {c.preg}</span>
                </th>
                <td>{prog.w5h2[c.k].trim() || <Vacio />}</td>
              </tr>
            ))}
            <tr>
              <th>Enunciado del problema</th>
              <td>
                <b>{prog.enunciado.trim() || <Vacio />}</b>
              </td>
            </tr>
          </tbody>
        </table>

        <h2>2. Evidencias recopiladas ({prog.hallazgos.length})</h2>
        <p className="small muted">
          Entrevistas realizadas: {totalPreg} preguntas a {Object.values(prog.conversaciones).filter((l) => l.length).length} de {esc.personajes.length} personas (
          {esc.personajes
            .filter((p) => prog.conversaciones[p.id]?.length)
            .map((p) => `${p.nombre} ${prog.conversaciones[p.id].length}`)
            .join(', ') || 'ninguna'}
          ).
        </p>
        {prog.hallazgos.length === 0 ? (
          <Vacio />
        ) : (
          <table>
            <tbody>
              {prog.hallazgos.map((h, i) => (
                <tr key={h.id} className="bloque">
                  <th style={{ width: 54 }}>H{i + 1}</th>
                  <td style={{ width: 170 }}>{h.fuente}</td>
                  <td>
                    {h.texto}
                    {h.nota && (
                      <div style={{ marginTop: 3 }}>
                        <b>Interpretación del grupo:</b> {h.nota}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2>3. Diagrama de Ishikawa</h2>
        <div className="bloque">
          <Fishbone efecto={prog.ishikawa.efecto} causas={prog.ishikawa.causas} />
        </div>
        {prog.ishikawa.causas.length > 0 && (
          <table style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Causa</th>
                <th style={{ width: 90 }}>Evidencia</th>
              </tr>
            </thead>
            <tbody>
              {prog.ishikawa.causas.map((c) => (
                <tr key={c.id} className="bloque">
                  <td>{c.categoria}</td>
                  <td>
                    {c.probable && <b style={{ color: 'var(--accent-ink)' }}>★ </b>}
                    {c.texto}
                  </td>
                  <td>{c.hallazgoId ? `H${idx(c.hallazgoId)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h2>4. Análisis de los 5 Porqués</h2>
        <table className="bloque">
          <tbody>
            <tr>
              <th>Problema</th>
              <td>{prog.porques.problema || <Vacio />}</td>
              <td style={{ width: 90 }} />
            </tr>
            {niveles.length === 0 && (
              <tr>
                <th>¿Por qué?</th>
                <td>
                  <Vacio />
                </td>
                <td />
              </tr>
            )}
            {niveles.map((n, i) => (
              <tr key={i}>
                <th>¿Por qué? {i + 1}</th>
                <td>{n.texto}</td>
                <td>{n.evidencia ? `H${idx(n.evidencia)}` : <span className="vacio">sin evidencia</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>5. Causa raíz</h2>
        <div className="bloque">
          <p style={{ fontSize: 15 }}>
            <b>Causa raíz identificada por el grupo:</b> {prog.causaRaiz.texto.trim() || <Vacio />}
          </p>
          <p className="small">
            <b>Validación en el simulador:</b>{' '}
            {encontrada
              ? `El grupo identificó la causa raíz del caso (${prog.causaRaiz.intentos.length} ${prog.causaRaiz.intentos.length === 1 ? 'intento' : 'intentos'}).`
              : ultimaOpcion
                ? `Última afirmación elegida clasificada como «${NIVEL_TXT[ultimaOpcion.nivel]}» (${prog.causaRaiz.intentos.length} intentos). No se alcanzó la causa raíz.`
                : 'No se realizó la validación.'}
          </p>
        </div>

        <h2>6. Lluvia de ideas ({prog.ideas.length} ideas)</h2>
        {prog.ideas.length === 0 ? (
          <Vacio />
        ) : (
          <ol>
            {prog.ideas.map((i) => (
              <li key={i.id}>
                {i.texto} <span className="muted">({i.autor})</span>
              </li>
            ))}
          </ol>
        )}

        <h2>7. Matriz de esfuerzo e impacto y priorización</h2>
        {prog.ideas.length > 0 && (
          <div className="bloque" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 18, alignItems: 'start' }}>
            <MatrizSvg ideas={prog.ideas} soloLectura />
            <table>
              <thead>
                <tr>
                  <th style={{ width: 'auto' }}>#</th>
                  <th style={{ width: 'auto' }}>Idea</th>
                  <th style={{ width: 'auto' }}>I</th>
                  <th style={{ width: 'auto' }}>E</th>
                  <th style={{ width: 'auto' }}>Cuadrante</th>
                </tr>
              </thead>
              <tbody>
                {ideasOrdenadas.map(({ i, n }) => {
                  const q = cuadrante(i);
                  return (
                    <tr key={i.id}>
                      <td>{n + 1}</td>
                      <td>
                        {i.texto}
                        {i.kpi && (
                          <div className="small">
                            <b>KPI de éxito:</b> {i.kpi}
                          </div>
                        )}
                      </td>
                      <td>{i.impacto || '–'}</td>
                      <td>{i.esfuerzo || '–'}</td>
                      <td>{q ? CUADRANTES[q].nombre : 'Sin evaluar'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {prog.ideas.length === 0 && <Vacio />}

        <p className="small muted" style={{ marginTop: 24, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
          Generado con el Simulador Causa Raíz · caso «{esc.titulo}» ({esc.empresa}, empresa ficticia).
        </p>
      </article>

      <NavPasos atras={() => irA(9)} />
    </>
  );
}
