// Guardado automático en el navegador para no perder el avance si se recarga la página.
import type { Grupo, Progreso } from '../types';

const PREFIJO = 'causaraiz:v1:';

function leer<T>(clave: string): T | null {
  try {
    const raw = window.localStorage.getItem(PREFIJO + clave);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: unknown) {
  try {
    window.localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento disponible: el simulador sigue funcionando en memoria */
  }
}

function borrar(clave: string) {
  try {
    window.localStorage.removeItem(PREFIJO + clave);
  } catch {
    /* nada */
  }
}

export const almacen = {
  grupo: () => leer<Grupo>('grupo'),
  guardarGrupo: (g: Grupo) => escribir('grupo', g),
  progreso: (id: string) => leer<Progreso>('progreso:' + id),
  guardarProgreso: (p: Progreso) => escribir('progreso:' + p.escenarioId, p),
  borrarProgreso: (id: string) => borrar('progreso:' + id),
  ultimoEscenario: () => leer<string>('ultimo'),
  guardarUltimo: (id: string | null) => (id ? escribir('ultimo', id) : borrar('ultimo')),
  preferencias: () => leer<{ vozAuto: boolean }>('prefs'),
  guardarPreferencias: (p: { vozAuto: boolean }) => escribir('prefs', p),
};

export function progresoVacio(escenarioId: string): Progreso {
  return {
    escenarioId,
    paso: 1,
    w5h2: { que: '', donde: '', cuando: '', quien: '', porque: '', como: '', cuanto: '' },
    enunciado: '',
    conversaciones: {},
    hallazgos: [],
    ishikawa: { efecto: '', causas: [] },
    porques: { problema: '', niveles: [{ texto: '' }, { texto: '' }, { texto: '' }, { texto: '' }, { texto: '' }] },
    causaRaiz: { texto: '', intentos: [] },
    ideas: [],
  };
}
