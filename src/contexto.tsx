import { createContext, useContext } from 'react';
import type { Escenario, Grupo, Hallazgo, Progreso } from './types';

export interface Ctx {
  esc: Escenario;
  prog: Progreso;
  grupo: Grupo;
  actualizar: (fn: (p: Progreso) => Progreso) => void;
  irA: (paso: number) => void;
  vozAuto: boolean;
  agregarHallazgo: (h: Omit<Hallazgo, 'id' | 'nota'> & { nota?: string }) => void;
  quitarHallazgo: (id: string) => void;
  tieneHallazgo: (texto: string) => boolean;
  abrirCuaderno: () => void;
}

export const Contexto = createContext<Ctx | null>(null);

export function useSim() {
  const c = useContext(Contexto);
  if (!c) throw new Error('Contexto no disponible');
  return c;
}
