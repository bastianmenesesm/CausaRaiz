import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import type { Escenario, Grupo, Hallazgo, Progreso } from './types';
import { ESCENARIOS, obtenerEscenario } from './data';
import { almacen, progresoVacio } from './lib/storage';
import { uid } from './lib/datos';
import { cargarVoces, vozDisponible } from './lib/voz';
import { cargarManifest } from './lib/audio';
import { Contexto, type Ctx } from './contexto';
import { Cuaderno } from './components/Cuaderno';
import { pararLectura } from './components/ui';
import { Inicio } from './pasos/Inicio';
import { Briefing } from './pasos/Briefing';
import { Indicadores } from './pasos/Indicadores';
import { Definicion } from './pasos/Definicion';
import { Entrevistas } from './pasos/Entrevistas';
import { IshikawaPaso } from './pasos/IshikawaPaso';
import { CincoPorques } from './pasos/CincoPorques';
import { Validacion } from './pasos/Validacion';
import { LluviaIdeas } from './pasos/LluviaIdeas';
import { Matriz } from './pasos/Matriz';
import { Informe } from './pasos/Informe';

interface PasoDef {
  titulo: string;
  minutos: number;
  hecho: (p: Progreso, e: Escenario) => boolean;
  Comp: () => ReactElement;
}

export const PASOS: PasoDef[] = [
  { titulo: 'Briefing del caso', minutos: 3, hecho: (p) => p.paso > 1, Comp: Briefing },
  { titulo: 'Indicadores', minutos: 8, hecho: (p) => p.hallazgos.some((h) => h.fuente === 'Indicadores' || h.fuente === 'Bitácora'), Comp: Indicadores },
  { titulo: 'Definir el problema (5W2H)', minutos: 7, hecho: (p) => Object.values(p.w5h2).filter((v) => v.trim()).length >= 6, Comp: Definicion },
  { titulo: 'Entrevistas', minutos: 17, hecho: (p) => Object.values(p.conversaciones).reduce((a, l) => a + l.length, 0) >= 12, Comp: Entrevistas },
  { titulo: 'Diagrama de Ishikawa', minutos: 7, hecho: (p) => p.ishikawa.causas.length >= 6, Comp: IshikawaPaso },
  { titulo: '5 Porqués', minutos: 6, hecho: (p) => p.porques.niveles.filter((n) => n.texto.trim()).length >= 4, Comp: CincoPorques },
  { titulo: 'Validar causa raíz', minutos: 2, hecho: (p, e) => p.causaRaiz.intentos.some((id) => e.opcionesCausa.find((o) => o.id === id)?.nivel === 'raiz'), Comp: Validacion },
  { titulo: 'Lluvia de ideas', minutos: 5, hecho: (p) => p.ideas.length >= 6, Comp: LluviaIdeas },
  { titulo: 'Matriz esfuerzo / impacto', minutos: 5, hecho: (p) => p.ideas.length > 0 && p.ideas.every((i) => i.impacto > 0 && i.esfuerzo > 0), Comp: Matriz },
  { titulo: 'Informe final (PDF)', minutos: 0, hecho: () => false, Comp: Informe },
];

const DURACION_CLASE_MIN = 60;

function useReloj(inicio?: number) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!inicio) return null;
  return Math.max(0, Math.floor((ahora - inicio) / 1000));
}

export default function App() {
  const [grupo, setGrupo] = useState<Grupo>(() => almacen.grupo() ?? { nombre: '', curso: '', integrantes: ['', '', '', ''] });
  const [escId, setEscId] = useState<string | null>(() => {
    const u = almacen.ultimoEscenario();
    return obtenerEscenario(u) ? u : null;
  });
  const [prog, setProg] = useState<Progreso | null>(() => (escId ? almacen.progreso(escId) ?? progresoVacio(escId) : null));
  const [cuaderno, setCuaderno] = useState(false);
  const [vozAuto, setVozAuto] = useState(() => almacen.preferencias()?.vozAuto ?? true);

  const esc = useMemo(() => obtenerEscenario(escId), [escId]);

  const [nAudios, setNAudios] = useState(0);
  useEffect(() => {
    cargarVoces();
    cargarManifest().then(setNAudios);
  }, []);
  const hayVoz = vozDisponible() || nAudios > 0;
  useEffect(() => almacen.guardarGrupo(grupo), [grupo]);
  useEffect(() => {
    if (prog) almacen.guardarProgreso(prog);
  }, [prog]);
  useEffect(() => almacen.guardarPreferencias({ vozAuto }), [vozAuto]);

  const actualizar = useCallback((fn: (p: Progreso) => Progreso) => setProg((p) => (p ? fn(p) : p)), []);

  const irA = useCallback(
    (paso: number) => {
      pararLectura();
      actualizar((p) => ({ ...p, paso }));
      document.querySelector('.main')?.scrollTo({ top: 0 });
    },
    [actualizar],
  );

  const iniciarCaso = (id: string) => {
    const existente = almacen.progreso(id);
    const p = existente ?? progresoVacio(id);
    if (!p.inicioMs) p.inicioMs = Date.now();
    setEscId(id);
    setProg(p);
    almacen.guardarUltimo(id);
  };

  const salir = () => {
    pararLectura();
    setEscId(null);
    setProg(null);
    almacen.guardarUltimo(null);
  };

  const segundos = useReloj(prog?.inicioMs);

  const ctx: Ctx | null = useMemo(() => {
    if (!esc || !prog) return null;
    return {
      esc,
      prog,
      grupo,
      actualizar,
      irA,
      vozAuto: vozAuto && hayVoz,
      agregarHallazgo: (h) =>
        actualizar((p) =>
          p.hallazgos.some((x) => x.texto === h.texto)
            ? p
            : { ...p, hallazgos: [...p.hallazgos, { id: uid(), nota: '', ...h } as Hallazgo] },
        ),
      quitarHallazgo: (id) =>
        actualizar((p) => ({
          ...p,
          hallazgos: p.hallazgos.filter((h) => h.id !== id),
          ishikawa: { ...p.ishikawa, causas: p.ishikawa.causas.map((c) => (c.hallazgoId === id ? { ...c, hallazgoId: undefined } : c)) },
          porques: { ...p.porques, niveles: p.porques.niveles.map((n) => (n.evidencia === id ? { ...n, evidencia: undefined } : n)) },
        })),
      tieneHallazgo: (texto) => prog.hallazgos.some((h) => h.texto === texto),
      abrirCuaderno: () => setCuaderno(true),
    };
  }, [esc, prog, grupo, actualizar, irA, vozAuto, hayVoz]);

  if (!esc || !prog || !ctx) {
    return <Inicio grupo={grupo} setGrupo={setGrupo} escenarios={ESCENARIOS} iniciar={iniciarCaso} nAudios={nAudios} />;
  }

  const pasoIdx = Math.min(Math.max(prog.paso, 1), PASOS.length) - 1;
  const Paso = PASOS[pasoIdx].Comp;
  const min = segundos !== null ? Math.floor(segundos / 60) : 0;
  const reloj = segundos !== null ? `${String(min).padStart(2, '0')}:${String(segundos % 60).padStart(2, '0')}` : '00:00';

  return (
    <Contexto.Provider value={ctx}>
      <div className="app">
        <header className="topbar">
          <div className="marca">
            <svg viewBox="0 0 64 64" aria-hidden>
              <rect width="64" height="64" rx="12" fill="#273241" />
              <path d="M10 32h36" stroke="#f26b1d" strokeWidth="4" />
              <path d="M46 24l8 8-8 8z" fill="#f26b1d" />
              <path d="M18 32l-6-12M30 32l-6-12M18 32l-6 12M30 32l-6 12" stroke="#e8edf3" strokeWidth="3" strokeLinecap="round" />
            </svg>
            CAUSA RAÍZ <small>simulador logístico</small>
          </div>
          <div className="caso">
            <b>{esc.empresa}</b> · {esc.tipo}
            {grupo.nombre && <> · {grupo.nombre}</>}
          </div>
          <div className="espaciador" />
          <span className={'reloj' + (min >= DURACION_CLASE_MIN ? ' alerta' : '')} title="Tiempo transcurrido desde que el grupo inició el caso">
            ⏱ {reloj} / {DURACION_CLASE_MIN}:00
          </span>
          {hayVoz && (
            <button className={'btn btn-sm' + (vozAuto ? ' on' : '')} onClick={() => { if (vozAuto) pararLectura(); setVozAuto(!vozAuto); }} title="Leer automáticamente lo que dicen los personajes">
              {vozAuto ? '🔊 Voz automática' : '🔈 Voz manual'}
            </button>
          )}
          <button className={'btn btn-sm' + (cuaderno ? ' on' : '')} onClick={() => setCuaderno(!cuaderno)}>
            📒 Cuaderno ({prog.hallazgos.length})
          </button>
          <button className="btn btn-sm" onClick={salir} title="Volver a la portada (el avance queda guardado)">
            Salir
          </button>
        </header>

        <nav className="sidebar">
          <h4>Recorrido · 60 min</h4>
          {PASOS.map((p, i) => {
            const activo = i === pasoIdx;
            const hecho = !activo && p.hecho(prog, esc);
            return (
              <button key={p.titulo} className={'paso-item' + (activo ? ' activo' : '') + (hecho ? ' hecho' : '')} onClick={() => irA(i + 1)}>
                <span className="paso-num">{hecho ? '✓' : i + 1}</span>
                <span className="paso-txt">{p.titulo}</span>
                {p.minutos > 0 && <span className="paso-min">{p.minutos}′</span>}
              </button>
            );
          })}
          <div className="pie">
            <b>{esc.titulo}</b>
            <br />
            {grupo.integrantes.filter((x) => x.trim()).join(', ') || 'Sin integrantes registrados'}
            <br />
            <br />
            El avance se guarda automáticamente en este navegador.
          </div>
        </nav>

        <main className="main">
          <div className="contenido">
            <Paso key={pasoIdx} />
          </div>
        </main>
        <Cuaderno abierto={cuaderno} cerrar={() => setCuaderno(false)} />
      </div>
    </Contexto.Provider>
  );
}
