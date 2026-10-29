import type { DiaKpi, Escenario } from '../types';
import { fechasOperativas, limitar, redondear, ruido, semilla } from '../lib/datos';

// ─────────────────────────────────────────────────────────────
// ESCENARIO 2 · PRIMERA MILLA (cadena de frío)
// Causa raíz oculta: para cumplir las nuevas citas de andén del CD,
// Transporte adelantó la recolección de 14:00 a 11:00 sin coordinar
// con los productores ni analizar el impacto. El camión llega antes
// del hidroenfriado y se carga producto caliente. Nadie mide la pulpa
// en origen. El problema parte el día 9.
// ─────────────────────────────────────────────────────────────

const VALOR_PALLET = 320000;

function generarDias(): DiaKpi[] {
  const r = semilla(2207);
  const fechas = fechasOperativas('2026-01-05', 30);
  return fechas.map((f, i) => {
    const d = i + 1;
    const sab = f.diaSemana === 6;
    const despues = d >= 9;
    const calor = d >= 14 && d <= 16;
    const falla7 = d === 20;

    const pallets = Math.round((sab ? 44 : 62) + ruido(r, 3));
    const tAmb = calor ? 34 + r() * 1.3 : 28.5 + ruido(r, 1.8);
    const horaRec = despues ? 11.05 + ruido(r, 0.12) : 14.1 + ruido(r, 0.15);
    const cita = d < 8 ? 97.5 + ruido(r, 1.5) : d === 8 ? 25 : 97 + ruido(r, 2.2);

    // Rechazos por ruta: Paine-Buin (6 camiones) recoge primero; Talagante (2 camiones) recoge al final (13:00)
    const rPaine = despues ? 21 + ruido(r, 3) + (calor ? 6 : 0) + (falla7 ? 4 : 0) : 1.4 + ruido(r, 0.8) + (calor ? 1 : 0);
    const rTala = despues ? 2.8 + ruido(r, 1.2) + (calor ? 2.5 : 0) + (falla7 ? 18 : 0) : 1.2 + ruido(r, 0.8);
    const rechazo = limitar(0.75 * rPaine + 0.25 * rTala, 0, 100);
    const rechazados = Math.round((pallets * rechazo) / 100);

    const tLlegada = despues
      ? 10.6 + ruido(r, 0.5) + (calor ? 0.9 : 0) + (falla7 ? 1.2 : 0)
      : 6.0 + ruido(r, 0.35) + (d === 8 ? 0.4 : 0);

    return {
      dia: d,
      fecha: f.fecha,
      pallets,
      kg: pallets * 600,
      horaRec: redondear(horaRec, 2),
      esperaPredio: Math.round(despues ? 42 + ruido(r, 6) : 18 + ruido(r, 4)),
      cita: redondear(limitar(cita, 0, 100), 1),
      tLlegada: redondear(tLlegada, 1),
      tCaja: redondear(3.4 + ruido(r, 0.3) + (calor ? 0.4 : 0) + (falla7 ? 1.3 : 0), 1),
      rechazo: redondear(rechazo, 1),
      rechazoPaine: redondear(limitar(rPaine, 0, 100), 1),
      rechazoTalagante: redondear(limitar(rTala, 0, 100), 1),
      rechazados,
      costoRechazo: rechazados * VALOR_PALLET,
      multas: d === 8 ? 1200000 : 0,
      tAmb: redondear(tAmb, 1),
      aperturas: redondear(6.3 + ruido(r, 0.8), 1),
    };
  });
}

export const primeraMilla: Escenario = {
  id: 'primera-milla',
  tipo: 'Primera milla',
  titulo: 'Lechugas rechazadas en el CD',
  empresa: 'Transportes Maipo Frío Ltda.',
  ubicacion: 'Base en San Bernardo · recolección en Paine, Buin y Talagante · entrega en CD SuperValle, Pudahuel',
  resumen:
    'Transporte refrigerado que recoge hortalizas de hoja en predios del sur de la Región Metropolitana y las lleva al CD de una cadena de supermercados. Los rechazos por temperatura se dispararon.',
  color: '#1f8a70',
  briefing: {
    personajeId: 'andrea',
    texto: [
      'Hola, gracias por venir. Soy Andrea Morales, jefa de operaciones de Transportes Maipo Frío.',
      'Tenemos ocho camiones refrigerados. Cada día recogemos lechuga, espinaca, acelga y cilantro en predios de Paine, Buin y Talagante, y lo llevamos al centro de distribución de SuperValle en Pudahuel.',
      'Hace unas semanas logramos algo muy bueno: cumplir casi el cien por ciento de las nuevas citas de andén del cliente. Pero ahora SuperValle nos está rechazando pallets completos por temperatura, y cada pallet rechazado lo pagamos nosotros.',
      'Ayer nos dijeron que, si esto sigue, nos sacan como proveedor. Yo creo que es el calor de este verano, pero necesito que alguien lo analice en serio.',
      'Revisen los datos, conversen con quien tengan que conversar y díganme cuál es la causa raíz y qué hacemos.',
    ],
    mision:
      'Analizar 30 días de operación, definir el problema con 5W2H, entrevistar a los involucrados, construir el Ishikawa, aplicar los 5 Porqués y proponer mejoras priorizadas.',
  },
  kpisIniciales: ['rechazo', 'cita'],
  kpis: [
    { key: 'pallets', nombre: 'Pallets entregados al CD', unidad: 'pallets', mayorEsMejor: true, decimales: 0, grupo: 'Volumen', descripcion: 'Pallets de hortalizas de hoja entregados en el CD de SuperValle.' },
    { key: 'kg', nombre: 'Kilos recolectados', unidad: 'kg', mayorEsMejor: true, decimales: 0, grupo: 'Volumen', descripcion: 'Kilos totales recogidos en los predios (aprox. 600 kg por pallet).' },
    { key: 'horaRec', nombre: 'Hora promedio de recolección en predio', unidad: 'h', mayorEsMejor: false, decimales: 2, formato: 'hora', grupo: 'Operación', descripcion: 'Hora en que el camión inicia la carga en el predio (registro GPS).' },
    { key: 'esperaPredio', nombre: 'Tiempo de espera en predio', unidad: 'min', mayorEsMejor: false, decimales: 0, grupo: 'Operación', descripcion: 'Minutos que el camión espera en el predio antes de poder cargar.' },
    { key: 'cita', nombre: 'Cumplimiento de cita de andén', unidad: '%', mayorEsMejor: true, decimales: 1, formato: 'pct', grupo: 'Nivel de servicio', descripcion: 'Camiones que llegan al CD dentro de la ventana asignada.' },
    { key: 'rechazo', nombre: 'Pallets rechazados por temperatura', unidad: '%', mayorEsMejor: false, decimales: 1, formato: 'pct', grupo: 'Calidad', descripcion: 'Porcentaje de pallets rechazados en recepción por pulpa sobre 8 °C.' },
    { key: 'rechazoPaine', nombre: 'Rechazo · ruta Paine–Buin', unidad: '%', mayorEsMejor: false, decimales: 1, formato: 'pct', grupo: 'Calidad', descripcion: '6 camiones. Primeros predios de la ruta.' },
    { key: 'rechazoTalagante', nombre: 'Rechazo · ruta Talagante', unidad: '%', mayorEsMejor: false, decimales: 1, formato: 'pct', grupo: 'Calidad', descripcion: '2 camiones. Recolección al final de la ruta.' },
    { key: 'tLlegada', nombre: 'Temperatura de pulpa al llegar al CD', unidad: '°C', mayorEsMejor: false, decimales: 1, grupo: 'Calidad', descripcion: 'Promedio medido por SuperValle con termómetro de punzón. Norma: máximo 8 °C.' },
    { key: 'tCaja', nombre: 'Temperatura del aire en la caja (datalogger)', unidad: '°C', mayorEsMejor: false, decimales: 1, grupo: 'Equipos', descripcion: 'Promedio de temperatura del aire dentro de la caja refrigerada durante el viaje.' },
    { key: 'aperturas', nombre: 'Duración media de apertura de puertas', unidad: 'min', mayorEsMejor: false, decimales: 1, grupo: 'Equipos', descripcion: 'Minutos de puerta abierta por predio, según datalogger.' },
    { key: 'rechazados', nombre: 'Pallets rechazados (cantidad)', unidad: 'pallets', mayorEsMejor: false, decimales: 0, grupo: 'Costos', descripcion: 'Pallets devueltos por SuperValle.' },
    { key: 'costoRechazo', nombre: 'Costo de rechazos', unidad: 'CLP', mayorEsMejor: false, decimales: 0, formato: 'clp', grupo: 'Costos', descripcion: 'Valor del producto rechazado que asume el transporte ($320.000 por pallet).' },
    { key: 'multas', nombre: 'Multas por incumplimiento de cita', unidad: 'CLP', mayorEsMejor: false, decimales: 0, formato: 'clp', grupo: 'Costos', descripcion: 'Multas cursadas por SuperValle por llegar fuera de la ventana.' },
    { key: 'tAmb', nombre: 'Temperatura ambiente máxima', unidad: '°C', mayorEsMejor: false, decimales: 1, grupo: 'Entorno', descripcion: 'Máxima diaria en Santiago (dato meteorológico).' },
  ],
  dias: generarDias(),
  bitacora: [
    { dia: 3, area: 'Flota', texto: 'Mantención preventiva del camión 4 (sin novedad).' },
    { dia: 6, area: 'Cliente', texto: 'SuperValle informa: desde el día 8, los perecibles se reciben solo entre 13:00 y 15:00 con cita.' },
    { dia: 8, area: 'Cliente', texto: '6 de 8 camiones llegan fuera de cita. Multa de $1.200.000.' },
    { dia: 8, area: 'Operaciones', texto: 'Jefatura instruye adelantar la recolección a las 11:00 desde el día siguiente.' },
    { dia: 9, area: 'Operaciones', texto: 'Se informa el nuevo horario por el grupo de WhatsApp «Productores Maipo» (07:02 h).' },
    { dia: 12, area: 'RR.HH.', texto: 'Ingresa conductor de reemplazo por licencia médica (camión 3).' },
    { dia: 14, area: 'Meteorología', texto: 'Alerta de calor extremo en la RM: máximas de 34–35 °C hasta el día 16.' },
    { dia: 17, area: 'Comercial', texto: 'Reunión de reclamo con SuperValle por aumento de rechazos.' },
    { dia: 20, area: 'Flota', texto: 'Falla de compresor del equipo de frío del camión 7 (ruta Talagante). Reparado en 24 h.' },
    { dia: 24, area: 'Proveedor', texto: 'Productora Rosa Catalán advierte que podría dejar de venderle a SuperValle.' },
    { dia: 26, area: 'Cliente', texto: 'Auditoría de calidad de SuperValle: «riesgo de suspensión del proveedor de transporte».' },
  ],
  personajes: [
    {
      id: 'andrea',
      nombre: 'Andrea Morales',
      cargo: 'Jefa de Operaciones',
      organizacion: 'Transportes Maipo Frío',
      tipo: 'Jefatura',
      personalidad: 'Segura y orgullosa de su gestión. Toma decisiones rápido y le cuesta reconocer errores propios.',
      animoInicial: 'neutral',
      color: '#2f6fb0',
      voz: { genero: 'f', tono: 1.05, velocidad: 1.1 },
      saludo: ['Pasen, pasen. Les cuento de entrada: lo de las citas lo resolvimos en un día. Ahora necesito resolver esto de las temperaturas igual de rápido.'],
      preguntas: [
        { id: 'a1', texto: '¿Cuál es el problema principal?', respuesta: ['Los rechazos por temperatura. SuperValle mide la pulpa de la lechuga al recibir, y si supera los ocho grados, rechaza el pallet completo.', 'Antes teníamos uno o dos por ciento de rechazo. Ahora, casi uno de cada cinco pallets.'] },
        { id: 'a2', texto: '¿Desde cuándo ocurre?', respuesta: ['Hace unas tres semanas. Justo cuando habíamos solucionado lo de las citas. ¡Qué ironía!'] },
        { id: 'a3', texto: '¿Qué pasó con las citas de andén?', clave: true, respuesta: ['SuperValle cambió su sistema: desde el día 8, los perecibles se reciben solo entre la una y las tres de la tarde. El día 8 llegamos casi todos fuera de cita y nos multaron con un millón doscientos mil pesos.', 'Esa misma tarde decidí adelantar la recolección de las dos a las once de la mañana. Y funcionó: ahora cumplimos el noventa y siete por ciento de las citas.'] },
        { id: 'a4', texto: '¿Consultó el cambio de horario con los productores?', requiere: ['a3'], clave: true, animo: 'defensivo', respuesta: ['No había tiempo. Le pedí a Kevin que les avisara. Los productores tienen que adaptarse, son ellos los que nos venden...', 'Bueno, en realidad le venden a SuperValle. Nosotros solo transportamos.'] },
        { id: 'a5', texto: '¿Evaluó qué otros efectos podía tener adelantar la recolección?', requiere: ['a3'], clave: true, animo: 'nervioso', respuesta: ['Mi foco era la multa. Pensé: llegar antes siempre es mejor, ¿no?', 'Ahora que me lo pregunta así... no. No hice ningún análisis de impacto. Fue una decisión de una tarde.'] },
        { id: 'a6', texto: '¿Qué cree que causa los rechazos?', respuesta: ['Yo diría que el calor. Este verano está terrible. También el camión 7, que falló. Y algunos conductores dejan la puerta abierta mucho rato al cargar.'] },
        { id: 'a7', texto: 'Si el calor fuerte fue entre los días 14 y 16, ¿por qué los rechazos subieron desde el día 9?', requiere: ['a6'], animo: 'cooperador', respuesta: ['Mmm... tiene razón. Los rechazos ya venían de antes del calor. El calor lo empeoró, pero no lo empezó.', 'Y lo del camión 7 fue un solo día. Ya, me están convenciendo de que estaba mirando el lado equivocado.'] },
        { id: 'a8', texto: '¿Cuánto les cuestan los rechazos?', respuesta: ['Cada pallet rechazado lo pagamos nosotros: unos trescientos veinte mil pesos. Ya vamos en más de doscientos pallets. Hagan la cuenta: más de sesenta millones de pesos en tres semanas.', 'Eso es mucho más que la multa que queríamos evitar.'] },
        { id: 'a9', texto: '¿Miden la temperatura del producto al cargarlo?', clave: true, respuesta: ['Los camiones tienen datalogger que registra la temperatura del aire en la caja. La temperatura del producto, la pulpa, la mide SuperValle al recibir.', 'Nosotros no tenemos termómetros de punzón. Nunca los necesitamos.'] },
        { id: 'a10', texto: '¿Qué espera de este análisis?', respuesta: ['Que me digan qué hacer sin volver a perder las citas. No puedo volver a pagar multas.', 'Y si me equivoqué con el horario, prefiero saberlo ahora y no cuando nos saquen como proveedor.'] },
      ],
    },
    {
      id: 'luis',
      nombre: 'Luis Pizarro',
      cargo: 'Conductor de camión refrigerado',
      organizacion: 'Transportes Maipo Frío',
      tipo: 'Trabajador',
      personalidad: 'Veterano gruñón con 25 años en camiones de frío. Sarcástico, sabe mucho y no tiene pelos en la lengua.',
      animoInicial: 'molesto',
      color: '#a0522d',
      voz: { genero: 'm', tono: 0.78, velocidad: 0.9 },
      saludo: ['¿Y ustedes son los ingenieros? Veinticinco años manejando camiones de frío, mijo. Pregunten no más, pero les advierto que yo digo las cosas como son.'],
      preguntas: [
        { id: 'l1', texto: '¿Cómo es su recorrido diario?', respuesta: ['Salgo de San Bernardo, paso a Paine donde la señora Rosa, después a dos predios en Buin, y de ahí por la Autopista Central y Vespucio hasta el CD en Pudahuel.', 'Una hora, hora y media de viaje con el camión cargado, según el taco.'] },
        { id: 'l2', texto: '¿A qué hora recoge ahora?', respuesta: ['A las once, por orden de la jefa. Antes llegaba a las dos de la tarde.'] },
        { id: 'l3', texto: '¿Cómo está el producto cuando lo carga a las once?', requiere: ['l2'], clave: true, respuesta: ['Tibio, mijo. Recién cortado del potrero. La lechuga la están embalando cuando yo llego; a veces la cargo con tierra todavía.', 'Antes, a las dos, la sacaban de la cámara fría de la señora Rosa, heladita. Uno tocaba la caja y estaba fría.'] },
        { id: 'l4', texto: '¿El equipo de frío del camión no la enfría en el camino?', requiere: ['l3'], clave: true, respuesta: ['¡No, pues! El equipo de frío mantiene, no enfría. Es como meter una olla de cazuela recién hecha al refrigerador de la casa: en una hora no se enfría.', 'Eso lo sabe todo el que ha trabajado en frío. Los jóvenes de la oficina no lo saben.'] },
        { id: 'l5', texto: '¿Ha tenido que esperar en los predios?', clave: true, respuesta: ['¡Harto! Ahora espero media hora, cuarenta y cinco minutos en cada predio, mientras terminan de cosechar y embalar.', 'Antes llegaba y estaba todo listo en pallets, frío, esperándome.'] },
        { id: 'l6', texto: '¿Le avisaron con tiempo del cambio de horario?', respuesta: ['A mí me llamó la jefa el día 8 en la noche: «Mañana a las once, Luis». A los productores les mandaron un WhatsApp, creo.', 'La señora Rosa me retó a mí, como si yo tuviera la culpa.'] },
        { id: 'l7', texto: '¿Prende el equipo de frío antes de cargar?', respuesta: ['Siempre, media hora antes, para pre-enfriar la caja. El datalogger lo muestra: la caja va a tres, cuatro grados todo el viaje. Revísenlo si quieren.'] },
        { id: 'l8', texto: '¿Es cierto que deja las puertas abiertas mucho rato al cargar?', animo: 'furioso', respuesta: ['¿Quién le dijo eso? ¿La jefa? Cargamos con cortina plástica y rápido, cinco minutos por predio.', 'Mire, mijo, si quieren buscar culpables, búsquenlos en otro lado. Yo llevo veinticinco años sin un rechazo.'] },
        { id: 'l9', texto: 'Disculpe, no queremos culpar a nadie. ¿Qué pasó con el camión 7?', requiere: ['l8'], animo: 'molesto', respuesta: ['Ya, ya, está bien. El 7 no es el mío, es el del Pato, el de la ruta Talagante. Se le murió el compresor el día 20.', 'Ese día sí que el problema fue el camión. Pero fue un día, y lo arreglaron al otro.'] },
        { id: 'l10', texto: '¿Qué haría usted para solucionarlo?', animo: 'cooperador', respuesta: ['Volver a recoger a las dos y pedirle al CD otra cita. O que nos tengan el producto frío aunque sea a las once, cosechando más temprano.', 'Pero alguien tiene que conversar con alguien, mijo. Aquí nadie conversa. Todo es por WhatsApp.'] },
      ],
    },
    {
      id: 'ricardo',
      nombre: 'Ricardo Henríquez',
      cargo: 'Jefe de Recepción',
      organizacion: 'CD SuperValle, Pudahuel',
      tipo: 'Cliente',
      personalidad: 'Furioso, exigente e intimidante. Se apoya en la norma y amenaza con cambiar de proveedor.',
      animoInicial: 'furioso',
      color: '#8e44ad',
      voz: { genero: 'm', tono: 0.8, velocidad: 1.2 },
      saludo: ['Tengo cinco minutos. Ustedes son de Maipo Frío, ¿no? Les voy a ser bien claro: si esto sigue así, los saco como proveedor. Tengo una norma, y la norma no se negocia.'],
      preguntas: [
        { id: 'rh1', texto: '¿Cuál es la norma de recepción?', respuesta: ['Hortalizas de hoja: temperatura de pulpa máxima de ocho grados. Medimos con termómetro de punzón en tres cajas por pallet.', 'Si una sola caja sale sobre ocho, se rechaza el pallet entero. Así de simple. Es inocuidad alimentaria, no un capricho mío.'] },
        { id: 'rh2', texto: '¿A qué temperatura está llegando el producto?', clave: true, respuesta: ['Diez, once, hasta trece grados. Es una vergüenza. Antes ustedes llegaban a seis, siete grados. Eran de los mejores proveedores que tenía.'] },
        { id: 'rh3', texto: '¿Por qué cambiaron el horario de recepción?', animo: 'defensivo', respuesta: ['Reorganizamos los turnos del CD. Los perecibles entran de una a tres para alcanzar el despacho nocturno a tiendas.', 'Avisamos con dos días de anticipación. Bueno, dos días hábiles. Es suficiente.'] },
        { id: 'rh4', texto: '¿Se podría flexibilizar la ventana de recepción para hortalizas de hoja?', requiere: ['rh3'], clave: true, animo: 'neutral', respuesta: ['¿Flexibilizar? Mmm... Podríamos abrir una ventana de tres a cinco de la tarde para proveedores de hoja, si alguien me trae una propuesta seria.', 'Pero nadie me la ha pedido. Solo llegan a reclamar.'] },
        { id: 'rh5', texto: '¿Ahora llegan a tiempo los camiones?', clave: true, respuesta: ['Puntualitos. Eso sí se los reconozco.', 'Pero, ¿de qué me sirve un camión puntual si viene con la lechuga caliente? Prefiero un camión tarde y frío que uno puntual y caliente.'] },
        { id: 'rh6', texto: '¿El problema ocurre con todos sus proveedores?', respuesta: ['No. Los productores que traen su propio producto desde cámara llegan bien. El problema es con ustedes, desde hace unas tres semanas.', 'Bueno, los camiones de la ruta Talagante llegan mejor. Los de Paine y Buin son un desastre.'] },
        { id: 'rh7', texto: '¿Qué pasa con el producto rechazado?', respuesta: ['Se devuelve. Ustedes se lo llevan y lo paga el transporte. La hoja rechazada no la vende nadie: termina en compost o regalada.'] },
        { id: 'rh8', texto: '¿Cuál es el impacto para SuperValle?', animo: 'furioso', respuesta: ['Quiebre de stock en góndola. Tiendas de Maipú y Ñuñoa sin lechuga en pleno verano.', '¡Me llaman los gerentes de tienda a gritos! ¡Y yo tengo que dar la cara por ustedes!'] },
        { id: 'rh9', texto: 'Entendemos su molestia. ¿Qué necesita de nosotros?', animo: 'molesto', respuesta: ['Un plan concreto, con fechas y con medición. No promesas.', 'Y que alguien mida la temperatura del producto antes de cargarlo, ¡por favor! ¿Cómo es posible que no lo hagan?'] },
      ],
    },
    {
      id: 'rosa',
      nombre: 'Rosa Catalán',
      cargo: 'Productora',
      organizacion: 'Agrícola Santa Rosa, Paine',
      tipo: 'Proveedor',
      personalidad: 'Cariñosa pero dolida. Lleva 12 años trabajando con el transporte y se siente injustamente culpada.',
      animoInicial: 'triste',
      color: '#d35400',
      voz: { genero: 'f', tono: 0.95, velocidad: 0.9 },
      saludo: ['Pase, mijito, pase. Tome asiento. Les voy a contar mi versión, porque a mí me están culpando de algo que yo no hice.'],
      preguntas: [
        { id: 'ro1', texto: '¿Cómo es su proceso de cosecha?', respuesta: ['Cosechamos de seis a diez de la mañana, con la fresca. Después la lechuga pasa por el hidroenfriado: agua helada, a dos grados, para sacarle el calor del campo.', 'Luego va a la cámara fría hasta que llega el camión.'] },
        { id: 'ro2', texto: '¿Cuánto demora el hidroenfriado?', requiere: ['ro1'], clave: true, respuesta: ['Con todo el volumen, termino de enfriar a eso de las doce y media, una de la tarde. Ahí la lechuga queda a cuatro, cinco grados de pulpa. Perfecta.'] },
        { id: 'ro3', texto: '¿Qué cambió con el nuevo horario?', clave: true, animo: 'molesto', respuesta: ['El camión llega a las once. A esa hora tengo la mitad sin enfriar. Don Luis me apura porque tiene que llegar a la cita, y yo tengo que cargar lo que tengo.', 'Lechuga recién cortada, a quince, dieciséis grados. Me duele en el alma mandarla así.'] },
        { id: 'ro4', texto: '¿Le consultaron antes de cambiar el horario?', requiere: ['ro3'], clave: true, animo: 'triste', respuesta: ['¡Nadie! Me llegó un WhatsApp el día 9 a las siete de la mañana: «Desde hoy recolección once horas». Yo ya estaba en el potrero cosechando.', 'Ni una llamada. Doce años trabajando con ellos, mijito.'] },
        { id: 'ro5', texto: '¿Podría cosechar más temprano para tener el producto frío a las once?', respuesta: ['Podría empezar a las cinco, con focos. Pero necesito saberlo con tiempo, organizar a la gente, pagar el turno temprano.', 'Si me lo hubieran preguntado, lo conversábamos. Siempre hay una solución conversando.'] },
        { id: 'ro6', texto: '¿Otros productores tienen el mismo problema?', clave: true, respuesta: ['Todos los de Paine y Buin. Don Jaime, en Talagante, está mejor porque el camión le llega a la una, es el último de la ruta, y ya tiene su lechuga fría en cámara.'] },
        { id: 'ro7', texto: '¿Usted mide la temperatura del producto al cargarlo?', clave: true, respuesta: ['Tengo mi termómetro, el de la cámara. Pero nadie me pide el dato. El chofer carga, firma la guía con los kilos y se va.'] },
        { id: 'ro8', texto: '¿Cómo le está afectando esta situación?', animo: 'molesto', respuesta: ['SuperValle me baja la nota como proveedora y el transporte me echa la culpa. Estoy perdiendo plata y prestigio.', 'Estoy pensando seriamente en venderle a la Vega Central y listo.'] },
      ],
    },
    {
      id: 'kevin',
      nombre: 'Kevin Salazar',
      cargo: 'Coordinador de rutas',
      organizacion: 'Transportes Maipo Frío',
      tipo: 'Trabajador',
      personalidad: 'Joven, ansioso y sobrepasado. Atiende tres teléfonos a la vez y vive apagando incendios.',
      animoInicial: 'nervioso',
      color: '#16a085',
      voz: { genero: 'm', tono: 1.15, velocidad: 1.25 },
      saludo: ['Hola, perdón, perdón, estoy con tres teléfonos sonando... Ya, díganme. ¿En qué los ayudo? Rápido, porfa.'],
      preguntas: [
        { id: 'k1', texto: '¿Cómo comunicó el nuevo horario a los productores?', clave: true, respuesta: ['Por el grupo de WhatsApp «Productores Maipo». La jefa me dijo el 8 en la noche y yo lo mandé apenas pude, el 9 a las siete de la mañana.'] },
        { id: 'k2', texto: '¿Recibió respuesta de los productores?', requiere: ['k1'], animo: 'nervioso', respuesta: ['Algunos pusieron «ok». La señora Rosa me llamó súper enojada. Yo le dije que eran órdenes de arriba. ¿Qué más iba a hacer?'] },
        { id: 'k3', texto: '¿Cómo armó las nuevas rutas?', respuesta: ['Mismo orden que antes, solo moví la hora de salida tres horas antes. Paine primero, después Buin, y Talagante al final. En Talagante el camión llega como a la una.'] },
        { id: 'k4', texto: '¿Tiene datos de rechazos por ruta o productor?', clave: true, respuesta: ['Sí, tengo una planilla. Ahora que la miro... los rechazos son casi todos de Paine y Buin. La ruta de Talagante casi no tiene rechazos. Raro, ¿no?'] },
        { id: 'k5', texto: '¿Por qué cree que Talagante casi no tiene rechazos?', requiere: ['k4'], animo: 'nervioso', respuesta: ['No sé... ¿será porque es el último de la ruta? A esa hora ya tienen todo en cámara...', 'Ah. Ya. Ya entendí. Uf.'] },
        { id: 'k6', texto: '¿Existe algún procedimiento para cambiar horarios o rutas?', clave: true, respuesta: ['¿Procedimiento? No. Aquí todo se decide rápido, por teléfono. Si hay un problema, se apaga el incendio y listo. Nadie revisa qué otra cosa se puede quemar.'] },
        { id: 'k7', texto: '¿Los conductores registran la temperatura del producto al cargar?', respuesta: ['No, solo firman la guía de despacho con los kilos y la hora. La temperatura no está en el formulario.'] },
        { id: 'k8', texto: '¿Cómo está su carga de trabajo?', animo: 'triste', respuesta: ['Terrible. Coordino ocho camiones, los reclamos de SuperValle, los productores enojados... Me siento todo el día apagando incendios.', 'Nunca tengo tiempo para mirar los datos con calma.'] },
      ],
    },
    {
      id: 'tomas',
      nombre: 'Tomás Lillo',
      cargo: 'Técnico de refrigeración',
      organizacion: 'FríoTec · mantención de equipos de frío',
      tipo: 'Proveedor',
      personalidad: 'Técnico, preciso y algo nerd. Le encanta explicar la física del frío con datos.',
      animoInicial: 'cooperador',
      color: '#2980b9',
      voz: { genero: 'm', tono: 1.0, velocidad: 1.05 },
      saludo: ['Buenas tardes. Tomás Lillo, de FríoTec. Mantengo los equipos de frío de los ocho camiones. Antes de que pregunten: sí, revisé los dataloggers. Les puedo explicar todo con datos.'],
      preguntas: [
        { id: 't1', texto: '¿Los equipos de frío están funcionando bien?', respuesta: ['Siete de ocho, perfectos. El aire en la caja se mantiene entre dos y cuatro grados durante todo el viaje.', 'El camión 7 tuvo una falla de compresor el día 20: ese día el aire subió a doce grados. Lo reparamos en veinticuatro horas.'] },
        { id: 't2', texto: '¿Puede el equipo de frío enfriar el producto durante el viaje?', clave: true, respuesta: ['No, y es un error muy común. El equipo de un camión está diseñado para mantener la temperatura, no para extraer el calor de campo.', 'Bajar la pulpa de una lechuga de dieciséis a ocho grados requiere un hidroenfriador o una cámara de frío forzado. En una hora de viaje, con el producto apilado en pallets, la pulpa baja uno o dos grados como mucho.'] },
        { id: 't3', texto: 'Entonces, ¿qué determina la temperatura de llegada?', requiere: ['t2'], clave: true, respuesta: ['Básicamente, la temperatura con la que se carga. Si cargas a cinco grados, llegas a cinco o seis. Si cargas a dieciséis, llegas a doce o trece.', 'Lo que entra caliente, sale caliente. Es termodinámica básica.'] },
        { id: 't4', texto: '¿El calor de los días 14 al 16 afectó?', respuesta: ['Algo. Con treinta y cinco grados afuera, cada apertura de puerta mete calor y el equipo trabaja más. Diría que suma medio grado, un grado.', 'Pero no explica que el producto llegue tres o cuatro grados sobre la norma.'] },
        { id: 't5', texto: '¿Las puertas abiertas son un problema?', respuesta: ['Los dataloggers registran cada apertura. Duran entre cinco y ocho minutos por predio, lo normal. No veo ningún cambio entre antes y después del día 9.'] },
        { id: 't6', texto: '¿Qué recomendaría?', animo: 'entusiasta', respuesta: ['Medir la pulpa con termómetro de punzón antes de cargar y no aceptar producto sobre siete grados. Es práctica estándar de cadena de frío.', 'Les puedo cotizar termómetros: unos treinta mil pesos cada uno. Es lo más barato que van a invertir este año.'] },
      ],
    },
  ],
  opcionesCausa: [
    { id: 'p1', nivel: 'distractor', texto: 'La ola de calor del verano.', retro: 'Los rechazos suben desde el día 9; la ola de calor fue entre los días 14 y 16. El técnico estima que el calor suma medio a un grado. Es un agravante, no la causa.' },
    { id: 'p2', nivel: 'distractor', texto: 'Los equipos de frío de los camiones no funcionan bien.', retro: 'El datalogger muestra el aire de la caja entre 3 y 4 °C todo el período, salvo el camión 7 el día 20. Los equipos funcionan: el problema es lo que se carga.' },
    { id: 'p3', nivel: 'sintoma', texto: 'El producto llega al CD con más de 8 °C de pulpa.', retro: 'Esto es el problema (o síntoma) que ya conocían. ¿Por qué llega caliente si el camión mantiene el frío?' },
    { id: 'p4', nivel: 'intermedia', texto: 'El producto se carga sin hidroenfriar porque el camión llega a las 11:00, antes de que termine el pre-enfriado.', retro: 'Van muy bien: es la causa física directa, y explica por qué Talagante (recolección 13:00) casi no tiene rechazos. Pero, ¿por qué se adelantó el horario sin considerar esto?' },
    { id: 'p5', nivel: 'distractor', texto: 'Los conductores dejan las puertas abiertas al cargar.', retro: 'El datalogger muestra aperturas de 5 a 8 minutos por predio, sin cambios antes y después del día 9. No hay evidencia que la respalde.' },
    { id: 'p6', nivel: 'intermedia', texto: 'SuperValle cambió su ventana de recepción a 13:00–15:00.', retro: 'Es el detonante externo, pero no la causa raíz: un cliente puede cambiar sus condiciones. Lo que falló fue cómo la empresa respondió a ese cambio.' },
    { id: 'p7', nivel: 'raiz', texto: 'El horario de recolección se cambió sin un proceso de gestión del cambio (sin analizar el impacto con productores ni cliente) y el procedimiento de carga no exige medir la temperatura de pulpa en origen.', retro: '¡Causa raíz! La decisión se tomó en una tarde para evitar una multa de $1,2 millones, se comunicó por WhatsApp y generó pérdidas mucho mayores. Sin control de pulpa en la carga, nadie detectó que se estaba cargando producto a 15 °C.' },
  ],
  solucion: {
    cadena: [
      'Desde el día 9 los pallets rechazados por temperatura suben de ~1,5% a ~17%, concentrados en la ruta Paine–Buin.',
      '¿Por qué? El producto llega al CD con 10–13 °C de pulpa, sobre la norma de 8 °C.',
      '¿Por qué? Se carga con 14–17 °C de pulpa, y el equipo de frío del camión solo mantiene la temperatura, no la baja.',
      '¿Por qué? El camión llega a las 11:00, antes de que el productor termine el hidroenfriado (12:30–13:00).',
      '¿Por qué? Se adelantó la recolección para cumplir las nuevas citas del CD sin consultar a los productores ni evaluar el impacto.',
      'Causa raíz: no existe un proceso de gestión del cambio ni un control de temperatura de pulpa en origen como criterio de aceptación de carga.',
    ],
    ishikawa: {
      'Mano de obra': ['Productores presionados a cargar sin terminar el pre-enfriado', 'Conductores sin instrucción de verificar temperatura'],
      'Método': ['Cambio de horario sin análisis de impacto', 'Comunicación por WhatsApp sin coordinación previa', 'Sin criterio de aceptación de temperatura en origen', 'Secuencia de ruta que ignora los tiempos de hidroenfriado'],
      'Máquina': ['El equipo de frío del camión solo mantiene, no enfría', 'Falla puntual del compresor del camión 7 (día 20)'],
      'Material': ['Hortalizas de hoja con calor de campo (14–17 °C)'],
      'Medición': ['No se mide la pulpa al cargar, solo el aire de la caja', 'Rechazos sin análisis por ruta o productor'],
      'Medio ambiente': ['Ola de calor días 14–16 (agravante)', 'Ventana de recepción del CD más estrecha'],
    },
    explicacion: [
      'La pista central es el «experimento natural»: la ruta Talagante, que recoge a las 13:00 con producto ya hidroenfriado, casi no tiene rechazos, mientras Paine–Buin, que recoge a las 11:00, concentra los rechazos.',
      'Los datos muestran el trade-off: la cita de andén mejora el mismo día en que la temperatura de llegada empeora (día 9). El datalogger descarta los equipos y las puertas.',
      'Evitar una multa de $1,2 millones generó pérdidas por más de $60 millones. La acción de fondo es un proceso de gestión del cambio que incluya a productores y cliente, y un control de pulpa en origen.',
    ],
    ideasReferencia: [
      'Medir pulpa con termómetro de punzón en cada carga y rechazar sobre 7 °C',
      'Negociar con SuperValle una ventana de 15:00 a 17:00 para hortalizas de hoja',
      'Acordar con los productores cosecha más temprana con aviso de 1 semana',
      'Procedimiento de gestión del cambio con análisis de impacto y firma de las partes',
      'Agregar temperatura de pulpa a la guía de despacho',
      'Tablero diario de rechazos por ruta y productor',
    ],
  },
};
