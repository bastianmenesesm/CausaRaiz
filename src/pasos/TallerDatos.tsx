import { useMemo, useState, type ChangeEvent } from 'react';
import { useSim } from '../contexto';
import { CabeceraPaso, NavPasos } from '../components/ui';
import type { RespuestaReto, TallerProgreso } from '../types';
import { codigoGrupo, descargarExcel, formatoValor, generarBase, leerNumero, type Reto } from '../taller';

const VACIO: TallerProgreso = { respuestas: {}, descargas: 0 };
export const FUENTE_DATOS = 'Base de datos';

/** Reduce la captura del dashboard para que quepa en el guardado del navegador. */
function reducirImagen(archivo: File, maxLado = 1600): Promise<string> {
  return new Promise((ok, mal) => {
    const lector = new FileReader();
    lector.onerror = () => mal(new Error('No se pudo leer el archivo'));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => mal(new Error('El archivo no es una imagen'));
      img.onload = () => {
        const f = Math.min(1, maxLado / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * f);
        c.height = Math.round(img.height * f);
        const g = c.getContext('2d')!;
        g.fillStyle = '#fff';
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        ok(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(lector.result);
    };
    lector.readAsDataURL(archivo);
  });
}

export function estadoReto(r: Reto, resp?: RespuestaReto) {
  if (!resp || !resp.intentos) return 'pendiente' as const;
  return resp.ok ? ('ok' as const) : ('mal' as const);
}

function TarjetaReto({ r, resp, onComprobar, onAnotar, anotado }: { r: Reto; resp?: RespuestaReto; onComprobar: (valor: string) => void; onAnotar: () => void; anotado: boolean }) {
  const [txt, setTxt] = useState(resp?.valor ?? '');
  const estado = estadoReto(r, resp);
  const intentos = resp?.intentos ?? 0;
  const v = leerNumero(txt, r.unidad);
  return (
    <div className={'reto ' + estado}>
      <div className="reto-cab">
        <b>{r.indicador}</b>
        {estado === 'ok' && <span className="chip ok">✓ Correcto</span>}
        {estado === 'mal' && <span className="chip mal">✗ {intentos} {intentos === 1 ? 'intento' : 'intentos'}</span>}
      </div>
      <p className="small">{r.pregunta}</p>
      <form
        className="fila"
        style={{ gap: 6 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (v !== null) onComprobar(txt);
        }}
      >
        {r.unidad === 'CLP' && <span className="unidad">$</span>}
        <input type="text" inputMode="decimal" value={txt} disabled={estado === 'ok'} onChange={(e) => setTxt(e.target.value)} placeholder={r.unidad === 'CLP' ? 'ej: 2.450' : r.decimales ? 'ej: ' + (12.3).toFixed(r.decimales).replace('.', ',') : 'ej: 12'} style={{ width: 120 }} />
        {r.unidad !== 'CLP' && <span className="unidad">{r.unidad}</span>}
        {estado !== 'ok' && (
          <button className="btn btn-sm btn-primary" disabled={v === null}>
            Comprobar
          </button>
        )}
        {estado === 'ok' && (
          <button type="button" className="btn btn-sm" disabled={anotado} onClick={onAnotar}>
            {anotado ? '✓ En el cuaderno' : '📌 Anotar'}
          </button>
        )}
      </form>
      <div className="small muted" style={{ marginTop: 4 }}>
        Redondeen a {r.decimales === 0 ? 'enteros' : r.decimales === 1 ? 'un decimal' : r.decimales + ' decimales'}.
      </div>
      {estado === 'mal' && intentos >= 1 && <div className="tip naranjo small">No coincide con su base. Revisen filtros, filas vacías y que usen la hoja correcta.</div>}
      {estado === 'mal' && intentos >= 2 && (
        <div className="tip small">
          <b>Pista:</b> {r.pista}
        </div>
      )}
      {estado === 'mal' && intentos >= 3 && (
        <div className="tip small">
          <b>Cómo se calcula:</b> {r.formula}
        </div>
      )}
      {estado === 'ok' && <div className="small muted">{r.formula}</div>}
    </div>
  );
}

export function TallerDatos() {
  const { esc, prog, grupo, actualizar, irA, agregarHallazgo, quitarHallazgo, tieneHallazgo } = useSim();
  const base = useMemo(() => generarBase(esc, grupo), [esc, grupo]);
  const taller = prog.taller ?? VACIO;
  const [descargando, setDescargando] = useState(false);
  const [errorImg, setErrorImg] = useState('');
  const [nota, setNota] = useState('');
  const codigo = codigoGrupo(grupo, esc.id);
  const correctos = base.retos.filter((r) => taller.respuestas[r.id]?.ok).length;
  const hallazgosDatos = prog.hallazgos.filter((h) => h.fuente === FUENTE_DATOS);

  const setTaller = (fn: (t: TallerProgreso) => TallerProgreso) => actualizar((p) => ({ ...p, taller: fn(p.taller ?? VACIO) }));

  const descargar = async () => {
    setDescargando(true);
    try {
      await new Promise((r) => setTimeout(r, 30)); // deja que se pinte el estado «Preparando…»
      await descargarExcel(base, `${esc.empresa} · Base de datos del grupo «${grupo.nombre || 'sin nombre'}» (código ${codigo})`);
      setTaller((t) => ({ ...t, descargas: t.descargas + 1 }));
    } finally {
      setDescargando(false);
    }
  };

  const comprobar = (r: Reto, valor: string) => {
    const v = leerNumero(valor, r.unidad);
    if (v === null) return;
    const ok = Math.abs(v - r.respuesta) <= r.tolerancia + (r.unidad === 'CLP' ? 0 : 1e-9);
    setTaller((t) => {
      const prev = t.respuestas[r.id];
      if (prev?.ok) return t;
      return { ...t, respuestas: { ...t.respuestas, [r.id]: { valor, ok, intentos: (prev?.intentos ?? 0) + 1 } } };
    });
  };

  const textoReto = (r: Reto) => `${r.indicador} del período: ${formatoValor(r.respuesta, r)} (calculado con la base del grupo).`;

  const subirImagen = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setErrorImg('');
    try {
      const url = await reducirImagen(f);
      setTaller((t) => ({ ...t, dashboard: url }));
    } catch (err) {
      setErrorImg((err as Error).message);
    }
  };

  return (
    <>
      <CabeceraPaso eyebrow="Paso 3 · Taller de datos" titulo="Calcular indicadores desde la base">
        El tablero muestra números ya calculados. Ahora les toca a ustedes: descarguen los registros de la operación, calculen los indicadores en Excel, armen un dashboard y busquen
        qué problemas muestran los datos. Cada grupo recibe una base con números propios.
      </CabeceraPaso>

      <div className="grid-2 taller-grid" style={{ marginBottom: 16, alignItems: 'start' }}>
        <div className="panel">
          <h3>1 · Descarguen su base</h3>
          {!grupo.nombre.trim() && <div className="tip naranjo small">El grupo no tiene nombre: vuelvan a la portada y regístrenlo antes de descargar, porque la base depende del nombre.</div>}
          <p className="small">{base.intro}</p>
          <table className="datos small hojas-base" style={{ margin: '8px 0' }}>
            <tbody>
              {base.hojas.map((h) => (
                <tr key={h.nombre}>
                  <th style={{ textAlign: 'left' }}>{h.nombre}</th>
                  <td>{h.filas.length.toLocaleString('es-CL')} filas</td>
                  <td className="muted">{h.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn btn-primary" onClick={descargar} disabled={descargando}>
            {descargando ? 'Preparando Excel…' : '⬇ Descargar base (Excel)'}
          </button>
          <div className="small muted" style={{ marginTop: 6, overflowWrap: 'anywhere' }}>
            Código de la base: <b>{codigo}</b> · {base.archivo}
          </div>
          <details style={{ marginTop: 10 }}>
            <summary className="small">Diccionario de datos</summary>
            {base.hojas.map((h) => (
              <div key={h.nombre} style={{ marginTop: 6 }}>
                <b className="small">{h.nombre}</b>
                <ul className="small" style={{ margin: '2px 0 0 16px' }}>
                  {h.columnas.filter((c) => c.desc).map((c) => (
                    <li key={c.titulo}>
                      <b>{c.titulo}:</b> {c.desc}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </details>
        </div>

        <div className="panel">
          <div className="fila" style={{ justifyContent: 'space-between' }}>
            <h3>2 · Calculen los indicadores</h3>
            <span className={'chip' + (correctos === base.retos.length ? ' ok' : '')}>
              {correctos} / {base.retos.length} correctos
            </span>
          </div>
          <p className="small muted">Escriban el resultado que obtuvieron en Excel y compruébenlo. Si no coincide, después del segundo intento aparece una pista.</p>
          <div className="retos">
            {base.retos.map((r) => (
              <TarjetaReto
                key={r.id + (taller.respuestas[r.id]?.ok ? '-ok' : '')}
                r={r}
                resp={taller.respuestas[r.id]}
                onComprobar={(v) => comprobar(r, v)}
                anotado={tieneHallazgo(textoReto(r))}
                onAnotar={() => agregarHallazgo({ fuente: FUENTE_DATOS, texto: textoReto(r) })}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2 taller-grid2" style={{ marginBottom: 16, alignItems: 'start' }}>
        <div className="panel">
          <h3>3 · Armen su dashboard en Excel</h3>
          <ul className="small" style={{ margin: '0 0 10px 18px' }}>
            <li>Una tabla dinámica por <b>Fecha</b> con los indicadores principales y un gráfico de líneas.</li>
            <li>Al menos una apertura por segmento (cliente, zona, ruta, turno, predio…) para ver <b>dónde</b> se concentra el problema.</li>
            <li>Tarjetas con los valores del período y una línea de meta cuando exista.</li>
          </ul>
          <p className="small muted">Cuando esté listo, tomen una captura de pantalla (tecla Impr Pant o Win + Shift + S) y súbanla. Va en el informe final.</p>
          <label className="btn">
            🖼️ {taller.dashboard ? 'Cambiar captura' : 'Subir captura del dashboard'}
            <input type="file" accept="image/*" onChange={subirImagen} style={{ display: 'none' }} />
          </label>
          {taller.dashboard && (
            <button className="btn btn-sm" style={{ marginLeft: 8 }} onClick={() => setTaller((t) => ({ ...t, dashboard: undefined }))}>
              Quitar
            </button>
          )}
          {errorImg && <div className="tip naranjo small">{errorImg}</div>}
          {taller.dashboard && <img src={taller.dashboard} alt="Dashboard del grupo" className="dashboard-img" />}
        </div>

        <div className="panel">
          <h3>4 · ¿Qué problemas muestran los datos?</h3>
          <p className="small muted">Usen estas preguntas para explorar su dashboard. Anoten cada hallazgo: queda en el cuaderno como evidencia para el 5W2H, el Ishikawa y los 5 Porqués.</p>
          <ul className="small" style={{ margin: '0 0 10px 18px' }}>
            {base.preguntasGuia.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <textarea rows={3} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej.: desde el 31-ago el OTD de la zona Sur cae de 93% a 70%, mientras Oriente se mantiene." style={{ width: '100%' }} />
          <button
            className="btn btn-primary btn-sm"
            disabled={!nota.trim()}
            onClick={() => {
              agregarHallazgo({ fuente: FUENTE_DATOS, texto: nota.trim() });
              setNota('');
            }}
          >
            📌 Anotar hallazgo
          </button>
          {hallazgosDatos.length > 0 && (
            <ul className="lista-hallazgos small">
              {hallazgosDatos.map((h) => (
                <li key={h.id}>
                  {h.texto}{' '}
                  <button className="btn-link" onClick={() => quitarHallazgo(h.id)} title="Quitar del cuaderno">
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <NavPasos atras={() => irA(2)} siguiente={() => irA(4)} textoSiguiente="Definir el problema →" />
    </>
  );
}
