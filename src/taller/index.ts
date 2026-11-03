// Punto de entrada del Taller de datos: elige el generador según el caso y exporta a Excel.
import type { Escenario, Grupo } from '../types';
import { claveGrupo, hashTexto, type BaseDatos, type Formato } from './comun';
import { generarBaseUltimaMilla } from './baseUltimaMilla';
import { generarBasePrimeraMilla } from './basePrimeraMilla';
import { generarBaseAlmacenamiento } from './baseAlmacenamiento';

export * from './comun';

const GENERADORES: Record<string, typeof generarBaseUltimaMilla> = {
  'ultima-milla': generarBaseUltimaMilla,
  'primera-milla': generarBasePrimeraMilla,
  almacenamiento: generarBaseAlmacenamiento,
};

export function tieneTaller(esc: Escenario) {
  return esc.id in GENERADORES;
}

/** Sufijo legible para el nombre del archivo y código corto para el docente. */
export function codigoGrupo(grupo: Grupo, escId: string) {
  return (hashTexto(claveGrupo(grupo.nombre, grupo.curso) + '|' + escId) % 46656).toString(36).toUpperCase().padStart(3, '0');
}

const cache = new Map<string, BaseDatos>();

export function generarBase(esc: Escenario, grupo: Grupo): BaseDatos {
  const clave = esc.id + '|' + claveGrupo(grupo.nombre, grupo.curso);
  const hit = cache.get(clave);
  if (hit) return hit;
  const seed = hashTexto(clave);
  const limpio = (grupo.nombre.trim() || 'grupo').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '_').slice(0, 30);
  const base = GENERADORES[esc.id](esc.dias, seed, `${limpio}_${codigoGrupo(grupo, esc.id)}`);
  cache.set(clave, base);
  return base;
}

const FORMATOS: Record<Formato, string | undefined> = {
  texto: undefined,
  entero: '0',
  dec1: '0.0',
  dec2: '0.00',
  clp: '"$"#,##0',
  fecha: 'dd-mm-yyyy',
  fechahora: 'dd-mm-yyyy hh:mm',
  hora: 'hh:mm',
};
const ANCHOS: Record<Formato, number> = { texto: 16, entero: 9, dec1: 10, dec2: 10, clp: 13, fecha: 11, fechahora: 16, hora: 8 };

/** Construye el .xlsx en el navegador y lo descarga. */
export async function descargarExcel(base: BaseDatos, encabezado: string) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const leeme: (string | number)[][] = [
    [encabezado],
    [base.intro],
    [],
    ['Hoja', 'Columna', 'Descripción'],
  ];
  for (const h of base.hojas) {
    leeme.push([h.nombre, '', h.desc]);
    for (const c of h.columnas) if (c.desc) leeme.push(['', c.titulo, c.desc]);
  }
  const wsL = XLSX.utils.aoa_to_sheet(leeme);
  wsL['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsL, 'Leeme');

  for (const h of base.hojas) {
    const ws = XLSX.utils.aoa_to_sheet([h.columnas.map((c) => c.titulo), ...h.filas]);
    h.columnas.forEach((c, j) => {
      const z = FORMATOS[c.formato];
      if (!z) return;
      for (let i = 0; i < h.filas.length; i++) {
        const cell = ws[XLSX.utils.encode_cell({ r: i + 1, c: j })];
        if (cell && cell.t === 'n') cell.z = z;
      }
    });
    ws['!cols'] = h.columnas.map((c) => ({ wch: Math.max(ANCHOS[c.formato], Math.min(28, c.titulo.length + 2)) }));
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: h.filas.length, c: h.columnas.length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, ws, h.nombre);
  }
  XLSX.writeFile(wb, base.archivo, { compression: true });
}
