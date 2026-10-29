import { useEffect, useRef, useState } from 'react';
import { useSim } from '../contexto';
import type { Animo, Personaje, TipoPersonaje } from '../types';
import { ANIMOS, Avatar, BotonVoz, CabeceraPaso, NavPasos, leer } from '../components/ui';

const TIPOS: (TipoPersonaje | 'Todos')[] = ['Todos', 'Trabajador', 'Jefatura', 'Cliente', 'Proveedor'];
const MIN_POR_PREGUNTA = 2;

export function animoActual(p: Personaje, hechas: string[]): Animo {
  let a = p.animoInicial;
  for (const id of hechas) {
    const q = p.preguntas.find((x) => x.id === id);
    if (q?.animo) a = q.animo;
  }
  return a;
}

export function Entrevistas() {
  const { esc, prog, actualizar, irA, vozAuto, agregarHallazgo, tieneHallazgo } = useSim();
  const [filtro, setFiltro] = useState<(typeof TIPOS)[number]>('Todos');
  const [selId, setSelId] = useState<string>(() => esc.personajes.find((p) => !(prog.conversaciones[p.id]?.length))?.id ?? esc.personajes[0].id);
  const [pensando, setPensando] = useState<string | null>(null);
  const cuerpo = useRef<HTMLDivElement>(null);

  const p = esc.personajes.find((x) => x.id === selId)!;
  const hechas = prog.conversaciones[p.id] ?? [];
  const disponibles = p.preguntas.filter((q) => !hechas.includes(q.id) && (q.requiere ?? []).every((r) => hechas.includes(r)));
  const total = Object.values(prog.conversaciones).reduce((a, l) => a + l.length, 0);
  const animo = animoActual(p, hechas);

  useEffect(() => {
    cuerpo.current?.scrollTo({ top: cuerpo.current.scrollHeight, behavior: 'smooth' });
  }, [hechas.length, pensando, selId]);

  const seleccionar = (per: Personaje) => {
    setSelId(per.id);
    setPensando(null);
    if (vozAuto && !(prog.conversaciones[per.id]?.length)) leer('saludo-' + per.id, per.saludo, per.voz, per.id);
  };

  const preguntar = (qid: string) => {
    if (pensando) return;
    const q = p.preguntas.find((x) => x.id === qid)!;
    setPensando(qid);
    setTimeout(() => {
      actualizar((pr) => ({ ...pr, conversaciones: { ...pr.conversaciones, [p.id]: [...(pr.conversaciones[p.id] ?? []), qid] } }));
      setPensando(null);
      if (vozAuto) leer(`r-${p.id}-${qid}`, q.respuesta, p.voz, p.id);
    }, 650);
  };

  const fuente = `${p.nombre} · ${p.cargo}`;

  return (
    <>
      <CabeceraPaso
        eyebrow="Paso 4 · Ir al gemba"
        titulo="Entrevistas"
        derecha={
          <div className="panel-plano small" style={{ textAlign: 'right' }}>
            <div>
              <b className="mono" style={{ fontSize: 18 }}>{total}</b> preguntas realizadas
            </div>
            <div className="muted">≈ {total * MIN_POR_PREGUNTA} min de entrevista simulados</div>
          </div>
        }
      >
        Cada persona conoce solo una parte de la historia y tiene su propio punto de vista. Algunas se contradicen. Contrasten lo que dicen con los datos y anoten con 📌 lo que sea evidencia.
      </CabeceraPaso>

      <div className="entrevistas">
        <div className="lista-personajes">
          <div className="fila" style={{ gap: 4 }}>
            {TIPOS.map((t) => (
              <button key={t} className={'btn btn-sm' + (filtro === t ? ' btn-dark' : '')} onClick={() => setFiltro(t)}>
                {t}
              </button>
            ))}
          </div>
          {esc.personajes
            .filter((x) => filtro === 'Todos' || x.tipo === filtro)
            .map((x) => {
              const h = prog.conversaciones[x.id] ?? [];
              return (
                <button key={x.id} className={'tarjeta-p' + (x.id === selId ? ' sel' : '')} onClick={() => seleccionar(x)}>
                  <Avatar p={x} animo={animoActual(x, h)} size={46} />
                  <span>
                    <div className="n">{x.nombre}</div>
                    <div className="c">
                      {x.cargo} · {x.organizacion}
                    </div>
                    <div className="meta">
                      <span className={'chip ' + x.tipo}>{x.tipo}</span>
                      <span className="barra" title={`${h.length} de ${x.preguntas.length} preguntas`}>
                        <div style={{ width: `${(h.length / x.preguntas.length) * 100}%` }} />
                      </span>
                      <span className="small muted mono">
                        {h.length}/{x.preguntas.length}
                      </span>
                    </div>
                  </span>
                </button>
              );
            })}
        </div>

        <div className="chat">
          <div className="chat-cab">
            <Avatar p={p} animo={animo} size={56} />
            <div className="info">
              <div className="fila" style={{ gap: 8 }}>
                <h3 style={{ margin: 0 }}>{p.nombre}</h3>
                <span className={'chip ' + p.tipo}>{p.tipo}</span>
                <span className="chip">
                  {ANIMOS[animo].emoji} {ANIMOS[animo].label}
                </span>
              </div>
              <div className="small">
                {p.cargo} · {p.organizacion}
              </div>
              <div className="personalidad">{p.personalidad}</div>
            </div>
          </div>

          <div className="chat-cuerpo" ref={cuerpo}>
            <div className="msg ellos">
              {p.saludo.map((t, i) => (
                <p key={i}>{t}</p>
              ))}
              <div className="acciones">
                <BotonVoz clave={'saludo-' + p.id} parrafos={p.saludo} voz={p.voz} idPersonaje={p.id} />
              </div>
            </div>
            {hechas.map((qid) => {
              const q = p.preguntas.find((x) => x.id === qid);
              if (!q) return null;
              const texto = q.respuesta.join(' ');
              const ya = tieneHallazgo(texto);
              return (
                <div key={qid} style={{ display: 'contents' }}>
                  <div className="msg nos">{q.texto}</div>
                  <div className={'msg ellos' + (ya ? ' anotado' : '')}>
                    {q.respuesta.map((t, i) => (
                      <p key={i}>{t}</p>
                    ))}
                    <div className="acciones">
                      <BotonVoz clave={`r-${p.id}-${qid}`} parrafos={q.respuesta} voz={p.voz} idPersonaje={p.id} />
                      <button className="btn btn-sm" disabled={ya} onClick={() => agregarHallazgo({ fuente, personajeId: p.id, texto })}>
                        {ya ? '✓ En el cuaderno' : '📌 Anotar hallazgo'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {pensando && (
              <>
                <div className="msg nos">{p.preguntas.find((x) => x.id === pensando)?.texto}</div>
                <div className="escribiendo">{p.nombre.split(' ')[0]} está respondiendo…</div>
              </>
            )}
          </div>

          <div className="preguntas">
            <h4>{disponibles.length ? `Preguntas disponibles (${disponibles.length})` : 'No quedan preguntas para esta persona'}</h4>
            <div className="preguntas-lista">
              {disponibles.map((q) => (
                <button key={q.id} className="btn-preg" onClick={() => preguntar(q.id)} disabled={!!pensando}>
                  {q.requiere?.length ? <span className="nueva">Repregunta</span> : null}
                  <span>{q.texto}</span>
                </button>
              ))}
              {!disponibles.length && <span className="small muted">Ya obtuvieron todo lo que esta persona sabe. Prueben con otra o contrasten lo dicho con los indicadores.</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="tip" style={{ marginTop: 16 }}>
        <span>🧭</span>
        <span>
          Las <b>repreguntas</b> aparecen cuando una respuesta abre un tema nuevo. Las mejores pistas suelen estar en la segunda o tercera pregunta, no en la primera. Y una persona molesta o asustada puede
          tener razón en los hechos aunque se equivoque en el culpable.
        </span>
      </div>

      <NavPasos atras={() => irA(3)} siguiente={() => irA(5)} textoSiguiente="Construir el Ishikawa →" />
    </>
  );
}
