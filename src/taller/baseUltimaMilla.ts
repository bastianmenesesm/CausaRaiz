// Base de datos del caso Última milla: una fila por guía (intento de entrega) y una fila por ruta-día.
// Sigue los mismos 30 días del tablero: MercaHogar (voluminosos, sobre todo en zona Sur) parte el día 11.
import type { DiaKpi } from '../types';
import { aMinuto, Azar, diasOperativos, enHora, promedio, redondearA, serieAMinuto, type BaseDatos, type Celda, type Hoja } from './comun';

const ZONAS = {
  Sur: ['La Florida', 'Puente Alto', 'La Granja', 'San Ramón'],
  Oriente: ['Las Condes', 'Providencia', 'Ñuñoa', 'Vitacura'],
  Centro: ['Santiago', 'Estación Central', 'Independencia'],
  Poniente: ['Maipú', 'Pudahuel', 'Cerrillos'],
  Norte: ['Quilicura', 'Huechuraba', 'Conchalí', 'Recoleta'],
} as const;
type Zona = keyof typeof ZONAS;

const RUTAS_ZONA: Record<Zona, string[]> = {
  Sur: ['R01', 'R02', 'R03', 'R04', 'R05', 'R06'],
  Oriente: ['R07', 'R08', 'R09', 'R10', 'R11'],
  Centro: ['R12', 'R13', 'R14', 'R15'],
  Poniente: ['R16', 'R17', 'R18', 'R19'],
  Norte: ['R20', 'R21', 'R22'],
};
const ZONA_DE_RUTA: Record<string, Zona> = Object.fromEntries(
  (Object.keys(RUTAS_ZONA) as Zona[]).flatMap((z) => RUTAS_ZONA[z].map((r) => [r, z])),
);

const CONDUCTORES = [
  'J. Muñoz', 'P. Rojas', 'C. Díaz', 'M. Soto', 'F. Contreras', 'L. Silva', 'A. Morales', 'R. Sepúlveda', 'D. Araya', 'E. Fuentes', 'G. Torres',
  'H. Espinoza', 'I. Castillo', 'J. Reyes', 'K. Herrera', 'N. Valenzuela', 'O. Pizarro', 'S. Tapia', 'T. Vargas', 'V. Núñez', 'B. Carrasco', 'C. Lagos',
];
// día 8: ingresan tres conductores nuevos por rotación (reemplazan R03, R09, R17)
const NUEVOS: Record<string, string> = { R03: 'Y. Cortés (nuevo)', R09: 'W. Bravo (nuevo)', R17: 'X. Jara (nuevo)' };

const COSTO = { arriendo: 52000, conductor: 58000, crossDock: 32000, kmCLP: 180, horaExtra: 9500 };
const FIN_JORNADA = 18.5;

interface Guia {
  id: string;
  creacion: number;
  cliente: string;
  tipo: 'Paquete' | 'Voluminoso';
  zona: Zona;
  comuna: string;
  ventana: 'AM' | 'PM';
  peso: number;
  bultos: number;
  intento: number;
}

export function generarBaseUltimaMilla(dias: DiaKpi[], seed: number, sufijo: string): BaseDatos {
  const rnd = new Azar(seed ^ 0x55aa1101);
  const ops = diasOperativos('2026-08-17', dias.length);
  let correlativo = 480000 + rnd.int(0, 9000);
  let pendientes: Guia[] = [];
  // variación propia de cada grupo
  const mediaVol = 12.4 + rnd.normal(0, 0.45);
  const mediaPaq = 4.2 + rnd.normal(0, 0.12);

  const filasGuias: Celda[][] = [];
  const filasRutas: Celda[][] = [];
  // acumuladores para las respuestas
  let total = 0, aTiempo = 0, entregadas = 0, totMH = 0, aTiempoMH = 0, int1 = 0, int1Ok = 0, costoTotal = 0, rutasDia = 0;
  const lead: number[] = [];
  const paradaVol: number[] = [];

  for (const op of ops) {
    const k = dias[op.dia - 1];
    const sab = op.diaSemana === 6;
    const P = Number(k.programadas);
    const am = Number(k.aTiempoAM) / 100;
    const pm = Number(k.aTiempoPM) / 100;
    const primer = Number(k.primerIntento) / 100;
    const sev = op.dia >= 11 ? Math.min(1, (op.dia - 10) / 3) : 0;
    const panne = op.dia === 15;

    // 1) guías del día: reintentos de ayer + nuevas
    const nuevasN = Math.max(0, P - pendientes.length);
    const mhN = op.dia >= 11 ? Math.round((sab ? 140 : 215) * sev + rnd.normal(0, 8) * sev) : 0;
    const guias: Guia[] = pendientes.map((g) => ({ ...g, intento: g.intento + 1 }));
    for (let i = 0; i < nuevasN; i++) {
      const esMH = i < mhN;
      const cliente = esMH ? 'MercaHogar' : rnd.u() < 0.58 ? 'Tiendas Lumen' : 'FarmaPlus';
      const tipo = esMH && rnd.u() < 0.88 ? 'Voluminoso' : 'Paquete';
      const zona: Zona = esMH
        ? rnd.ponderado([['Sur', 60], ['Poniente', 20], ['Centro', 8], ['Oriente', 6], ['Norte', 6]] as const)
        : rnd.ponderado([['Sur', 25], ['Oriente', 25], ['Centro', 17], ['Poniente', 17], ['Norte', 16]] as const);
      const diasAntes = esMH && rnd.u() < 0.4 ? 2 : 1;
      guias.push({
        id: 'UM-' + correlativo++,
        creacion: serieAMinuto(enHora(op.serie - diasAntes, rnd.entre(8, 23.9))),
        cliente,
        tipo,
        zona,
        comuna: rnd.elegir(ZONAS[zona]),
        ventana: rnd.u() < 0.45 ? 'AM' : 'PM',
        peso: tipo === 'Voluminoso' ? redondearA(rnd.entre(14, 46), 1) : redondearA(rnd.entre(0.3, 4.2), 1),
        bultos: tipo === 'Voluminoso' ? rnd.int(1, 3) : rnd.int(1, 2),
        intento: 1,
      });
    }

    // 2) asignar rutas (sábado opera con menos furgones; el día 15 R04 queda en panne)
    const activas = (z: Zona) => {
      let rs = RUTAS_ZONA[z];
      if (sab) rs = rs.slice(0, Math.max(2, Math.round(rs.length * 0.73)));
      if (panne) rs = rs.filter((r) => r !== 'R04');
      return rs;
    };
    const porRuta: Record<string, { g: Guia; estado: string; entrega: number | null; parada: number }[]> = {};
    pendientes = [];

    // probabilidad de éxito según ventana y zona: la zona Sur absorbe los voluminosos.
    // Los factores se normalizan para que el total del día coincida con el tablero.
    const fZona = (g: Guia) => (g.zona === 'Sur' ? 1 + 1.1 * sev : g.zona === 'Oriente' ? 0.45 : 1) * (g.tipo === 'Voluminoso' ? 1.2 : 1);
    const fMedio = guias.reduce((a, g) => a + fZona(g), 0) / Math.max(1, guias.length);
    for (const g of guias) {
      const ruta = rnd.elegir(activas(g.zona));
      const f = fZona(g) / fMedio;
      const pTiempo = Math.max(0.15, 1 - (1 - (g.ventana === 'AM' ? am : pm)) * f);
      const pFalla = Math.min(0.6, (1 - primer) * (g.ventana === 'PM' ? 1.25 : 0.7) * f);
      const u = rnd.u();
      let estado: string, hora: number | null;
      const ini = g.ventana === 'AM' ? 9 : 14;
      const fin = g.ventana === 'AM' ? 14 : 21;
      if (u < Math.min(pTiempo, 1 - pFalla)) {
        estado = 'Entregada';
        hora = ini + Math.pow(rnd.u(), g.ventana === 'PM' ? 0.85 : 1) * (fin - ini - 0.02);
      } else if (u < 1 - pFalla) {
        estado = 'Entregada';
        hora = g.ventana === 'AM' ? 14 + rnd.entre(0.05, 3) : 21 + rnd.entre(0.05, 1.3);
      } else {
        estado = rnd.u() < 0.82 ? 'No entregada: cliente ausente' : 'No entregada: fuera de horario';
        hora = null;
        pendientes.push(g);
      }
      const parada = Math.max(1.2, g.tipo === 'Voluminoso' ? rnd.normal(mediaVol, 2.6) : rnd.normal(mediaPaq + 0.25 * sev, 0.85));
      (porRuta[ruta] ??= []).push({ g, estado, entrega: hora === null ? null : enHora(op.serie, aMinuto(hora)), parada });
    }

    // 3) filas de guías y de rutas
    for (const ruta of Object.keys(porRuta).sort()) {
      const lista = porRuta[ruta].sort((a, b) => (a.entrega ?? 99e9) - (b.entrega ?? 99e9));
      const conductor = op.dia >= 8 && NUEVOS[ruta] ? NUEVOS[ruta] : CONDUCTORES[Number(ruta.slice(1)) - 1];
      for (const x of lista) {
        const g = x.g;
        const horaEnt = x.entrega === null ? null : x.entrega - op.serie;
        filasGuias.push([
          g.id, op.serie, g.cliente, g.tipo, g.comuna, g.zona, ruta, conductor, g.intento, g.ventana,
          g.ventana === 'AM' ? 9 / 24 : 14 / 24, g.ventana === 'AM' ? 14 / 24 : 21 / 24,
          g.creacion, x.entrega, horaEnt, x.estado, redondearA(x.parada, 1), g.peso, g.bultos,
        ]);
        total++;
        const enVentana = horaEnt !== null && horaEnt <= (g.ventana === 'AM' ? 14 / 24 : 21 / 24);
        if (enVentana) aTiempo++;
        if (x.entrega !== null) {
          entregadas++;
          lead.push((x.entrega - g.creacion) * 24);
        }
        if (g.cliente === 'MercaHogar') {
          totMH++;
          if (enVentana) aTiempoMH++;
        }
        if (g.intento === 1) {
          int1++;
          if (x.entrega !== null) int1Ok++;
        }
        if (g.tipo === 'Voluminoso') paradaVol.push(redondearA(x.parada, 1));
      }
      // ruta-día
      const ultima = Math.max(...lista.map((x) => (x.entrega ?? 0) - op.serie)) * 24;
      const salida = Number(k.horaSalida) + rnd.normal(0, 0.08);
      const termino = Math.max(ultima + rnd.entre(0.25, 0.6), sab ? 15.5 : 17.2 + rnd.normal(0, 0.3));
      const he = redondearA(Math.max(0, termino - (sab ? 15.5 : FIN_JORNADA)), 2);
      const km = Math.round(Number(k.kmRuta) + rnd.normal(0, 6) + (ZONA_DE_RUTA[ruta] === 'Sur' ? 8 : 0));
      const cComb = km * COSTO.kmCLP;
      const cHe = Math.round(he * COSTO.horaExtra);
      const ct = COSTO.arriendo + COSTO.conductor + COSTO.crossDock + cComb + cHe;
      filasRutas.push([
        op.serie, ruta, ZONA_DE_RUTA[ruta], conductor, aMinuto(salida) / 24, aMinuto(termino) / 24, lista.length,
        km, he, COSTO.arriendo, COSTO.conductor, cComb, cHe, COSTO.crossDock, ct,
      ]);
      costoTotal += ct;
      rutasDia++;
    }
  }

  const guiasHoja: Hoja = {
    nombre: 'Guias',
    desc: 'Una fila por guía e intento de entrega (si una guía falla, vuelve a salir al día siguiente como intento 2).',
    columnas: [
      { titulo: 'N° guía', formato: 'texto', desc: 'Identificador del pedido. Se repite si hubo reintento.' },
      { titulo: 'Fecha', formato: 'fecha', desc: 'Día en que la guía salió a ruta.' },
      { titulo: 'Cliente', formato: 'texto', desc: 'Retailer dueño del pedido.' },
      { titulo: 'Tipo de producto', formato: 'texto', desc: 'Paquete (bolsa o caja chica) o Voluminoso (muebles, electrodomésticos, colchones).' },
      { titulo: 'Comuna', formato: 'texto', desc: 'Comuna de destino.' },
      { titulo: 'Zona', formato: 'texto', desc: 'Agrupación de comunas usada para armar rutas.' },
      { titulo: 'Ruta', formato: 'texto', desc: 'Furgón que llevó la guía ese día.' },
      { titulo: 'Conductor', formato: 'texto', desc: 'Conductor del furgón.' },
      { titulo: 'N° intento', formato: 'entero', desc: '1 = primera visita; 2 o más = reintento.' },
      { titulo: 'Franja', formato: 'texto', desc: 'AM (9–14 h) o PM (14–21 h).' },
      { titulo: 'Ventana inicio', formato: 'hora', desc: 'Inicio de la ventana comprometida al cliente.' },
      { titulo: 'Ventana fin', formato: 'hora', desc: 'Fin de la ventana comprometida al cliente.' },
      { titulo: 'Fecha y hora creación', formato: 'fechahora', desc: 'Cuándo el cliente hizo el pedido en la tienda en línea.' },
      { titulo: 'Fecha y hora entrega', formato: 'fechahora', desc: 'Cuándo se entregó (vacío si no se entregó).' },
      { titulo: 'Hora entrega', formato: 'hora', desc: 'Solo la hora de entrega, para comparar con la ventana.' },
      { titulo: 'Estado', formato: 'texto', desc: 'Entregada o No entregada (con motivo).' },
      { titulo: 'Tiempo en parada (min)', formato: 'dec1', desc: 'Minutos detenido en el domicilio según GPS.' },
      { titulo: 'Peso (kg)', formato: 'dec1', desc: 'Peso total declarado.' },
      { titulo: 'Bultos', formato: 'entero', desc: 'Cantidad de bultos.' },
    ],
    filas: filasGuias,
  };
  const rutasHoja: Hoja = {
    nombre: 'Rutas',
    desc: 'Una fila por furgón y día, con horarios y costos.',
    columnas: [
      { titulo: 'Fecha', formato: 'fecha', desc: 'Día de operación.' },
      { titulo: 'Ruta', formato: 'texto', desc: 'Furgón.' },
      { titulo: 'Zona', formato: 'texto', desc: 'Zona que atiende el furgón.' },
      { titulo: 'Conductor', formato: 'texto', desc: 'Conductor asignado.' },
      { titulo: 'Hora salida', formato: 'hora', desc: 'Salida del cross-dock (portería).' },
      { titulo: 'Hora término', formato: 'hora', desc: 'Última entrega o intento del día (GPS).' },
      { titulo: 'Guías asignadas', formato: 'entero', desc: 'Guías que llevó el furgón (entregadas o no).' },
      { titulo: 'Km', formato: 'entero', desc: 'Kilómetros recorridos.' },
      { titulo: 'Horas extra', formato: 'dec2', desc: 'Horas trabajadas después de las 18:30 (sábado: 15:30).' },
      { titulo: 'Costo arriendo furgón', formato: 'clp', desc: 'Arriendo diario del furgón.' },
      { titulo: 'Costo conductor', formato: 'clp', desc: 'Remuneración diaria de la jornada normal.' },
      { titulo: 'Costo combustible', formato: 'clp', desc: 'Km × $180.' },
      { titulo: 'Costo horas extra', formato: 'clp', desc: 'Horas extra × $9.500.' },
      { titulo: 'Costo cross-dock asignado', formato: 'clp', desc: 'Costo fijo del cross-dock prorrateado por ruta.' },
      { titulo: 'Costo total', formato: 'clp', desc: 'Suma de todos los costos de la ruta en el día.' },
    ],
    filas: filasRutas,
  };

  const pct = (a: number, b: number) => (100 * a) / b;
  return {
    archivo: `Base_DespachosCordillera_${sufijo}.xlsx`,
    intro:
      'Extracción del sistema de gestión de transporte (TMS) de Despachos Cordillera para los mismos 30 días del tablero. Hoja «Guias»: una fila por intento de entrega. Hoja «Rutas»: una fila por furgón y día, con horarios y costos.',
    hojas: [guiasHoja, rutasHoja],
    retos: [
      {
        id: 'otd', indicador: 'OTD · On Time Delivery', unidad: '%', decimales: 1, tolerancia: 0.06,
        pregunta: '¿Cuál es el OTD del período? (guías entregadas dentro de su ventana ÷ total de filas de la hoja Guias)',
        respuesta: pct(aTiempo, total),
        formula: 'OTD = guías con Estado «Entregada» y Hora entrega ≤ Ventana fin ÷ total de guías (filas) × 100',
        pista: 'Agreguen una columna «A tiempo» con =SI(Y(P2="Entregada";O2<=L2);1;0) y luego dividan la suma por la cantidad de filas.',
      },
      {
        id: 'otdMH', indicador: 'OTD de MercaHogar', unidad: '%', decimales: 1, tolerancia: 0.06,
        pregunta: '¿Cuál es el OTD solo de las guías del cliente MercaHogar?',
        respuesta: pct(aTiempoMH, totMH),
        formula: 'Igual que el OTD, pero filtrando Cliente = MercaHogar',
        pista: 'Usen una tabla dinámica: Cliente en filas, el promedio de su columna «A tiempo» en valores.',
      },
      {
        id: 'costo', indicador: 'Costo por guía entregada', unidad: 'CLP', decimales: 0, tolerancia: 2,
        pregunta: '¿Cuál es el costo por guía entregada del período? (en pesos, sin decimales)',
        respuesta: costoTotal / entregadas,
        formula: 'Costo por guía = suma de «Costo total» (hoja Rutas) ÷ cantidad de guías con Estado «Entregada»',
        pista: 'Necesitan dos hojas: SUMA de la columna O de Rutas y CONTAR.SI de la columna Estado de Guias.',
      },
      {
        id: 'lead', indicador: 'Lead time', unidad: 'h', decimales: 1, tolerancia: 0.06,
        pregunta: '¿Cuál es el lead time promedio, en horas, de las guías entregadas? (desde la creación del pedido hasta la entrega)',
        respuesta: promedio(lead),
        formula: 'Lead time = promedio de (Fecha y hora entrega − Fecha y hora creación) × 24, solo guías entregadas',
        pista: 'En Excel las fechas son días: la resta da días, por eso se multiplica por 24. Ignoren las filas sin entrega.',
      },
      {
        id: 'primer', indicador: 'Éxito en primer intento', unidad: '%', decimales: 1, tolerancia: 0.06,
        pregunta: '¿Qué porcentaje de las guías en su primer intento (N° intento = 1) se entregó?',
        respuesta: pct(int1Ok, int1),
        formula: 'Éxito 1er intento = guías con N° intento = 1 y Estado «Entregada» ÷ guías con N° intento = 1 × 100',
        pista: 'CONTAR.SI.CONJUNTO con dos condiciones dividido por CONTAR.SI con una.',
      },
      {
        id: 'parada', indicador: 'Tiempo de servicio de voluminosos', unidad: 'min', decimales: 1, tolerancia: 0.06,
        pregunta: '¿Cuántos minutos en promedio se detiene el furgón en cada parada de producto Voluminoso?',
        respuesta: promedio(paradaVol),
        formula: 'Promedio de «Tiempo en parada (min)» con Tipo de producto = Voluminoso',
        pista: 'PROMEDIO.SI. Compárenlo con los 4 minutos que usa el software de ruteo.',
      },
      {
        id: 'efic', indicador: 'Eficiencia (guías entregadas por ruta)', unidad: 'guías/ruta', decimales: 1, tolerancia: 0.06,
        pregunta: '¿Cuántas guías entregadas logra en promedio cada ruta por día? (guías entregadas ÷ filas de la hoja Rutas)',
        respuesta: entregadas / rutasDia,
        formula: 'Eficiencia = guías con Estado «Entregada» ÷ cantidad de rutas-día (filas de Rutas)',
        pista: 'El denominador es la cantidad de filas de la hoja Rutas, no la cantidad de furgones.',
      },
    ],
    preguntasGuia: [
      '¿Cómo cambia el OTD semana a semana? ¿Desde qué fecha cae?',
      '¿Qué cliente, zona y franja tienen el peor OTD? ¿Y el mejor?',
      '¿El tiempo en parada es parejo para todos los tipos de producto?',
      '¿Los conductores nuevos rinden peor que el resto? Revisen sus rutas antes y después del día 11.',
      '¿Cómo evolucionan las horas extra y el costo por guía? ¿Qué rutas concentran las horas extra?',
    ],
  };
}

