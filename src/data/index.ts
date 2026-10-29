import type { Escenario } from '../types';
import { ultimaMilla } from './ultimaMilla';
import { primeraMilla } from './primeraMilla';
import { almacenamiento } from './almacenamiento';

// Para agregar un caso nuevo: crea un archivo en esta carpeta siguiendo
// la estructura de los existentes e inclúyelo en esta lista.
export const ESCENARIOS: Escenario[] = [ultimaMilla, primeraMilla, almacenamiento];

export function obtenerEscenario(id: string | null | undefined) {
  return ESCENARIOS.find((e) => e.id === id) ?? null;
}
