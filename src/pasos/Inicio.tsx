import { useState } from 'react';
import type { Escenario, Grupo } from '../types';
import { almacen } from '../lib/storage';
import { EspinaDecorativa } from '../components/ui';
import { vozDisponible } from '../lib/voz';

export function Inicio({ grupo, setGrupo, escenarios, iniciar }: { grupo: Grupo; setGrupo: (g: Grupo) => void; escenarios: Escenario[]; iniciar: (id: string) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const [, refrescar] = useState(0);
  const integrantesOk = grupo.integrantes.filter((x) => x.trim()).length >= 1;
  const listo = grupo.nombre.trim() && integrantesOk && sel;

  const setIntegrante = (i: number, v: string) => {
    const lista = [...grupo.integrantes];
    lista[i] = v;
    setGrupo({ ...grupo, integrantes: lista });
  };

  return (
    <div className="portada">
      <section className="portada-izq">
        <EspinaDecorativa className="portada-espina" />
        <div className="marca" style={{ fontSize: 18 }}>
          CAUSA RAÍZ <small>simulador logístico</small>
        </div>
        <h1>
          No busquen culpables.
          <br />
          <span>Busquen la causa.</span>
        </h1>
        <p>
          Una empresa de Santiago tiene un problema en su operación. Ustedes son el equipo de mejora continua: revisen 30 días de indicadores, entrevisten a trabajadores, clientes y
          proveedores, y lleguen a la causa raíz antes de proponer soluciones.
        </p>
        <div className="herramientas">
          <span>5W2H</span>
          <span>ISHIKAWA 6M</span>
          <span>5 PORQUÉS</span>
          <span>LLUVIA DE IDEAS</span>
          <span>MATRIZ ESFUERZO / IMPACTO</span>
        </div>
        <div className="flujo">
          {['Indicadores', 'Definir problema', 'Entrevistas', 'Ishikawa', '5 Porqués', 'Validar', 'Ideas', 'Priorizar', 'Informe PDF'].map((t, i) => (
            <span key={t}>
              {i > 0 && <span style={{ marginRight: 8 }}>→</span>}
              <b>{t}</b>
            </span>
          ))}
        </div>
        <p className="small" style={{ marginTop: 'auto', color: '#8193a8' }}>
          Duración sugerida: 60 minutos · trabajo en grupo · {vozDisponible() ? 'usen audífonos o parlantes: los personajes hablan' : 'este navegador no permite voz; usen Chrome o Edge para escuchar a los personajes'}
        </p>
      </section>

      <section className="portada-der">
        <div>
          <h4>1 · Su equipo</h4>
        </div>
        <div className="grid-2">
          <div className="campo">
            <label htmlFor="g-nombre">Nombre del grupo</label>
            <input id="g-nombre" type="text" value={grupo.nombre} placeholder="Ej.: Grupo 3" onChange={(e) => setGrupo({ ...grupo, nombre: e.target.value })} />
          </div>
          <div className="campo">
            <label htmlFor="g-curso">Curso / sección</label>
            <input id="g-curso" type="text" value={grupo.curso} placeholder="Ej.: Ing. en Logística · Sección 402" onChange={(e) => setGrupo({ ...grupo, curso: e.target.value })} />
          </div>
        </div>
        <div className="campo">
          <label>Integrantes</label>
          <div className="integrantes">
            {grupo.integrantes.map((v, i) => (
              <input key={i} type="text" value={v} placeholder={`Integrante ${i + 1}`} onChange={(e) => setIntegrante(i, e.target.value)} />
            ))}
          </div>
          {grupo.integrantes.length < 6 && (
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setGrupo({ ...grupo, integrantes: [...grupo.integrantes, ''] })}>
              + Agregar integrante
            </button>
          )}
        </div>

        <div style={{ marginTop: 6 }}>
          <h4>2 · Elijan el caso</h4>
        </div>
        <div className="pila">
          {escenarios.map((e) => {
            const p = almacen.progreso(e.id);
            const estado = p ? `En curso · paso ${p.paso} de 10` : 'Nuevo';
            return (
              <button key={e.id} className={'tarjeta-caso' + (sel === e.id ? ' sel' : '')} onClick={() => setSel(e.id)}>
                <span className="franja" style={{ background: e.color }} />
                <span className="cuerpo">
                  <span className="tipo" style={{ color: e.color }}>
                    {e.tipo}
                  </span>
                  <h3>{e.titulo}</h3>
                  <p>
                    <b>{e.empresa}</b> · {e.ubicacion}
                  </p>
                  <p style={{ marginTop: 4 }}>{e.resumen}</p>
                </span>
                <span className="estado">{estado}</span>
              </button>
            );
          })}
        </div>

        <div className="fila separa" style={{ marginTop: 4 }}>
          <span className="small muted">{!grupo.nombre.trim() ? 'Escriban el nombre del grupo.' : !integrantesOk ? 'Agreguen al menos un integrante.' : !sel ? 'Seleccionen un caso.' : '¡Listos!'}</span>
          <div className="fila">
            {sel && almacen.progreso(sel) && (
              <button
                className="btn"
                onClick={() => {
                  if (window.confirm('¿Borrar el avance de este caso y empezar de cero?')) {
                    almacen.borrarProgreso(sel);
                    refrescar((n) => n + 1);
                  }
                }}
              >
                Reiniciar caso
              </button>
            )}
            <button className="btn btn-primary" disabled={!listo} onClick={() => sel && iniciar(sel)}>
              {sel && almacen.progreso(sel) ? 'Continuar caso →' : 'Comenzar caso →'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
