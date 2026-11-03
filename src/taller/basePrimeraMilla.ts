// Base de datos del caso Primera milla: una fila por guía de despacho (retiro en un predio) y una fila por viaje.
// Desde el día 9 la ruta Paine–Buin recoge a las 11:00, antes del hidroenfriado: la pulpa llega caliente al CD.
import type { DiaKpi } from '../types';
import { aMinuto, Azar, diasOperativos, promedio, redondearA, suma, type BaseDatos, type Celda } from './comun';

const VALOR_PALLET = 320000;
const CAPACIDAD = 12;
const NORMA = 8;

const CAMIONES = [
  { n: 1, patente: 'KHRT-21', conductor: 'Luis Pérez', ruta: 'Paine–Buin' },
  { n: 2, patente: 'JZPL-84', conductor: 'Manuel Acevedo', ruta: 'Paine–Buin' },
  { n: 3, patente: 'LBSW-12', conductor: 'Raúl Gutiérrez', ruta: 'Paine–Buin' },
  { n: 4, patente: 'KXDF-57', conductor: 'Héctor Salinas', ruta: 'Paine–Buin' },
  { n: 5, patente: 'JRWB-33', conductor: 'Pedro Lizama', ruta: 'Paine–Buin' },
  { n: 6, patente: 'LCGH-90', conductor: 'Juan Olivares', ruta: 'Paine–Buin' },
  { n: 7, patente: 'KPTV-46', conductor: 'Sergio Ibarra', ruta: 'Talagante' },
  { n: 8, patente: 'JYMS-78', conductor: 'Óscar Farías', ruta: 'Talagante' },
] as const;

const PREDIOS_PAINE = [
  ['Agrícola Santa Rosa', 'Paine'], ['Fundo El Peumo', 'Buin'], ['Hortícola Los Aromos', 'Paine'], ['Productora Rosa Catalán', 'Paine'],
  ['Frutícola Linderos', 'Buin'], ['Agrícola Huelquén', 'Paine'], ['Fundo Maipo Alto', 'Buin'], ['Hortalizas Hospital', 'Paine'],
  ['Agrícola Viluco', 'Buin'], ['Fundo Champa', 'Paine'], ['Huerto Alto Jahuel', 'Buin'], ['Agrícola Chada', 'Paine'],
] as const;
const PREDIOS_TALA = [['Agrícola Lonquén', 'Talagante'], ['Fundo El Monte', 'El Monte'], ['Hortícola Isla de Maipo', 'Isla de Maipo'], ['Agrícola Peñaflor', 'Peñaflor']] as const;

export function generarBasePrimeraMilla(dias: DiaKpi[], seed: number, sufijo: string): BaseDatos {
  const rnd = new Azar(seed ^ 0x33cc2207);
  const ops = diasOperativos('2026-01-05', dias.length);
  let correlativo = 21000 + rnd.int(0, 900);
  const filasGuias: Celda[][] = [];
  const filasViajes: Celda[][] = [];

  let pallets = 0, rechazados = 0, pPaine = 0, rPaine = 0, viajes = 0, viajesOk = 0, costo = 0, cargados = 0, capacidad = 0;
  const tempAntes12: number[] = [];
  // variación propia de cada grupo
  const viajePaine = 1.15 + rnd.normal(0, 0.05);
  const viajeTala = 0.8 + rnd.normal(0, 0.04);

  for (const op of ops) {
    const k = dias[op.dia - 1];
    const sab = op.diaSemana === 6;
    const despues = op.dia >= 9;
    const calor = op.dia >= 14 && op.dia <= 16;
    const P = Number(k.pallets) + rnd.int(-2, 2);
    const camiones = sab ? CAMIONES.filter((c) => c.n <= 4 || c.n >= 7) : CAMIONES;
    const paine = camiones.filter((c) => c.ruta === 'Paine–Buin');
    const tala = camiones.filter((c) => c.ruta === 'Talagante');
    const palletsPaine = Math.round(P * 0.75);
    const reparto = (total: number, n: number) => {
      const base = Math.floor(total / n);
      const v = Array(n).fill(base);
      for (let i = 0; i < total - base * n; i++) v[i]++;
      return v.map((x) => Math.min(CAPACIDAD, x));
    };
    const cargaPaine = reparto(palletsPaine, paine.length);
    const cargaTala = reparto(P - palletsPaine, tala.length);
    const citaIni = op.dia >= 8 ? 13 : 16;
    const citaFin = op.dia >= 8 ? 15 : 18.5;
    const predios = rnd.mezclar(PREDIOS_PAINE);

    type G = { camion: (typeof CAMIONES)[number]; productor: string; comuna: string; orden: number; llegada: number; salida: number; espera: number; pallets: number; tCD: number; llegadaCD: number; rech: number };
    const guiasDia: G[] = [];

    camiones.forEach((c) => {
      const esPaine = c.ruta === 'Paine–Buin';
      const carga = esPaine ? cargaPaine[paine.indexOf(c as never)] : cargaTala[tala.indexOf(c as never)];
      const paradas = esPaine ? 2 : 1;
      const partes = paradas === 2 ? [Math.ceil(carga / 2) + rnd.int(-1, 1), 0] : [carga];
      if (paradas === 2) partes[1] = carga - partes[0];
      let hora: number;
      if (esPaine) hora = despues ? Number(k.horaRec) + rnd.normal(0, 0.1) : op.dia === 8 && c.n <= 2 ? 12 + rnd.normal(0, 0.1) : Number(k.horaRec) + rnd.normal(0, 0.12);
      else hora = despues ? 13 + rnd.normal(0, 0.08) : 14.4 + rnd.normal(0, 0.1);
      const misGuias: G[] = [];
      for (let s = 0; s < paradas; s++) {
        const [productor, comuna] = esPaine ? predios[((c.n - 1) * 2 + s) % predios.length] : PREDIOS_TALA[(c.n - 7 + op.dia) % PREDIOS_TALA.length];
        const espera = Math.max(4, esPaine ? Number(k.esperaPredio) + rnd.normal(0, 7) : rnd.normal(14, 4));
        const llegada = aMinuto(hora);
        const salida = aMinuto(llegada + (espera + 18 + partes[s] * 3) / 60);
        // temperatura de pulpa al cargar: caliente si se carga antes de terminar el hidroenfriado (~12:45)
        const caliente = despues && llegada < 12.75;
        const tCarga = caliente ? rnd.normal(15.4, 1.1) : rnd.normal(5.7, 0.5);
        misGuias.push({ camion: c, productor, comuna, orden: s + 1, llegada, salida, espera, pallets: partes[s], tCD: tCarga, llegadaCD: 0, rech: 0 });
        hora = salida + 0.25;
      }
      const llegadaCD = aMinuto(hora - 0.25 + (esPaine ? viajePaine : viajeTala) + rnd.normal(0, 0.08));
      const salidaBase = aMinuto(misGuias[0].llegada - (esPaine ? 0.55 : 0.7));
      for (const g of misGuias) {
        const horasViaje = llegadaCD - g.salida;
        let t = g.tCD - Math.min(3.2, horasViaje * 1.25) + rnd.normal(0, 0.35);
        if (calor) t += 0.9;
        if (op.dia === 20 && c.n === 7) t += 4.6;
        g.tCD = Math.max(3.5, t);
        g.llegadaCD = llegadaCD;
        guiasDia.push(g);
      }
      const km = Math.round((esPaine ? 136 : 104) + rnd.normal(0, 9));
      const cComb = km * 520;
      const cCond = 68000;
      const peaje = esPaine ? 7800 : 5200;
      const cFrio = 18000;
      const total = cComb + cCond + peaje + cFrio;
      filasViajes.push([
        op.serie, c.n, c.patente, c.conductor, c.ruta, misGuias.length, carga, CAPACIDAD, salidaBase / 24, llegadaCD / 24, citaIni / 24, citaFin / 24,
        km, cComb, cCond, peaje, cFrio, total,
      ]);
      viajes++;
      if (llegadaCD <= citaFin) viajesOk++;
      costo += total;
      cargados += carga;
      capacidad += CAPACIDAD;
    });

    // rechazos: el CD rechaza los pallets más calientes hasta completar la tasa del día por ruta
    for (const ruta of ['Paine–Buin', 'Talagante'] as const) {
      const gs = guiasDia.filter((g) => g.camion.ruta === ruta);
      const tot = suma(gs.map((g) => g.pallets));
      const tasa = Number(ruta === 'Paine–Buin' ? k.rechazoPaine : k.rechazoTalagante) / 100;
      let objetivo = Math.round(tot * tasa + rnd.normal(0, 0.4));
      const pesos = gs.map((g) => Math.pow(Math.max(0.15, g.tCD - 6.8), 2));
      while (objetivo > 0) {
        const libres = gs.map((g, i) => (g.rech < g.pallets ? pesos[i] : 0));
        const tp = suma(libres);
        if (tp <= 0) break;
        let u = rnd.u() * tp;
        const i = libres.findIndex((w) => (u -= w) <= 0);
        gs[i < 0 ? libres.length - 1 : i].rech++;
        objetivo--;
      }
    }

    for (const g of guiasDia.sort((a, b) => a.camion.n - b.camion.n || a.orden - b.orden)) {
      const tRed = redondearA(g.tCD, 1);
      filasGuias.push([
        op.serie, 'GD-' + correlativo++, g.camion.n, g.camion.conductor, g.camion.ruta, g.productor, g.comuna, g.orden,
        g.llegada / 24, g.salida / 24, Math.round((g.salida - g.llegada) * 60 - 18 - g.pallets * 3), g.pallets, g.pallets * 600, g.llegadaCD / 24, tRed, g.rech,
        g.rech ? (tRed > NORMA ? 'Temperatura de pulpa sobre 8 °C' : 'Temperatura de pulpa en el límite') : '',
      ]);
      pallets += g.pallets;
      rechazados += g.rech;
      if (g.camion.ruta === 'Paine–Buin') {
        pPaine += g.pallets;
        rPaine += g.rech;
      }
      if (g.llegada < 12) tempAntes12.push(tRed);
    }
  }

  // Excel recibe las horas como fracción de día; el lead time se calcula con esos mismos valores
  const leadExcel = filasGuias.map((f) => ((f[13] as number) - (f[9] as number)) * 24);
  const pct = (a: number, b: number) => (100 * a) / b;

  return {
    archivo: `Base_MaipoFrio_${sufijo}.xlsx`,
    intro:
      'Registros de Transportes Maipo Frío para los mismos 30 días del tablero. Hoja «Guias»: una fila por retiro en un predio (guía de despacho). Hoja «Viajes»: una fila por camión y día, con citas y costos. Hoja «Parametros»: datos de referencia.',
    hojas: [
      {
        nombre: 'Guias',
        desc: 'Una fila por guía de despacho: lo que un camión retiró en un predio.',
        columnas: [
          { titulo: 'Fecha', formato: 'fecha', desc: 'Día de operación.' },
          { titulo: 'N° guía despacho', formato: 'texto', desc: 'Documento emitido por el productor.' },
          { titulo: 'Camión', formato: 'entero', desc: 'Número interno del camión (1 a 8).' },
          { titulo: 'Conductor', formato: 'texto', desc: 'Conductor del camión.' },
          { titulo: 'Ruta', formato: 'texto', desc: 'Paine–Buin o Talagante.' },
          { titulo: 'Productor', formato: 'texto', desc: 'Predio donde se retiró la carga.' },
          { titulo: 'Comuna predio', formato: 'texto', desc: 'Comuna del predio.' },
          { titulo: 'Orden de visita', formato: 'entero', desc: '1 = primer predio del recorrido.' },
          { titulo: 'Hora llegada predio', formato: 'hora', desc: 'Llegada del camión al predio (GPS).' },
          { titulo: 'Hora salida predio', formato: 'hora', desc: 'Salida del predio con la carga.' },
          { titulo: 'Espera en predio (min)', formato: 'entero', desc: 'Minutos esperando a que la carga estuviera lista.' },
          { titulo: 'Pallets', formato: 'entero', desc: 'Pallets cargados en ese predio.' },
          { titulo: 'Kg', formato: 'entero', desc: 'Kilos (600 kg por pallet).' },
          { titulo: 'Hora llegada CD', formato: 'hora', desc: 'Llegada del camión al CD SuperValle (portería).' },
          { titulo: 'Temp. pulpa llegada CD (°C)', formato: 'dec1', desc: 'Medición de control de calidad del CD. Norma: máximo 8 °C.' },
          { titulo: 'Pallets rechazados', formato: 'entero', desc: 'Pallets devueltos por el CD.' },
          { titulo: 'Motivo rechazo', formato: 'texto', desc: 'Motivo informado por el CD.' },
        ],
        filas: filasGuias,
      },
      {
        nombre: 'Viajes',
        desc: 'Una fila por camión y día: carga, cita de andén y costos.',
        columnas: [
          { titulo: 'Fecha', formato: 'fecha', desc: 'Día de operación.' },
          { titulo: 'Camión', formato: 'entero', desc: 'Número interno.' },
          { titulo: 'Patente', formato: 'texto', desc: 'Patente del camión.' },
          { titulo: 'Conductor', formato: 'texto', desc: 'Conductor.' },
          { titulo: 'Ruta', formato: 'texto', desc: 'Paine–Buin o Talagante.' },
          { titulo: 'Guías', formato: 'entero', desc: 'Predios visitados.' },
          { titulo: 'Pallets cargados', formato: 'entero', desc: 'Total cargado en el viaje.' },
          { titulo: 'Capacidad (pallets)', formato: 'entero', desc: 'Capacidad del camión.' },
          { titulo: 'Hora salida base', formato: 'hora', desc: 'Salida desde la base en San Bernardo.' },
          { titulo: 'Hora llegada CD', formato: 'hora', desc: 'Llegada al CD SuperValle.' },
          { titulo: 'Cita inicio', formato: 'hora', desc: 'Inicio de la ventana de recepción asignada por el CD.' },
          { titulo: 'Cita fin', formato: 'hora', desc: 'Fin de la ventana: después de esta hora el viaje queda fuera de cita.' },
          { titulo: 'Km', formato: 'entero', desc: 'Kilómetros del viaje.' },
          { titulo: 'Costo combustible', formato: 'clp', desc: 'Km × $520.' },
          { titulo: 'Costo conductor', formato: 'clp', desc: 'Remuneración diaria.' },
          { titulo: 'Peajes', formato: 'clp', desc: 'Peajes del recorrido.' },
          { titulo: 'Costo equipo de frío', formato: 'clp', desc: 'Combustible y mantención del equipo de frío.' },
          { titulo: 'Costo total', formato: 'clp', desc: 'Suma de los costos del viaje.' },
        ],
        filas: filasViajes,
      },
      {
        nombre: 'Parametros',
        desc: 'Datos de referencia del contrato con SuperValle.',
        columnas: [
          { titulo: 'Parámetro', formato: 'texto', desc: '' },
          { titulo: 'Valor', formato: 'dec1', desc: '' },
          { titulo: 'Unidad', formato: 'texto', desc: '' },
        ],
        filas: [
          ['Valor de un pallet de hortalizas', VALOR_PALLET, 'CLP'],
          ['Temperatura máxima de pulpa aceptada', NORMA, '°C'],
          ['Capacidad por camión', CAPACIDAD, 'pallets'],
          ['Kilos por pallet', 600, 'kg'],
        ],
      },
    ],
    retos: [
      {
        id: 'rech', indicador: 'Tasa de rechazo', unidad: '%', decimales: 1, tolerancia: 0.06,
        pregunta: '¿Qué porcentaje de los pallets entregados fue rechazado en el período?',
        respuesta: pct(rechazados, pallets),
        formula: 'Rechazo = suma de «Pallets rechazados» ÷ suma de «Pallets» × 100 (hoja Guias)',
        pista: 'Son dos sumas de columnas de la hoja Guias.',
      },
      {
        id: 'rechP', indicador: 'Rechazo ruta Paine–Buin', unidad: '%', decimales: 1, tolerancia: 0.06,
        pregunta: '¿Cuál es la tasa de rechazo solo de la ruta Paine–Buin?',
        respuesta: pct(rPaine, pPaine),
        formula: 'Igual que la tasa de rechazo, filtrando Ruta = Paine–Buin',
        pista: 'SUMAR.SI por ruta, o una tabla dinámica con Ruta en filas.',
      },
      {
        id: 'otd', indicador: 'OTD · cumplimiento de cita', unidad: '%', decimales: 1, tolerancia: 0.06,
        pregunta: '¿Qué porcentaje de los viajes llegó al CD antes del fin de su cita de andén?',
        respuesta: pct(viajesOk, viajes),
        formula: 'OTD = viajes con Hora llegada CD ≤ Cita fin ÷ total de viajes × 100 (hoja Viajes)',
        pista: 'Columna auxiliar =SI(J2<=L2;1;0) en la hoja Viajes y luego su promedio.',
      },
      {
        id: 'lead', indicador: 'Lead time predio → CD', unidad: 'h', decimales: 2, tolerancia: 0.006,
        pregunta: '¿Cuántas horas pasan en promedio desde que la carga sale del predio hasta que llega al CD?',
        respuesta: promedio(leadExcel),
        formula: 'Lead time = promedio de (Hora llegada CD − Hora salida predio) × 24 (hoja Guias)',
        pista: 'Las horas en Excel son fracciones de día: multipliquen la resta por 24.',
      },
      {
        id: 'costo', indicador: 'Costo por guía de despacho', unidad: 'CLP', decimales: 0, tolerancia: 2,
        pregunta: '¿Cuál es el costo de transporte por guía de despacho del período?',
        respuesta: costo / filasGuias.length,
        formula: 'Costo por guía = suma de «Costo total» (Viajes) ÷ cantidad de guías (filas de Guias)',
        pista: 'El numerador está en la hoja Viajes y el denominador en la hoja Guias.',
      },
      {
        id: 'efic', indicador: 'Eficiencia · uso de capacidad', unidad: '%', decimales: 1, tolerancia: 0.06,
        pregunta: '¿Qué porcentaje de la capacidad de los camiones se usó en el período?',
        respuesta: pct(cargados, capacidad),
        formula: 'Uso de capacidad = suma de «Pallets cargados» ÷ suma de «Capacidad (pallets)» × 100 (hoja Viajes)',
        pista: 'Dos sumas de la hoja Viajes.',
      },
      {
        id: 'temp', indicador: 'Pulpa de cargas retiradas antes de las 12:00', unidad: '°C', decimales: 1, tolerancia: 0.06,
        pregunta: '¿Cuál es la temperatura promedio de pulpa al llegar al CD de las guías cuya hora de llegada al predio fue antes de las 12:00?',
        respuesta: promedio(tempAntes12),
        formula: 'PROMEDIO.SI de «Temp. pulpa llegada CD» con «Hora llegada predio» < 12:00',
        pista: 'En Excel las 12:00 son 0,5. Prueben =PROMEDIO.SI(I:I;"<0,5";O:O). Comparen con las cargas retiradas después de las 12:00.',
      },
    ],
    preguntasGuia: [
      '¿Desde qué fecha suben los rechazos? ¿En qué ruta y en qué predios se concentran?',
      '¿Cómo se relaciona la hora de llegada al predio con la temperatura de pulpa al llegar al CD?',
      '¿Qué pasó con el cumplimiento de cita antes y después del día 8?',
      '¿El camión 7 tiene algo distinto? ¿Fue un problema puntual o permanente?',
      '¿Cuánto cuestan los rechazos del período comparado con el costo de transporte?',
    ],
  };
}

