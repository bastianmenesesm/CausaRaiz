import { useEffect, useState } from 'react';
import { useSim } from '../contexto';
import { CabeceraPaso, NavPasos } from '../components/ui';
import { uid } from '../lib/datos';

const COLORES_NOTA = ['#fff3a8', '#ffd8b8', '#cdeccf', '#cfe3f7', '#f3d3ec', '#e2dbf7', '#fde2e2'];
const DISPARADORES = [
  ['Eliminar', '¿Qué paso podríamos eliminar para que el error no pueda ocurrir?'],
  ['Estandarizar', '¿Qué procedimiento o checklist falta?'],
  ['Medir', '¿Qué indicador nos habría avisado antes?'],
  ['Coordinar', '¿Qué áreas deberían conversar y cuándo?'],
  ['Automatizar', '¿Qué podría hacer el sistema en vez de una persona?'],
  ['A prueba de errores', '¿Cómo hacemos que lo correcto sea lo más fácil?'],
  ['Capacitar', '¿Quién necesita saber algo que hoy no sabe?'],
  ['Rediseñar', '¿Qué cambiarían si partieran de cero?'],
];
const DURACION = 5 * 60;

export function LluviaIdeas() {
  const { prog, actualizar, irA, grupo } = useSim();
  const autores = [...grupo.integrantes.filter((x) => x.trim()), 'Grupo'];
  const [autor, setAutor] = useState(autores[0]);
  const [texto, setTexto] = useState('');
  const [restante, setRestante] = useState(DURACION);
  const [corriendo, setCorriendo] = useState(false);

  useEffect(() => {
    if (!corriendo) return;
    const t = setInterval(() => setRestante((r) => (r <= 1 ? (setCorriendo(false), 0) : r - 1)), 1000);
    return () => clearInterval(t);
  }, [corriendo]);

  const agregar = () => {
    if (!texto.trim()) return;
    actualizar((p) => ({ ...p, ideas: [...p.ideas, { id: uid(), texto: texto.trim(), autor, impacto: 0, esfuerzo: 0, kpi: '' }] }));
    setTexto('');
  };
  const colorDe = (a: string) => COLORES_NOTA[Math.max(0, autores.indexOf(a)) % COLORES_NOTA.length];
  const mm = String(Math.floor(restante / 60)).padStart(2, '0');
  const ss = String(restante % 60).padStart(2, '0');

  return (
    <>
      <CabeceraPaso
        eyebrow="Paso 8 · Divergir"
        titulo="Lluvia de ideas"
        derecha={
          <div className="panel-plano fila" style={{ gap: 12 }}>
            <span className={'temporizador' + (restante === 0 ? ' fin' : '')}>
              {mm}:{ss}
            </span>
            <div className="pila" style={{ gap: 4 }}>
              <button className="btn btn-sm btn-dark" onClick={() => setCorriendo(!corriendo)} disabled={restante === 0}>
                {corriendo ? '❚❚ Pausar' : '▶ Iniciar 5 min'}
              </button>
              <button className="btn btn-sm" onClick={() => { setCorriendo(false); setRestante(DURACION); }}>
                Reiniciar
              </button>
            </div>
          </div>
        }
      >
        Generen la mayor cantidad de ideas posible para eliminar la causa raíz (no el síntoma). Todavía no se evalúan: eso viene en la matriz.
      </CabeceraPaso>

      <div className="panel" style={{ borderLeft: '5px solid var(--accent)', marginBottom: 14 }}>
        <h4 style={{ marginBottom: 4 }}>Pregunta foco</h4>
        <p style={{ fontSize: 18, margin: 0, fontFamily: 'var(--font-display)', fontWeight: 600 }}>
          ¿Cómo podríamos lograr que «{prog.causaRaiz.texto.trim() || 'nuestra causa raíz'}» no vuelva a ocurrir?
        </p>
        {!prog.causaRaiz.texto.trim() && (
          <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => irA(7)}>
            Escribir la causa raíz primero
          </button>
        )}
      </div>

      <div className="reglas" style={{ marginBottom: 14 }}>
        <div className="regla">
          <b>Cantidad antes que calidad</b>Meta: al menos 2 ideas por integrante.
        </div>
        <div className="regla">
          <b>Sin críticas</b>Ninguna idea se descarta en esta etapa.
        </div>
        <div className="regla">
          <b>Construir sobre otras</b>«Sí, y además…» en vez de «sí, pero…».
        </div>
        <div className="regla">
          <b>Ideas audaces</b>Las ideas raras abren caminos nuevos.
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 14 }}>
        <div className="fila" style={{ flexWrap: 'nowrap' }}>
          <select value={autor} onChange={(e) => setAutor(e.target.value)} style={{ width: 180 }}>
            {autores.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <input type="text" value={texto} placeholder="Escriban una idea concreta y presionen Enter" onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && agregar()} />
          <button className="btn btn-primary" onClick={agregar} disabled={!texto.trim()}>
            Agregar
          </button>
        </div>
        <details style={{ marginTop: 10 }}>
          <summary className="small" style={{ cursor: 'pointer', fontWeight: 600 }}>
            ¿Se trabaron? Usen estos disparadores
          </summary>
          <div className="grid-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
            {DISPARADORES.map(([t, d]) => (
              <div key={t} className="panel-plano small">
                <b>{t}</b>
                <br />
                {d}
              </div>
            ))}
          </div>
        </details>
      </div>

      {prog.ideas.length === 0 ? (
        <div className="vacio-estado">Aún no hay ideas. ¡Empiecen!</div>
      ) : (
        <>
          <div className="small muted" style={{ marginBottom: 8 }}>
            {prog.ideas.length} ideas · pueden editar el texto haciendo clic en cada nota
          </div>
          <div className="notas">
            {prog.ideas.map((i, n) => (
              <div key={i.id} className="nota" style={{ background: colorDe(i.autor), ['--rot' as string]: `${((n * 37) % 5) - 2}deg` }}>
                <button className="x" title="Eliminar idea" onClick={() => actualizar((p) => ({ ...p, ideas: p.ideas.filter((x) => x.id !== i.id) }))}>
                  ✕
                </button>
                <textarea value={i.texto} onChange={(e) => actualizar((p) => ({ ...p, ideas: p.ideas.map((x) => (x.id === i.id ? { ...x, texto: e.target.value } : x)) }))} />
                <span className="autor">
                  #{n + 1} · {i.autor}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <NavPasos atras={() => irA(7)} siguiente={() => irA(9)} textoSiguiente="Priorizar en la matriz →" />
    </>
  );
}
