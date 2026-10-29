// ─────────────────────────────────────────────────────────────
// Tipos del simulador. Un escenario se define completo en un
// archivo de src/data/ siguiendo estas estructuras.
// ─────────────────────────────────────────────────────────────

export type Animo =
  | 'furioso'
  | 'molesto'
  | 'nervioso'
  | 'asustado'
  | 'defensivo'
  | 'neutral'
  | 'cooperador'
  | 'aliviado'
  | 'entusiasta'
  | 'triste';

export type TipoPersonaje = 'Trabajador' | 'Jefatura' | 'Cliente' | 'Proveedor';

export interface Voz {
  genero: 'f' | 'm';
  /** 0.5 – 2  (1 = normal) */
  tono: number;
  /** 0.6 – 1.6 (1 = normal) */
  velocidad: number;
}

export interface Pregunta {
  id: string;
  texto: string;
  /** Párrafos de la respuesta. Se leen en voz alta en orden. */
  respuesta: string[];
  /** Solo aparece después de haber hecho estas preguntas (ids del mismo personaje). */
  requiere?: string[];
  /** Cambia el ánimo del personaje tras responder. */
  animo?: Animo;
  /** Uso docente: marca la información clave para llegar a la causa raíz. No se muestra al alumno. */
  clave?: boolean;
}

export interface Personaje {
  id: string;
  nombre: string;
  cargo: string;
  organizacion: string;
  tipo: TipoPersonaje;
  /** Descripción breve de su personalidad, visible para el alumno. */
  personalidad: string;
  animoInicial: Animo;
  color: string;
  voz: Voz;
  /** Lo primero que dice al iniciar la conversación. */
  saludo: string[];
  preguntas: Pregunta[];
}

export interface KpiDef {
  key: string;
  nombre: string;
  unidad: string;
  /** true si un valor más alto es mejor (para colorear tendencias). */
  mayorEsMejor: boolean;
  decimales: number;
  /** Cómo se muestra el valor. Por defecto 'num'. */
  formato?: 'num' | 'pct' | 'hora' | 'clp';
  descripcion: string;
  /** Grupo para ordenar el tablero. */
  grupo: string;
}

export interface DiaKpi {
  dia: number;
  fecha: string; // "lun 07-sep"
  [key: string]: number | string;
}

export interface EventoBitacora {
  dia: number;
  texto: string;
  area: string;
}

export type NivelCausa = 'sintoma' | 'intermedia' | 'raiz' | 'distractor';

export interface OpcionCausa {
  id: string;
  texto: string;
  nivel: NivelCausa;
  retro: string;
}

export type Categoria6M =
  | 'Mano de obra'
  | 'Método'
  | 'Máquina'
  | 'Material'
  | 'Medición'
  | 'Medio ambiente';

export const CATEGORIAS_6M: Categoria6M[] = [
  'Mano de obra',
  'Método',
  'Máquina',
  'Material',
  'Medición',
  'Medio ambiente',
];

export interface Escenario {
  id: string;
  tipo: string; // "Última milla"
  titulo: string;
  empresa: string;
  ubicacion: string;
  resumen: string;
  color: string;
  briefing: {
    personajeId: string;
    texto: string[];
    mision: string;
  };
  kpis: KpiDef[];
  /** KPIs que se grafican al abrir el tablero */
  kpisIniciales: [string, string];
  dias: DiaKpi[];
  bitacora: EventoBitacora[];
  personajes: Personaje[];
  opcionesCausa: OpcionCausa[];
  solucion: {
    cadena: string[]; // los 5 porqués de referencia
    ishikawa: Partial<Record<Categoria6M, string[]>>;
    explicacion: string[];
    ideasReferencia: string[];
  };
}

// ── Estado del trabajo del grupo ─────────────────────────────

export interface Hallazgo {
  id: string;
  fuente: string; // "Indicadores", "Bitácora" o nombre del personaje
  personajeId?: string;
  texto: string;
  nota: string;
}

export interface CausaIshikawa {
  id: string;
  categoria: Categoria6M;
  texto: string;
  hallazgoId?: string;
  probable: boolean;
}

export interface NivelPorque {
  texto: string;
  evidencia?: string; // id de hallazgo
}

export interface Idea {
  id: string;
  texto: string;
  autor: string;
  impacto: number; // 1-10 (0 = sin evaluar)
  esfuerzo: number; // 1-10 (0 = sin evaluar)
  kpi: string;
}

export type CampoW = 'que' | 'donde' | 'cuando' | 'quien' | 'porque' | 'como' | 'cuanto';

export interface Progreso {
  escenarioId: string;
  paso: number;
  w5h2: Record<CampoW, string>;
  enunciado: string;
  conversaciones: Record<string, string[]>;
  hallazgos: Hallazgo[];
  ishikawa: { efecto: string; causas: CausaIshikawa[] };
  porques: { problema: string; niveles: NivelPorque[] };
  causaRaiz: { texto: string; intentos: string[] };
  ideas: Idea[];
  inicioMs?: number;
}

export interface Grupo {
  nombre: string;
  curso: string;
  integrantes: string[];
}
