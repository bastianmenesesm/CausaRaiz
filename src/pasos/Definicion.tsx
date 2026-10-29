import { useSim } from '../contexto';
import type { CampoW } from '../types';
import { CabeceraPaso, NavPasos } from '../components/ui';

export const CAMPOS_W: { k: CampoW; letra: string; preg: string; guia: string; ej: string }[] = [
  { k: 'que', letra: 'Qué', preg: '¿Qué problema se observa?', guia: 'Describan el efecto con un indicador, sin mencionar causas ni culpables.', ej: 'Ej.: cae el % de pedidos entregados completos.' },
  { k: 'donde', letra: 'Dónde', preg: '¿Dónde ocurre?', guia: '¿En qué zona, ruta, proceso, cliente o turno se concentra? ¿Dónde NO ocurre?', ej: 'Ej.: principalmente en el turno de la tarde.' },
  { k: 'cuando', letra: 'Cuándo', preg: '¿Cuándo comenzó y cuándo ocurre?', guia: 'Día de inicio según los datos, frecuencia, franja horaria.', ej: 'Ej.: desde el día X, todos los días hábiles.' },
  { k: 'quien', letra: 'Quién', preg: '¿A quién afecta y quiénes participan?', guia: 'Clientes afectados, áreas y personas involucradas en el proceso.', ej: 'Ej.: afecta a clientes A y B; participan bodega y transporte.' },
  { k: 'porque', letra: 'Por qué', preg: '¿Por qué es importante resolverlo?', guia: 'Impacto en el negocio. Ojo: aquí NO va la causa, va la relevancia.', ej: 'Ej.: riesgo de perder el contrato y multas.' },
  { k: 'como', letra: 'Cómo', preg: '¿Cómo se manifiesta?', guia: '¿Cómo se detecta? ¿Qué se ve en la operación? ¿Cómo ha evolucionado?', ej: 'Ej.: reclamos diarios, reintentos que se acumulan.' },
  { k: 'cuanto', letra: 'Cuánto', preg: '¿Cuánto? (magnitud y costo)', guia: 'Cuantifiquen: valor antes vs. después, brecha con la meta, costo en CLP.', ej: 'Ej.: de 95% a 82% (meta 94%), ≈ $X millones al mes.' },
];

export function borradorEnunciado(w: Record<CampoW, string>) {
  const partes = [w.que, w.donde && `(${w.donde})`, w.cuando && `— ${w.cuando}`, w.cuanto && `. Magnitud: ${w.cuanto}`, w.quien && `. Afecta a: ${w.quien}`, w.porque && `. Importancia: ${w.porque}`];
  return partes.filter(Boolean).join(' ').replace(/\s+\./g, '.').trim();
}

export function Definicion() {
  const { prog, actualizar, irA, abrirCuaderno } = useSim();
  const w = prog.w5h2;

  return (
    <>
      <CabeceraPaso eyebrow="Paso 3 · 5W2H" titulo="Definir el problema">
        Un problema bien definido es la mitad de la solución. Usen solo lo que muestran los datos: todavía <b>no</b> sabemos la causa.
      </CabeceraPaso>

      <div className="fila" style={{ marginBottom: 14 }}>
        <button className="btn btn-sm" onClick={abrirCuaderno}>
          📒 Ver cuaderno de hallazgos ({prog.hallazgos.length})
        </button>
        <span className="small muted">Pueden volver a los indicadores cuando quieran.</span>
      </div>

      <div className="w-grid">
        {CAMPOS_W.map((c) => (
          <div key={c.k} className={'w-card' + (w[c.k].trim() ? ' lleno' : '')}>
            <div className="fila" style={{ gap: 12, alignItems: 'baseline' }}>
              <span className="letra">{c.letra}</span>
              <span className="preg">{c.preg}</span>
            </div>
            <span className="guia">{c.guia}</span>
            <textarea
              value={w[c.k]}
              placeholder={c.ej}
              rows={2}
              onChange={(e) => actualizar((p) => ({ ...p, w5h2: { ...p.w5h2, [c.k]: e.target.value } }))}
            />
          </div>
        ))}
        <div className="w-card" style={{ background: 'var(--panel-2)' }}>
          <span className="letra" style={{ color: 'var(--ink)' }}>
            Enunciado
          </span>
          <span className="guia">Una o dos oraciones que cualquier persona de la empresa entienda. Será la «cabeza» del Ishikawa.</span>
          <textarea
            value={prog.enunciado}
            rows={4}
            placeholder="Desde el día __, el indicador __ cayó de __ a __ en __, afectando a __ con un costo de __."
            onChange={(e) => actualizar((p) => ({ ...p, enunciado: e.target.value }))}
          />
          <button className="btn btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => actualizar((p) => ({ ...p, enunciado: borradorEnunciado(p.w5h2) }))}>
            Armar borrador con el 5W2H
          </button>
        </div>
      </div>

      <div className="tip" style={{ marginTop: 16 }}>
        <span>✔️</span>
        <span>
          Chequeo de calidad: ¿su enunciado tiene un <b>indicador</b>, una <b>fecha de inicio</b>, una <b>magnitud</b> y <b>no menciona culpables</b>? Si dice «los conductores...» o «la bodega...», todavía es una hipótesis.
        </span>
      </div>

      <NavPasos atras={() => irA(2)} siguiente={() => irA(4)} textoSiguiente="Ir a las entrevistas →" />
    </>
  );
}
