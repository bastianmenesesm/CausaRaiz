// Base de datos del caso Almacenamiento: una fila por pedido, más ocupación diaria del CD y costos diarios.
// Desde el día 13 los racks superan el 97% de ocupación, aparecen «ubicaciones vacías» y cae el fill rate.
import type { DiaKpi } from '../types';
import { Azar, diasOperativos, enHora, promedio, serieAMinuto, suma, type BaseDatos, type Celda } from './comun';

const CLIENTES = [
  ['Ferretería El Tornillo', 'Maipú', 'Ferretería'], ['Ferretería San José', 'Puente Alto', 'Ferretería'], ['Comercial Los Pinos', 'La Florida', 'Ferretería'],
  ['Ferretería Don Lucho', 'Recoleta', 'Ferretería'], ['Materiales Ñuñoa', 'Ñuñoa', 'Ferretería'], ['Ferretería La Esquina', 'Quilicura', 'Ferretería'],
  ['Ferretería Central', 'Santiago', 'Ferretería'], ['Distribuidora El Maestro', 'San Bernardo', 'Ferretería'], ['Ferretería Lo Prado', 'Lo Prado', 'Ferretería'],
  ['Ferretería Cordillera', 'Peñalolén', 'Ferretería'], ['Ferretería Lampa', 'Lampa', 'Ferretería'], ['Comercial Colina', 'Colina', 'Ferretería'],
  ['Ferretería Independencia', 'Independencia', 'Ferretería'], ['Ferretería El Cóndor', 'Pudahuel', 'Ferretería'], ['Ferretería Macul', 'Macul', 'Ferretería'],
  ['Constructora Altamira', 'Las Condes', 'Constructora'], ['Constructora Pehuén', 'Huechuraba', 'Constructora'], ['Inmobiliaria Los Andes', 'Lo Barnechea', 'Constructora'],
  ['Constructora Río Maipo', 'Buin', 'Constructora'], ['Constructora Austral', 'Providencia', 'Constructora'],
] as const;

const COSTO = { horaNormal: 6800, horaExtra: 10200, jornada: 9 };

export function generarBaseAlmacenamiento(dias: DiaKpi[], seed: number, sufijo: string): BaseDatos {
  const rnd = new Azar(seed ^ 0x77ee3313);
  const ops = diasOperativos('2026-09-28', dias.length);
  let correlativo = 905000 + rnd.int(0, 5000);
  const filasPedidos: Celda[][] = [];
  const filasCap: Celda[][] = [];
  const filasCostos: Celda[][] = [];

  let lineasSol = 0, lineasOk = 0, aTiempo = 0, perfectos = 0, horasPick = 0, costoTotal = 0;
  const lead: number[] = [];
  let solAlta = 0, okAlta = 0;
  // variación propia de cada grupo
  const dotDia = rnd.int(20, 24);
  const costoEquipos = 360000 + rnd.int(0, 8) * 5000;

  for (const op of ops) {
    const k = dias[op.dia - 1];
    const sab = op.diaSemana === 6;
    const N = Math.round(Number(k.pedidos) * (1 + rnd.normal(0, 0.03)));
    const fill = Number(k.fill) / 100 + rnd.normal(0, 0.004);
    const prod = Number(k.productividad);
    const ocup = Number(k.ocupacion);
    const alta = ocup >= 97;
    const vaciasObj = Number(k.vacias);
    const noche = Number(k.dotacionNoche);
    const pickersNoche = [...Array(14)].map((_, i) => 'P' + String(i + 1).padStart(2, '0')).concat(op.dia >= 10 ? ['T01', 'T02', 'T03', 'T04', 'T05', 'T06'] : []);
    const pickersDia = [...Array(8)].map((_, i) => 'P' + String(i + 15).padStart(2, '0'));
    let solDia = 0, okDia = 0;

    const pedidos = [...Array(N)].map(() => {
      const [cliente, comuna, tipo] = rnd.ponderado(CLIENTES.map((c) => [c, c[2] === 'Constructora' ? 0.6 : 1.2] as const));
      const sol = Math.max(2, Math.round(rnd.normal(tipo === 'Constructora' ? 17 : 11.2, 4)));
      return { cliente, comuna, tipo, sol, falt: 0, inc: 0 };
    });
    // faltantes: se reparten para cumplir el fill rate del día
    const totalSol = suma(pedidos.map((p) => p.sol));
    let faltObj = Math.round(totalSol * (1 - fill) + rnd.normal(0, 3));
    while (faltObj > 0) {
      const p = rnd.elegir(pedidos);
      if (p.falt < p.sol - 1) {
        p.falt++;
        faltObj--;
      }
    }
    // incidencias «ubicación vacía»: más probables en pedidos con faltantes
    for (let i = 0; i < vaciasObj; i++) {
      const conFalta = pedidos.filter((p) => p.falt > 0);
      const p = conFalta.length && rnd.u() < 0.8 ? rnd.elegir(conFalta) : rnd.elegir(pedidos);
      p.inc++;
    }

    for (const p of pedidos) {
      const turnoNoche = rnd.u() < (sab ? 0.55 : 0.8);
      const picker = turnoNoche ? rnd.elegir(pickersNoche) : rnd.elegir(pickersDia);
      const ingreso = serieAMinuto(enHora(op.serie - 1, rnd.entre(8, 19.5)));
      const iniHora = turnoNoche ? rnd.entre(-2, 5.2) : rnd.entre(7.5, 12.5); // −2 = 22:00 del día anterior
      const minutos = (p.sol / (prod * (0.97 + rnd.u() * 0.06))) * 60 + p.inc * 3.5 + rnd.entre(0.2, 1.2);
      const inicio = serieAMinuto(enHora(op.serie, iniHora));
      const finPick = inicio + Math.max(1, Math.round(minutos)) / 1440;
      const compromiso = enHora(op.serie, 16);
      const atraso = p.falt > 0 && rnd.u() < 0.38 + 0.08 * p.inc ? rnd.entre(2, 22) : rnd.u() < 0.03 ? rnd.entre(1, 6) : 0;
      const despacho = serieAMinuto(Math.max(finPick + 0.5 / 24, enHora(op.serie, rnd.entre(9, 15.6))) + atraso / 24);
      const completas = p.sol - p.falt;
      filasPedidos.push([
        'PD-' + correlativo++, op.serie, p.cliente, p.tipo, p.comuna, ingreso, compromiso, turnoNoche ? 'Noche' : 'Día', picker,
        inicio, finPick, p.sol, completas, p.inc, despacho,
      ]);
      lineasSol += p.sol;
      lineasOk += completas;
      solDia += p.sol;
      okDia += completas;
      const ok = despacho <= compromiso;
      if (ok) aTiempo++;
      if (ok && p.falt === 0) perfectos++;
      horasPick += (finPick - inicio) * 24;
      lead.push((despacho - ingreso) * 24);
    }
    if (alta) {
      solAlta += solDia;
      okAlta += okDia;
    }

    filasCap.push([op.serie, 4800, Math.round((ocup / 100) * 4800), ocup / 100, Number(k.enPiso), Number(k.recibidos), Number(k.despachados), Math.round(Number(k.enPiso) * 0.6 + rnd.int(0, 4))]);

    const he = Number(k.horasExtra);
    const cPers = (dotDia + noche) * COSTO.jornada * COSTO.horaNormal;
    const cHe = he * COSTO.horaExtra;
    const ajustes = Number(k.ajustes);
    const tot = cPers + cHe + ajustes + costoEquipos;
    filasCostos.push([op.serie, dotDia, noche, (dotDia + noche) * COSTO.jornada, he, cPers, cHe, ajustes, costoEquipos, tot]);
    costoTotal += tot;
  }

  const pct = (a: number, b: number) => (100 * a) / b;
  const nPed = filasPedidos.length;

  return {
    archivo: `Base_DFA_${sufijo}.xlsx`,
    intro:
      'Extracción del WMS del centro de distribución de DFA en Lampa para los mismos 30 días del tablero. Hoja «Pedidos»: una fila por pedido de cliente. Hoja «Capacidad»: ocupación diaria del CD. Hoja «Costos»: costos diarios de operación.',
    hojas: [
      {
        nombre: 'Pedidos',
        desc: 'Una fila por pedido preparado y despachado.',
        columnas: [
          { titulo: 'N° pedido', formato: 'texto', desc: 'Identificador del pedido.' },
          { titulo: 'Fecha', formato: 'fecha', desc: 'Día de operación (despacho programado).' },
          { titulo: 'Cliente', formato: 'texto', desc: 'Cliente.' },
          { titulo: 'Tipo cliente', formato: 'texto', desc: 'Ferretería o Constructora.' },
          { titulo: 'Comuna', formato: 'texto', desc: 'Comuna de despacho.' },
          { titulo: 'Fecha y hora ingreso', formato: 'fechahora', desc: 'Cuándo el cliente ingresó el pedido.' },
          { titulo: 'Compromiso despacho', formato: 'fechahora', desc: 'Fecha y hora máxima comprometida para despachar.' },
          { titulo: 'Turno picking', formato: 'texto', desc: 'Noche (22:00–06:00) o Día.' },
          { titulo: 'Picker', formato: 'texto', desc: 'Operario que preparó el pedido (T = temporal).' },
          { titulo: 'Inicio picking', formato: 'fechahora', desc: 'Inicio de la preparación (pistola RF).' },
          { titulo: 'Fin picking', formato: 'fechahora', desc: 'Fin de la preparación.' },
          { titulo: 'Líneas solicitadas', formato: 'entero', desc: 'Productos distintos pedidos.' },
          { titulo: 'Líneas completas', formato: 'entero', desc: 'Líneas preparadas con la cantidad completa.' },
          { titulo: 'Incidencias ubicación vacía', formato: 'entero', desc: 'Veces que el picker llegó a una ubicación del WMS y no encontró el producto.' },
          { titulo: 'Fecha y hora despacho', formato: 'fechahora', desc: 'Salida del camión con el pedido.' },
        ],
        filas: filasPedidos,
      },
      {
        nombre: 'Capacidad',
        desc: 'Una fila por día: ocupación de racks y movimientos de pallets.',
        columnas: [
          { titulo: 'Fecha', formato: 'fecha', desc: 'Día.' },
          { titulo: 'Posiciones de rack', formato: 'entero', desc: 'Capacidad física.' },
          { titulo: 'Pallets en rack', formato: 'entero', desc: 'Pallets ubicados en rack según WMS.' },
          { titulo: 'Ocupación de racks', formato: 'dec2', desc: 'Pallets en rack ÷ posiciones (0,97 = 97%).' },
          { titulo: 'Pallets en piso', formato: 'entero', desc: 'Pallets en pasillos, andenes o piso.' },
          { titulo: 'Pallets recibidos', formato: 'entero', desc: 'Pallets que entraron en el día.' },
          { titulo: 'Pallets despachados', formato: 'entero', desc: 'Pallets que salieron en el día.' },
          { titulo: 'Confirmaciones forzadas WMS', formato: 'entero', desc: 'Ubicaciones confirmadas manualmente, distintas a la sugerida por el WMS.' },
        ],
        filas: filasCap,
      },
      {
        nombre: 'Costos',
        desc: 'Una fila por día con los costos de operación del CD.',
        columnas: [
          { titulo: 'Fecha', formato: 'fecha', desc: 'Día.' },
          { titulo: 'Dotación día', formato: 'entero', desc: 'Personas en turno día.' },
          { titulo: 'Dotación noche', formato: 'entero', desc: 'Personas en turno noche.' },
          { titulo: 'Horas normales', formato: 'entero', desc: 'Dotación total × 9 h.' },
          { titulo: 'Horas extra', formato: 'entero', desc: 'Horas extra del día.' },
          { titulo: 'Costo personal', formato: 'clp', desc: 'Horas normales × $6.800.' },
          { titulo: 'Costo horas extra', formato: 'clp', desc: 'Horas extra × $10.200.' },
          { titulo: 'Ajustes de inventario negativos', formato: 'clp', desc: 'Mercadería dada de baja por diferencias de inventario.' },
          { titulo: 'Costo equipos', formato: 'clp', desc: 'Grúas, pistolas RF y energía.' },
          { titulo: 'Costo total', formato: 'clp', desc: 'Suma de los costos del día.' },
        ],
        filas: filasCostos,
      },
    ],
    retos: [
      {
        id: 'fill', indicador: 'Fill rate', unidad: '%', decimales: 1, tolerancia: 0.06,
        pregunta: '¿Cuál es el fill rate del período? (líneas completas ÷ líneas solicitadas)',
        respuesta: pct(lineasOk, lineasSol),
        formula: 'Fill rate = suma de «Líneas completas» ÷ suma de «Líneas solicitadas» × 100',
        pista: 'Dos sumas de la hoja Pedidos.',
      },
      {
        id: 'otd', indicador: 'OTD · despacho a tiempo', unidad: '%', decimales: 1, tolerancia: 0.06,
        pregunta: '¿Qué porcentaje de los pedidos se despachó antes de su compromiso?',
        respuesta: pct(aTiempo, nPed),
        formula: 'OTD = pedidos con «Fecha y hora despacho» ≤ «Compromiso despacho» ÷ total de pedidos × 100',
        pista: 'Columna auxiliar =SI(O2<=G2;1;0) y luego su promedio.',
      },
      {
        id: 'perfecto', indicador: 'Pedido perfecto', unidad: '%', decimales: 1, tolerancia: 0.06,
        pregunta: '¿Qué porcentaje de los pedidos salió completo y a tiempo?',
        respuesta: pct(perfectos, nPed),
        formula: 'Pedido perfecto = pedidos a tiempo y con Líneas completas = Líneas solicitadas ÷ total de pedidos × 100',
        pista: 'Combinen dos condiciones con Y(): a tiempo y sin líneas faltantes.',
      },
      {
        id: 'lead', indicador: 'Lead time del pedido', unidad: 'h', decimales: 1, tolerancia: 0.06,
        pregunta: '¿Cuántas horas pasan en promedio desde que el cliente ingresa el pedido hasta que se despacha?',
        respuesta: promedio(lead),
        formula: 'Lead time = promedio de (Fecha y hora despacho − Fecha y hora ingreso) × 24',
        pista: 'La resta de fechas en Excel da días: multipliquen por 24.',
      },
      {
        id: 'prod', indicador: 'Eficiencia · productividad de picking', unidad: 'líneas/h', decimales: 1, tolerancia: 0.06,
        pregunta: '¿Cuántas líneas por hora se preparan? (líneas solicitadas ÷ horas de picking)',
        respuesta: lineasSol / horasPick,
        formula: 'Productividad = suma de «Líneas solicitadas» ÷ suma de (Fin picking − Inicio picking) × 24',
        pista: 'Primero calculen las horas de picking de cada pedido en una columna nueva y luego sumen.',
      },
      {
        id: 'costo', indicador: 'Costo por pedido', unidad: 'CLP', decimales: 0, tolerancia: 2,
        pregunta: '¿Cuál es el costo de operación del CD por pedido despachado?',
        respuesta: costoTotal / nPed,
        formula: 'Costo por pedido = suma de «Costo total» (hoja Costos) ÷ cantidad de pedidos (filas de Pedidos)',
        pista: 'El numerador está en la hoja Costos y el denominador en la hoja Pedidos.',
      },
      {
        id: 'fillAlta', indicador: 'Fill rate con racks sobre 97%', unidad: '%', decimales: 1, tolerancia: 0.06,
        pregunta: '¿Cuál es el fill rate solo de los días en que la ocupación de racks fue de 97% o más?',
        respuesta: pct(okAlta, solAlta),
        formula: 'Fill rate de los pedidos cuya Fecha tiene «Ocupación de racks» ≥ 0,97 en la hoja Capacidad',
        pista: 'Traigan la ocupación a la hoja Pedidos con BUSCARV (o BUSCARX) por Fecha y luego usen SUMAR.SI.',
      },
    ],
    preguntasGuia: [
      '¿Cómo se mueve el fill rate día a día comparado con la ocupación de racks?',
      '¿Las incidencias de «ubicación vacía» se concentran en algún turno o en los pickers temporales?',
      '¿Qué tipo de cliente sufre más los pedidos incompletos y atrasados?',
      '¿Cómo evolucionan las horas extra y los ajustes de inventario? ¿Cuánto pesan en el costo por pedido?',
      '¿Qué pasó el día 19 con la productividad? ¿Fue algo puntual?',
    ],
  };
}
