import { useEffect } from 'react';
import { useSim } from '../contexto';
import { Avatar, BotonVoz, CabeceraPaso, NavPasos, leer } from '../components/ui';

export function Briefing() {
  const { esc, irA, vozAuto, grupo } = useSim();
  const gerente = esc.personajes.find((p) => p.id === esc.briefing.personajeId)!;

  useEffect(() => {
    if (vozAuto) leer('briefing', esc.briefing.texto, gerente.voz, gerente.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nIntegrantes = grupo.integrantes.filter((x) => x.trim()).length;

  return (
    <>
      <CabeceraPaso eyebrow={`Paso 1 · ${esc.tipo}`} titulo={esc.titulo}>
        Escuchen a quien les encarga el análisis. Tomen nota de lo que <b>cree</b> que pasa: es una opinión, no un hecho. Ustedes tendrán que verificarlo.
      </CabeceraPaso>

      <div className="briefing">
        <div className="globo">
          <div className="persona-cabecera">
            <Avatar p={gerente} animo={gerente.animoInicial} size={60} />
            <div style={{ flex: 1 }}>
              <div className="nombre">{gerente.nombre}</div>
              <div className="cargo">
                {gerente.cargo} · {gerente.organizacion}
              </div>
            </div>
            <BotonVoz clave="briefing" parrafos={esc.briefing.texto} voz={gerente.voz} idPersonaje={gerente.id} />
          </div>
          {esc.briefing.texto.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </div>

        <div className="pila">
          <div className="panel ficha">
            <h3>Ficha de la empresa</h3>
            <dl>
              <dt>Empresa</dt>
              <dd>{esc.empresa}</dd>
              <dt>Operación</dt>
              <dd>{esc.tipo}</dd>
              <dt>Ubicación</dt>
              <dd>{esc.ubicacion}</dd>
              <dt>Período</dt>
              <dd>
                30 días operativos ({esc.dias[0].fecha} al {esc.dias[esc.dias.length - 1].fecha})
              </dd>
              <dt>Personas</dt>
              <dd>{esc.personajes.length} entrevistables</dd>
            </dl>
          </div>
          <div className="panel" style={{ borderTop: '4px solid var(--accent)' }}>
            <h3>Su misión</h3>
            <p>{esc.briefing.mision}</p>
            <p className="small muted" style={{ marginBottom: 0 }}>
              Sugerencia para {nIntegrantes > 1 ? `los ${nIntegrantes} integrantes` : 'el grupo'}: repartan roles. Una persona maneja el computador, otra lleva el cuaderno de hallazgos, otra controla el tiempo y
              otra cuestiona las conclusiones («¿cómo lo sabemos?»).
            </p>
          </div>
          <div className="tip naranjo">
            <span>⚠️</span>
            <span>
              Trampa clásica: aceptar la primera explicación que da la jefatura. Toda hipótesis debe apoyarse en un dato o en una entrevista.
            </span>
          </div>
        </div>
      </div>

      <NavPasos siguiente={() => irA(2)} textoSiguiente="Revisar los indicadores →" />
    </>
  );
}
