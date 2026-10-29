import { useState } from 'react';
import { useSim } from '../contexto';

/** Panel lateral con todas las evidencias que el grupo ha anotado. */
export function Cuaderno({ abierto, cerrar }: { abierto: boolean; cerrar: () => void }) {
  const { prog, actualizar, quitarHallazgo, agregarHallazgo } = useSim();
  const [nuevo, setNuevo] = useState('');

  return (
    <aside className={'cuaderno' + (abierto ? ' abierto' : '')} aria-hidden={!abierto}>
      <div className="cuaderno-cab">
        <div>
          <h3>Cuaderno de hallazgos</h3>
          <div className="small muted">Evidencias para el Ishikawa y los 5 Porqués</div>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={cerrar} aria-label="Cerrar cuaderno">
          ✕
        </button>
      </div>
      <div className="cuaderno-cuerpo">
        {prog.hallazgos.length === 0 && (
          <div className="vacio-estado small">
            Todavía no hay hallazgos. Usa el botón <b>📌 Anotar</b> en los indicadores, la bitácora o las entrevistas.
          </div>
        )}
        {prog.hallazgos.map((h, i) => (
          <div className="hallazgo" key={h.id}>
            <div className="fuente">
              <span>
                H{i + 1} · {h.fuente}
              </span>
              <button className="btn btn-ghost btn-sm" style={{ padding: '0 4px' }} onClick={() => quitarHallazgo(h.id)} title="Eliminar hallazgo">
                ✕
              </button>
            </div>
            <div className="txt">{h.texto}</div>
            <input
              type="text"
              placeholder="Nota del grupo (¿qué significa esto?)"
              value={h.nota}
              onChange={(e) =>
                actualizar((p) => ({ ...p, hallazgos: p.hallazgos.map((x) => (x.id === h.id ? { ...x, nota: e.target.value } : x)) }))
              }
            />
          </div>
        ))}
      </div>
      <div className="cuaderno-pie">
        <label className="small" style={{ fontWeight: 600 }}>
          Agregar observación propia
        </label>
        <div className="agregar">
          <input
            type="text"
            value={nuevo}
            placeholder="Ej.: la hora de salida no cambia en todo el mes"
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && nuevo.trim()) {
                agregarHallazgo({ fuente: 'Observación del grupo', texto: nuevo.trim() });
                setNuevo('');
              }
            }}
          />
          <button
            className="btn btn-dark btn-sm"
            disabled={!nuevo.trim()}
            onClick={() => {
              agregarHallazgo({ fuente: 'Observación del grupo', texto: nuevo.trim() });
              setNuevo('');
            }}
          >
            Agregar
          </button>
        </div>
      </div>
    </aside>
  );
}
