import { useEffect, useMemo, useState } from 'react';
import { useSim } from '../contexto';
import type { CausaIshikawa, Categoria6M, NivelCausa } from '../types';
import { BotonVoz, CabeceraPaso, NavPasos, leer } from '../components/ui';
import { Fishbone } from '../components/Fishbone';

export const NIVEL_TXT: Record<NivelCausa, string> = {
  raiz: 'Causa raíz',
  intermedia: 'Causa intermedia',
  sintoma: 'Síntoma',
  distractor: 'Descartada',
};

function hash(s: string) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0;
  return h;
}

export function Validacion() {
  const { esc, prog, actualizar, irA, vozAuto } = useSim();
  const gerente = esc.personajes.find((p) => p.id === esc.briefing.personajeId)!;
  const opciones = useMemo(() => [...esc.opcionesCausa].sort((a, b) => hash(a.id + esc.id) - hash(b.id + esc.id)), [esc]);
  const intentos = prog.causaRaiz.intentos;
  const ultima = intentos.length ? esc.opcionesCausa.find((o) => o.id === intentos[intentos.length - 1]) : undefined;
  const encontrada = intentos.some((id) => esc.opcionesCausa.find((o) => o.id === id)?.nivel === 'raiz');
  const [verSolucion, setVerSolucion] = useState(false);

  useEffect(() => {
    if (!prog.causaRaiz.texto.trim()) {
      const llenos = prog.porques.niveles.filter((n) => n.texto.trim());
      if (llenos.length) actualizar((p) => ({ ...p, causaRaiz: { ...p.causaRaiz, texto: llenos[llenos.length - 1].texto } }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elegir = (id: string) => {
    const o = esc.opcionesCausa.find((x) => x.id === id)!;
    actualizar((p) => ({ ...p, causaRaiz: { ...p.causaRaiz, intentos: [...p.causaRaiz.intentos, id] } }));
    if (vozAuto) leer('retro-' + id, [o.retro], gerente.voz, gerente.id);
  };

  const ishikawaRef: CausaIshikawa[] = Object.entries(esc.solucion.ishikawa).flatMap(([cat, lista]) =>
    (lista ?? []).map((t: string, i: number) => ({ id: cat + i, categoria: cat as Categoria6M, texto: t, probable: false })),
  );

  return (
    <>
      <CabeceraPaso eyebrow="Paso 7 · Contrastar" titulo="Validar la causa raíz">
        Escriban su causa raíz con sus palabras y luego elijan la afirmación que más se le parece. {gerente.nombre.split(' ')[0]} les dirá si llegaron al fondo o si se quedaron en un síntoma. Pueden
        intentar las veces que necesiten.
      </CabeceraPaso>

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'start' }}>
        <div className="pila">
          <div className="panel">
            <h3>Nuestra causa raíz</h3>
            <textarea rows={4} value={prog.causaRaiz.texto} placeholder="La causa raíz del problema es…" onChange={(e) => actualizar((p) => ({ ...p, causaRaiz: { ...p.causaRaiz, texto: e.target.value } }))} />
          </div>
          <div className="panel">
            <h3>¿Cuál de estas afirmaciones se parece más a su causa raíz?</h3>
            <div className="opciones">
              {opciones.map((o, i) => {
                const probada = intentos.includes(o.id);
                return (
                  <button key={o.id} className={'opcion' + (probada ? ' ' + o.nivel : '')} onClick={() => elegir(o.id)}>
                    <span className="letra">{String.fromCharCode(65 + i)}</span>
                    <span>{o.texto}</span>
                    {probada ? <span className={'nivel ' + o.nivel}>{NIVEL_TXT[o.nivel]}</span> : <span />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="pila" style={{ position: 'sticky', top: 0 }}>
          {!ultima && (
            <div className="vacio-estado">
              Elijan una afirmación para recibir retroalimentación.
              <br />
              <span className="small">Pista: un síntoma describe lo que se ve; una causa raíz explica por qué el sistema lo permitió.</span>
            </div>
          )}
          {ultima && (
            <div className={'retro ' + ultima.nivel}>
              <div className="fila separa" style={{ marginBottom: 8 }}>
                <span className={'nivel ' + ultima.nivel}>{NIVEL_TXT[ultima.nivel]}</span>
                <BotonVoz clave={'retro-' + ultima.id} parrafos={[ultima.retro]} voz={gerente.voz} idPersonaje={gerente.id} />
              </div>
              <p style={{ fontSize: 15.5, marginBottom: 0 }}>{ultima.retro}</p>
            </div>
          )}
          <div className="panel-plano small">
            Intentos: <b className="mono">{intentos.length}</b>
            {!encontrada && intentos.length >= 2 && (
              <button className="btn btn-sm" style={{ marginLeft: 10 }} onClick={() => setVerSolucion(true)}>
                Ver la explicación del caso
              </button>
            )}
          </div>
        </div>
      </div>

      {(encontrada || verSolucion) && (
        <div className="panel" style={{ marginTop: 18, borderTop: '4px solid var(--ok)' }}>
          <div className="fila separa">
            <h2>Explicación del caso</h2>
            <BotonVoz clave="explicacion" parrafos={esc.solucion.explicacion} voz={gerente.voz} idPersonaje={gerente.id} etiqueta="Escuchar explicación" />
          </div>
          <div className="grid-2" style={{ marginTop: 12, alignItems: 'start' }}>
            <div>
              <h4 style={{ marginBottom: 8 }}>Cadena de porqués de referencia</h4>
              <ol className="cadena">
                {esc.solucion.cadena.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ol>
            </div>
            <div>
              <h4 style={{ marginBottom: 8 }}>¿Cómo se resolvía?</h4>
              {esc.solucion.explicacion.map((t, i) => (
                <p key={i} className="small" style={{ fontSize: 14 }}>
                  {t}
                </p>
              ))}
            </div>
          </div>
          <h4 style={{ margin: '14px 0 8px' }}>Ishikawa de referencia (comparen con el suyo)</h4>
          <Fishbone efecto={esc.solucion.cadena[0].split('(')[0].slice(0, 110)} causas={ishikawaRef} compacto />
        </div>
      )}

      <NavPasos atras={() => irA(6)} siguiente={() => irA(8)} textoSiguiente="Lluvia de ideas →" />
    </>
  );
}
