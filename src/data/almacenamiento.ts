import type { DiaKpi, Escenario } from '../types';
import { fechasOperativas, limitar, redondear, ruido, semilla } from '../lib/datos';

// ─────────────────────────────────────────────────────────────
// ESCENARIO 3 · ALMACENAMIENTO (centro de distribución)
// Causa raíz oculta: Compras adelantó +40% de importaciones para
// Black Friday sin planificar capacidad con el CD. Los racks se
// saturan (≈98%), no existe procedimiento ni ubicaciones de overflow
// en el WMS, y los pallets quedan en ubicaciones no registradas
// (confirmaciones forzadas, pasillo 14). El problema parte el día 13.
// ─────────────────────────────────────────────────────────────

const POSICIONES = 4800;
const CAPACIDAD_UTIL = 4750;

function generarDias(): DiaKpi[] {
  const r = semilla(3313);
  const fechas = fechasOperativas('2026-09-28', 30);
  let inventario = 4250;
  let acumulado = 0; // errores de ubicación acumulados
  return fechas.map((f, i) => {
    const d = i + 1;
    const sab = f.diaSemana === 6;
    const pico = d >= 8 && d <= 22;
    const llegadaFuerte = d >= 8 && d <= 12;
    const extra25 = d === 25 ? 40 : 0;
    const recibidos = Math.round(
      (sab ? (pico ? 140 : 70) : llegadaFuerte ? 240 : pico ? 180 : 142) + ruido(r, 8) + extra25,
    );
    const despachados = Math.round((sab ? 72 : pico ? 150 : 146) + ruido(r, 6));
    inventario += recibidos - despachados;
    const enRack = Math.min(inventario, CAPACIDAD_UTIL);
    const ocupacion = (enRack / POSICIONES) * 100;
    const enPiso = Math.max(0, inventario - 4650) + Math.round(4 + r() * 3);
    const sev = limitar((ocupacion / 100 - 0.97) / 0.02, 0, 1);
    acumulado = Math.min(1, acumulado + sev * 0.07);
    const baterias = d === 19;

    const pedidos = Math.round((sab ? 190 : 420) + ruido(r, 15));
    const lineas = Math.round(pedidos * (11.8 + ruido(r, 0.4)));
    const fill = limitar(98.6 + ruido(r, 0.3) - 6.2 * sev - 2.2 * acumulado, 0, 100);

    return {
      dia: d,
      fecha: f.fecha,
      pedidos,
      lineas,
      recibidos,
      despachados,
      ocupacion: redondear(ocupacion, 1),
      enPiso,
      fill: redondear(fill, 1),
      faltantes: Math.round(lineas * (1 - fill / 100)),
      vacias: Math.round(7 + ruido(r, 3) + 58 * sev + 14 * acumulado),
      productividad: Math.round(118 + ruido(r, 3) - 24 * sev - 6 * acumulado - (baterias ? 14 : 0)),
      ira: redondear(98.3 + ruido(r, 0.3) - 9 * acumulado, 1),
      ajustes: Math.round((140000 + ruido(r, 50000) + 2600000 * sev * (0.6 + acumulado)) / 1000) * 1000,
      horasExtra: Math.round(10 + ruido(r, 3) + 42 * sev + (baterias ? 8 : 0)),
      reclamos: Math.round(3 + ruido(r, 1.5) + 22 * sev + 6 * acumulado),
      dotacionNoche: d >= 10 ? 20 : 14,
      pistolas: baterias ? 17 : 24,
    };
  });
}

export const almacenamiento: Escenario = {
  id: 'almacenamiento',
  tipo: 'Almacenamiento',
  titulo: 'Pedidos incompletos con la bodega llena',
  empresa: 'Distribuidora Ferretera Andes (DFA)',
  ubicacion: 'Centro de distribución en Lampa · 4.800 posiciones de pallet',
  resumen:
    'CD que abastece a ferreterías y constructoras de Santiago. Los pedidos salen incompletos aunque «la bodega está llena», y un cliente constructor suspendió sus compras.',
  color: '#c0392b',
  briefing: {
    personajeId: 'rodrigo-s',
    texto: [
      'Buenas. Rodrigo Saavedra, gerente del centro de distribución de DFA en Lampa. Disculpen el desorden, estamos en temporada alta.',
      'Abastecemos a más de trescientas ferreterías y a varias constructoras de Santiago. Tenemos cuatro mil ochocientas posiciones de pallet, un WMS y dos turnos: de día preparamos pedidos, de noche recibimos y almacenamos.',
      'El problema: los pedidos están saliendo incompletos. El cumplimiento de líneas bajó, los clientes reclaman todos los días y Constructora Altamira suspendió sus pedidos. Lo absurdo es que la bodega está llena de mercadería.',
      'Contratamos temporales, amonestamos gente, hacemos horas extra todos los días. Nada funciona.',
      'Necesito que investiguen a fondo y me digan cuál es la causa raíz. Y qué hacemos primero.',
    ],
    mision:
      'Analizar 30 días de operación, definir el problema con 5W2H, entrevistar a los involucrados, construir el Ishikawa, aplicar los 5 Porqués y proponer mejoras priorizadas.',
  },
  kpisIniciales: ['fill', 'ocupacion'],
  kpis: [
    { key: 'pedidos', nombre: 'Pedidos preparados', unidad: 'pedidos', mayorEsMejor: true, decimales: 0, grupo: 'Volumen', descripcion: 'Pedidos de clientes preparados y despachados en el día.' },
    { key: 'lineas', nombre: 'Líneas de pedido', unidad: 'líneas', mayorEsMejor: true, decimales: 0, grupo: 'Volumen', descripcion: 'Cantidad de líneas (productos distintos) solicitadas.' },
    { key: 'recibidos', nombre: 'Pallets recibidos', unidad: 'pallets', mayorEsMejor: false, decimales: 0, grupo: 'Volumen', descripcion: 'Pallets que ingresan al CD desde proveedores e importación.' },
    { key: 'despachados', nombre: 'Pallets despachados', unidad: 'pallets', mayorEsMejor: true, decimales: 0, grupo: 'Volumen', descripcion: 'Pallets equivalentes que salen del CD hacia clientes.' },
    { key: 'ocupacion', nombre: 'Ocupación de racks', unidad: '%', mayorEsMejor: false, decimales: 1, formato: 'pct', grupo: 'Capacidad', descripcion: 'Posiciones de pallet ocupadas sobre 4.800 posiciones totales. Operación sana: 85–88%.' },
    { key: 'enPiso', nombre: 'Pallets en piso / pasillos', unidad: 'pallets', mayorEsMejor: false, decimales: 0, grupo: 'Capacidad', descripcion: 'Conteo diario del supervisor de pallets fuera de rack (pasillos, andenes).' },
    { key: 'fill', nombre: 'Fill rate (líneas completas)', unidad: '%', mayorEsMejor: true, decimales: 1, formato: 'pct', grupo: 'Nivel de servicio', descripcion: 'Líneas despachadas completas sobre líneas pedidas. Meta: 98%.' },
    { key: 'faltantes', nombre: 'Líneas con faltante', unidad: 'líneas', mayorEsMejor: false, decimales: 0, grupo: 'Nivel de servicio', descripcion: 'Líneas despachadas incompletas o no despachadas.' },
    { key: 'reclamos', nombre: 'Reclamos de clientes', unidad: 'reclamos', mayorEsMejor: false, decimales: 0, grupo: 'Nivel de servicio', descripcion: 'Reclamos recibidos por servicio al cliente.' },
    { key: 'vacias', nombre: 'Incidencias «ubicación vacía»', unidad: 'incidencias', mayorEsMejor: false, decimales: 0, grupo: 'Operación', descripcion: 'Veces que un picker llega a la ubicación indicada por el WMS y no encuentra el producto.' },
    { key: 'productividad', nombre: 'Productividad de picking', unidad: 'líneas/h', mayorEsMejor: true, decimales: 0, grupo: 'Operación', descripcion: 'Líneas preparadas por hora-persona.' },
    { key: 'ira', nombre: 'Exactitud de inventario (IRA)', unidad: '%', mayorEsMejor: true, decimales: 1, formato: 'pct', grupo: 'Operación', descripcion: 'Ubicaciones contadas cuyo stock físico coincide con el WMS (conteo cíclico).' },
    { key: 'dotacionNoche', nombre: 'Dotación turno noche', unidad: 'personas', mayorEsMejor: true, decimales: 0, grupo: 'Recursos', descripcion: 'Personas en el turno de recepción y almacenaje.' },
    { key: 'pistolas', nombre: 'Pistolas RF operativas', unidad: 'equipos', mayorEsMejor: true, decimales: 0, grupo: 'Recursos', descripcion: 'Terminales de radiofrecuencia disponibles al inicio del turno (de 24).' },
    { key: 'horasExtra', nombre: 'Horas extra', unidad: 'h', mayorEsMejor: false, decimales: 0, grupo: 'Recursos', descripcion: 'Horas sobre la jornada pactada (ambos turnos).' },
    { key: 'ajustes', nombre: 'Ajustes de inventario negativos', unidad: 'CLP', mayorEsMejor: false, decimales: 0, formato: 'clp', grupo: 'Costos', descripcion: 'Valor de las diferencias de inventario ajustadas en el día.' },
  ],
  dias: generarDias(),
  bitacora: [
    { dia: 2, area: 'Inventario', texto: 'Conteo cíclico zona A sin diferencias relevantes.' },
    { dia: 5, area: 'Compras', texto: 'Compras confirma órdenes anticipadas de Black Friday con 12 proveedores.' },
    { dia: 8, area: 'Recepción', texto: 'Comienzan a llegar contenedores de importación (cerámica, herramientas, pinturas).' },
    { dia: 10, area: 'RR.HH.', texto: 'Ingresan 6 trabajadores temporales al turno noche (2 días de inducción).' },
    { dia: 12, area: 'Operaciones', texto: 'Supervisor de noche habilita el pasillo 14 y el andén 3 como «almacenaje provisorio».' },
    { dia: 13, area: 'Operaciones', texto: 'Primeras quejas de pickers por ubicaciones vacías.' },
    { dia: 15, area: 'Servicio al cliente', texto: 'Ferretería El Tornillo (Maipú) reclama por pedido incompleto de cemento y cerámica.' },
    { dia: 17, area: 'Gerencia', texto: 'Se instruye un conteo general del pasillo 14.' },
    { dia: 19, area: 'TI', texto: '7 pistolas RF sin carga por baterías degradadas; se recargan a las 11:00.' },
    { dia: 21, area: 'RR.HH.', texto: 'Amonestación a 2 trabajadores temporales por «mal almacenaje».' },
    { dia: 23, area: 'Prevención', texto: 'Prevención de riesgos alerta por pallets en vías de evacuación.' },
    { dia: 25, area: 'Recepción', texto: 'Llegan 3 contenedores adicionales de Black Friday.' },
    { dia: 27, area: 'Comercial', texto: 'Constructora Altamira suspende sus pedidos por incumplimientos reiterados.' },
  ],
  personajes: [
    {
      id: 'rodrigo-s',
      nombre: 'Rodrigo Saavedra',
      cargo: 'Gerente del CD',
      organizacion: 'Distribuidora Ferretera Andes',
      tipo: 'Jefatura',
      personalidad: 'Estresado, habla rápido. Al principio sospechaba del turno noche, pero está abierto a escuchar.',
      animoInicial: 'nervioso',
      color: '#2f6fb0',
      voz: { genero: 'm', tono: 0.95, velocidad: 1.12 },
      saludo: ['Hola, pasen. Perdón el ruido de las grúas. Pregunten lo que necesiten, mientras más rápido encontremos esto, mejor.'],
      preguntas: [
        { id: 'rs1', texto: '¿Cuál es el problema principal?', respuesta: ['Pedidos incompletos. Antes despachábamos el noventa y ocho, noventa y nueve por ciento de las líneas completas. Ahora estamos bajo el noventa y dos.', 'Las ferreterías reclaman todos los días y Constructora Altamira suspendió sus pedidos.'] },
        { id: 'rs2', texto: '¿Qué ha cambiado en el CD este mes?', clave: true, respuesta: ['Estamos en temporada alta: Compras trajo mercadería para Black Friday. Contratamos seis temporales para el turno noche. Y el CD está lleno, a tope.'] },
        { id: 'rs3', texto: '¿Qué tan lleno está el CD?', requiere: ['rs2'], clave: true, respuesta: ['Los racks están sobre el noventa y siete por ciento. Lo ideal para operar bien es entre ochenta y cinco y ochenta y ocho.', 'Sobre noventa y cinco ya no hay espacio para mover nada. Tenemos pallets en el pasillo 14 y en los andenes.'] },
        { id: 'rs4', texto: '¿Sabía con anticipación que llegaría tanta mercadería?', requiere: ['rs3'], clave: true, animo: 'molesto', respuesta: ['Me enteré cuando empezaron a llegar los contenedores, el día 8. Compras planifica sus órdenes con los proveedores, no con nosotros.', 'Nunca nos preguntan cuánto espacio tenemos. Somos el patio trasero de la empresa.'] },
        { id: 'rs5', texto: '¿Por qué cree que faltan productos en los pedidos?', respuesta: ['Al principio pensé que eran los temporales del turno noche: gente nueva, sin experiencia. Por eso amonestamos a dos.', 'Pero sigue pasando igual. Así que ya no estoy tan seguro.'] },
        { id: 'rs6', texto: '¿Qué tan confiable es el inventario del sistema?', clave: true, respuesta: ['Antes, muy confiable: noventa y ocho por ciento de exactitud en los conteos cíclicos. Ahora ando bajo el noventa.', 'El sistema dice que hay stock en una ubicación y no está. O está, pero en otro lado.'] },
        { id: 'rs7', texto: '¿Existe un procedimiento para cuando no hay espacio en racks?', clave: true, respuesta: ['No. Nunca habíamos llegado a este nivel de ocupación. El supervisor de noche improvisó con el pasillo 14.', 'Pero esas ubicaciones no existen en el WMS. Para el sistema, ese pasillo es solo un pasillo.'] },
        { id: 'rs8', texto: '¿Cuánto está costando el problema?', respuesta: ['Ajustes de inventario por varias decenas de millones este mes, horas extra todos los días, y si perdemos a Constructora Altamira, son ochenta millones de pesos en ventas mensuales.'] },
        { id: 'rs9', texto: '¿Qué espera de nuestro análisis?', animo: 'cooperador', respuesta: ['Que encuentren qué está fallando de verdad. Ya me cansé de buscar culpables.', 'Y que me digan qué puedo hacer esta semana, y qué tengo que pelear con Compras y la gerencia general.'] },
      ],
    },
    {
      id: 'brayan',
      nombre: 'Brayan Contreras',
      cargo: 'Operador de grúa horquilla, turno noche',
      organizacion: 'Distribuidora Ferretera Andes',
      tipo: 'Trabajador',
      personalidad: 'Relajado, irónico y bueno para la talla. Lleva 3 años en el CD y dice las cosas como son.',
      animoInicial: 'cooperador',
      color: '#e67e22',
      voz: { genero: 'm', tono: 1.08, velocidad: 1.1 },
      saludo: ['¿Qué onda? Brayan, operador de grúa, turno noche. Si vienen a retarme, hagan la fila, ja, ja. No, en serio, pregunten no más. Yo digo las cosas como son.'],
      preguntas: [
        { id: 'b1', texto: '¿Cómo funciona el proceso de almacenaje?', respuesta: ['Recepción deja el pallet en el andén con su etiqueta. Yo lo escaneo, el WMS me dice: «llévalo a la ubicación tanto». Voy, escaneo la etiqueta de la ubicación y confirmo. Pallet guardado.', 'Fácil... cuando hay espacio.'] },
        { id: 'b2', texto: '¿Qué pasa cuando la ubicación sugerida está ocupada?', requiere: ['b1'], clave: true, respuesta: ['Ahí está el chiste. Llego a la ubicación y está llena con otro pallet. El WMS cree que está vacía.', 'Entonces busco un hueco donde quepa, lo dejo ahí, y en la pistola digito a mano la ubicación que me pidió el sistema. Porque si no, no me deja cerrar la tarea.'] },
        { id: 'b3', texto: '¿Entonces el sistema registra una ubicación donde el pallet no está?', requiere: ['b2'], clave: true, animo: 'nervioso', respuesta: ['Exacto. Y hay que ser honesto: lo hacemos todos, los nuevos y los antiguos. Si no, no terminas nunca.', 'El supervisor dice: «dale, dale, que viene otro camión». Uno hace lo que puede.'] },
        { id: 'b4', texto: '¿Desde cuándo pasa esto?', clave: true, respuesta: ['Desde que se llenó la bodega, hace unas dos semanas y media. Antes pasaba una vez a la semana, por una etiqueta rota. Ahora, veinte veces por turno.'] },
        { id: 'b5', texto: '¿Qué pasa con los pallets del pasillo 14?', respuesta: ['Eso lo habilitó don Óscar: «déjenlos ahí no más, después los ubicamos». Ese «después» nunca llegó.', 'Hay como doscientos pallets en el pasillo y en los andenes. Hay que pasar de lado.'] },
        { id: 'b6', texto: '¿Esos pallets están registrados en el WMS?', requiere: ['b5'], clave: true, respuesta: ['Nop. En el WMS no existe «pasillo 14». Quedan en el sistema en la ubicación que uno confirmó, o en «recepción».', 'Para el sistema, ese producto está en otra parte. O sea, para el picker no existe.'] },
        { id: 'b7', texto: '¿Los temporales saben usar la pistola?', respuesta: ['Los cabros nuevos aprenden rápido, tuvieron dos días de inducción. No es culpa de ellos.', 'Yo, que llevo tres años, hago exactamente lo mismo. No hay otra.'] },
        { id: 'b8', texto: '¿Qué haría usted?', animo: 'entusiasta', respuesta: ['Crear ubicaciones de verdad en el sistema para el pasillo 14, aunque sean temporales, con su etiqueta. Y que Compras no traiga más de lo que cabe, pues. No es ciencia.', 'Ah, y que no nos dejen confirmar sin escanear. Así nadie hace trampa, ni por apuro.'] },
      ],
    },
    {
      id: 'marisol',
      nombre: 'Marisol Vega',
      cargo: 'Preparadora de pedidos (picker)',
      organizacion: 'Distribuidora Ferretera Andes',
      tipo: 'Trabajador',
      personalidad: 'Conversadora, frustrada y un poco exagerada. Conoce todos los rumores del CD.',
      animoInicial: 'molesto',
      color: '#c2185b',
      voz: { genero: 'f', tono: 1.12, velocidad: 1.18 },
      saludo: ['¡Ay, por fin alguien viene a preguntarnos a nosotras! Siéntense, porque tengo harto que contar. Esto está un desastre. Un de-sas-tre.'],
      preguntas: [
        { id: 'ma1', texto: '¿Cuál es el problema al preparar los pedidos?', clave: true, respuesta: ['Llego a la ubicación que me dice la pistola y está vacía. O tiene otro producto.', 'Ayer me mandaron a buscar cerámica y había sacos de cemento. ¡Cemento! ¿Me entiende?'] },
        { id: 'ma2', texto: '¿Qué hace cuando la ubicación está vacía?', requiere: ['ma1'], respuesta: ['Marco «ubicación vacía» en la pistola y el sistema me manda a otra ubicación, si tiene. Si no tiene, la línea queda como faltante y el pedido sale incompleto.'] },
        { id: 'ma3', texto: '¿El producto realmente no está en el CD?', requiere: ['ma2'], clave: true, respuesta: ['¡Sí está! Esa es la rabia que da. Después lo encuentro en el pasillo 14, o en el andén 3, o en la ubicación de al lado.', 'Una vez encontré los sacos de cemento de la Ferretería El Tornillo al otro día, tapados con film en el pasillo.'] },
        { id: 'ma4', texto: '¿Cuánto tiempo pierde buscando?', respuesta: ['Uf. Antes hacía mis ciento veinte líneas por hora. Ahora, con suerte, noventa. Me paso caminando, buscando, preguntando a las compañeras.'] },
        { id: 'ma5', texto: '¿Desde cuándo pasa?', respuesta: ['Desde mediados del período. Me acuerdo porque fue la semana del cumpleaños de mi hija, el 13 o el 14. Ahí empezó la locura.'] },
        { id: 'ma6', texto: '¿Qué opina del turno noche?', respuesta: ['Dicen que los temporales tienen la culpa, pero yo no creo. Los productos mal ubicados son de todas las marcas, de todos los días.', 'Y el Brayan, que es antiguo, me contó que él también tiene que dejar cosas donde caben. Todos lo hacen.'] },
        { id: 'ma7', texto: '¿Cómo está el ambiente de trabajo?', animo: 'triste', respuesta: ['Pesado. Los pasillos llenos de pallets, hay que pasar de lado con el transpaleta. Prevención de riesgos vino a reclamar.', 'Y horas extra todos los días. Llego a mi casa a las nueve de la noche.'] },
        { id: 'ma8', texto: '¿Han reportado esto a la jefatura?', respuesta: ['¡Mil veces! El jefe dice: «paciencia, es temporada alta».', 'Pero temporada alta hemos tenido siempre, todos los años, y nunca fue así. Algo distinto pasó este año.'] },
      ],
    },
    {
      id: 'sergio',
      nombre: 'Sergio Paredes',
      cargo: 'Dueño',
      organizacion: 'Ferretería El Tornillo, Maipú',
      tipo: 'Cliente',
      personalidad: 'Muy molesto, sarcástico e impaciente. Treinta años en el rubro; siente que lo están haciendo perder clientes.',
      animoInicial: 'furioso',
      color: '#8e44ad',
      voz: { genero: 'm', tono: 0.88, velocidad: 1.15 },
      saludo: ['Mire, joven, le voy a decir algo: en treinta años de ferretería nunca me había pasado esto. Pido cuarenta sacos de cemento y me llegan doce. ¡Doce! ¿Ustedes creen que yo vendo con aire?'],
      preguntas: [
        { id: 's1', texto: 'Lamentamos la situación. ¿Qué productos le han llegado incompletos?', animo: 'molesto', respuesta: ['Cemento, cerámica, pintura... Los productos que más vendo. Tres pedidos seguidos incompletos.', 'Y en la guía viene escrito «sin stock». ¿Sin stock? ¡Si el vendedor me dijo que tenían la bodega llena!'] },
        { id: 's2', texto: '¿Cómo afecta esto a su negocio?', respuesta: ['Tengo maestros que vienen a comprar cemento para una obra. Si no tengo, se van al home center de la esquina y no vuelven.', 'Estoy perdiendo clientes de veinte años por culpa de ustedes.'] },
        { id: 's3', texto: '¿Le avisaron antes que el pedido iba incompleto?', animo: 'furioso', respuesta: ['¡Nada! Me entero cuando llega el camión. Si me avisaran, al menos le compro a otro distribuidor ese día. ¡Es lo mínimo!'] },
        { id: 's4', texto: '¿Después le llegó el producto faltante?', clave: true, respuesta: ['Eso es lo más raro. Al otro día me llama el vendedor: «Don Sergio, encontramos el cemento, se lo mandamos el jueves».', '¿Encontraron? ¿Lo tenían perdido? ¡Una bodega que pierde cuarenta sacos de cemento! Eso no se pierde en un bolsillo.'] },
        { id: 's5', texto: '¿Desde cuándo ocurre?', respuesta: ['Hace unas dos, tres semanas. Antes ustedes eran un reloj. Por eso les compraba a ustedes y no a otros.'] },
        { id: 's6', texto: '¿Qué necesitaría para seguir trabajando con nosotros?', animo: 'molesto', respuesta: ['Pedidos completos. Y si no tienen algo, que me avisen el día anterior.', 'Y un descuento por las molestias, ¿no le parece? Algo de cariño para el cliente.'] },
      ],
    },
    {
      id: 'valentina',
      nombre: 'Valentina Cruz',
      cargo: 'Jefa de Abastecimiento',
      organizacion: 'Distribuidora Ferretera Andes',
      tipo: 'Jefatura',
      personalidad: 'Ejecutiva, segura y orientada al precio. Considera que bodega «siempre se las arregla».',
      animoInicial: 'entusiasta',
      color: '#d4a017',
      voz: { genero: 'f', tono: 1.05, velocidad: 1.15 },
      saludo: ['Hola. Valentina Cruz, Jefa de Abastecimiento. Les cuento altiro: mi equipo consiguió el mejor precio de la historia para Black Friday. Si hay problemas en bodega, son de bodega.'],
      preguntas: [
        { id: 'v1', texto: '¿Qué compras hicieron para Black Friday?', clave: true, respuesta: ['Adelantamos las compras de importación: cerámica, herramientas eléctricas, pinturas. Cuarenta por ciento más de volumen que el año pasado, con doce por ciento de descuento por comprar anticipado.', 'Un ahorro de más de doscientos millones de pesos. Los números hablan solos.'] },
        { id: 'v2', texto: '¿Coordinaron con el CD la llegada de esa mercadería?', requiere: ['v1'], clave: true, animo: 'defensivo', respuesta: ['Le mandamos el calendario de llegadas de contenedores a recepción... bueno, creo que lo mandamos.', 'Nosotros no vemos espacio, vemos precio y disponibilidad. El CD siempre se las arregla.'] },
        { id: 'v3', texto: '¿Existe un proceso de planificación de capacidad entre Compras y el CD?', requiere: ['v2'], clave: true, animo: 'nervioso', respuesta: ['No... no formal. Hay una reunión mensual de planificación, pero el CD casi nunca va. Y nadie me había dicho «oye, no hay espacio».', 'Bueno, hasta ahora.'] },
        { id: 'v4', texto: '¿Cuánto inventario adicional ingresó?', respuesta: ['Unos quinientos pallets más de lo normal. Se van a vender en noviembre. Es inventario estratégico.'] },
        { id: 'v5', texto: '¿Conoce la ocupación actual del CD?', animo: 'neutral', respuesta: ['No tengo ese dato. ¿Está muy lleno? ¿Cuánto es «lleno» para una bodega? Pensé que mientras cupiera, estaba bien.'] },
        { id: 'v6', texto: 'Los pedidos salen incompletos aunque el producto está en el CD. ¿Qué opina?', requiere: ['v5'], animo: 'nervioso', respuesta: ['Bueno, eso no es Compras, eso es que no encuentran las cosas... Aunque, si lo que trajimos les quitó el espacio para trabajar, entiendo que se relaciona.', '¿Me están diciendo que el ahorro se nos está yendo en ajustes de inventario y en clientes perdidos?'] },
        { id: 'v7', texto: '¿Se pueden reprogramar las llegadas que faltan?', animo: 'cooperador', respuesta: ['Quedan tres contenedores para el día 25. Podríamos pedirle al proveedor que los retenga en el puerto de San Antonio, pagando almacenaje. O arrendar una bodega externa por dos meses.', 'Habría que evaluarlo con números. Eso sí lo sé hacer.'] },
      ],
    },
    {
      id: 'ignacio',
      nombre: 'Ignacio Bravo',
      cargo: 'Soporte técnico',
      organizacion: 'TecnoScan · WMS y pistolas RF',
      tipo: 'Proveedor',
      personalidad: 'Formal y preciso. Defiende su sistema con registros, pero es honesto con lo que muestran los datos.',
      animoInicial: 'defensivo',
      color: '#2980b9',
      voz: { genero: 'm', tono: 1.0, velocidad: 1.0 },
      saludo: ['Buenas tardes. Ignacio Bravo, soporte de TecnoScan. Quiero aclarar desde ya que el WMS no ha tenido caídas ni errores de software este mes. Tengo los registros.'],
      preguntas: [
        { id: 'i1', texto: '¿Cómo decide el WMS dónde guardar un pallet?', respuesta: ['Busca la ubicación libre más cercana a la zona de picking, según la clasificación ABC del producto.', '«Libre» significa libre según el registro del sistema. El sistema solo sabe lo que los operadores confirman.'] },
        { id: 'i2', texto: '¿Qué pasa si se confirma una ubicación donde no se dejó el pallet?', requiere: ['i1'], clave: true, respuesta: ['El sistema queda con un error: cree que el pallet está en una ubicación, pero está en otra. Y la ubicación real donde quedó aparece como vacía.', 'Entonces el sistema sugiere esa ubicación «vacía» al siguiente pallet... y el error se multiplica. Es una bola de nieve.'] },
        { id: 'i3', texto: '¿Los registros muestran algo anormal?', clave: true, animo: 'cooperador', respuesta: ['Sí. Las confirmaciones manuales, digitando la ubicación en vez de escanear la etiqueta, subieron de unas quince por noche a más de ciento veinte desde el día 13.', 'Y son de todos los usuarios: antiguos y temporales por igual.'] },
        { id: 'i4', texto: '¿Por qué el sistema permite confirmar sin escanear?', requiere: ['i3'], respuesta: ['Es una opción pensada para etiquetas dañadas. Se puede bloquear o exigir autorización del supervisor, pero el cliente pidió dejarla libre.', 'Lo podemos cambiar con una configuración, en minutos.'] },
        { id: 'i5', texto: '¿Pueden crear ubicaciones temporales en el sistema?', clave: true, respuesta: ['Sí, claro. Podemos crear una zona de sobrestock con ubicaciones de piso y sus etiquetas, en una hora.', 'Nadie nos lo ha pedido.'] },
        { id: 'i6', texto: '¿Qué pasó con las pistolas el día 19?', respuesta: ['Siete pistolas con baterías degradadas no se cargaron en la noche. Se recargaron a media mañana.', 'Fue un problema de un día y ya cambiamos las baterías. No tiene relación con las ubicaciones.'] },
      ],
    },
    {
      id: 'oscar',
      nombre: 'Óscar Nilo',
      cargo: 'Supervisor turno noche',
      organizacion: 'Distribuidora Ferretera Andes',
      tipo: 'Jefatura',
      personalidad: 'Autoritario y orgulloso. Quince años en la bodega. Está convencido de que el problema son los temporales.',
      animoInicial: 'defensivo',
      color: '#5d6d7e',
      voz: { genero: 'm', tono: 0.85, velocidad: 1.05 },
      saludo: ['Óscar Nilo, supervisor de noche. Quince años en esta bodega. Les digo de inmediato cuál es el problema: la gente nueva. Los temporales no saben trabajar.'],
      preguntas: [
        { id: 'o1', texto: '¿Por qué cree que son los temporales?', respuesta: ['Porque los problemas empezaron cuando llegaron. Gente sin experiencia, no saben leer una etiqueta, se equivocan de rack.'] },
        { id: 'o2', texto: '¿Cuándo llegaron los temporales?', requiere: ['o1'], respuesta: ['El día 10. Unos días antes de que empezaran las quejas.'] },
        { id: 'o3', texto: 'Si llegaron el día 10, ¿por qué los problemas empezaron el día 13?', requiere: ['o2'], clave: true, animo: 'nervioso', respuesta: ['Bueno... tenían que agarrar vuelo, digamos.', 'Aunque, ahora que lo pienso, el día 12 fue cuando se llenaron los racks y habilité el pasillo 14.'] },
        { id: 'o4', texto: '¿Por qué habilitó el pasillo 14?', clave: true, animo: 'molesto', respuesta: ['¿Y qué iba a hacer? Llegaban camiones y no había dónde guardar. O dejaba los pallets en el pasillo o devolvía los camiones.', 'Nadie me dio otra instrucción. Yo resolví.'] },
        { id: 'o5', texto: '¿Se registran en el sistema los pallets del pasillo 14?', requiere: ['o4'], respuesta: ['No... la idea era ubicarlos después, cuando se liberara espacio. Pero el espacio nunca se liberó.'] },
        { id: 'o6', texto: '¿Les pide a los operadores que confirmen ubicaciones aunque no correspondan?', clave: true, animo: 'nervioso', respuesta: ['Yo les digo que avancen. Si hay diez camiones esperando en el andén, no puedo tener a la gente buscando huecos. Se confirma y después se corrige.', 'Bueno... el «después» no ha pasado.'] },
        { id: 'o7', texto: '¿Qué necesitaría para trabajar bien?', animo: 'cooperador', respuesta: ['Espacio. Y saber con anticipación qué va a llegar. Hoy me entero cuando el camión está en la puerta.'] },
      ],
    },
  ],
  opcionesCausa: [
    { id: 'a1', nivel: 'distractor', texto: 'Los trabajadores temporales del turno noche no saben almacenar.', retro: 'Los temporales ingresaron el día 10 y los problemas parten el día 13, cuando la ocupación supera el 97%. Además, los registros del WMS muestran confirmaciones forzadas de antiguos y nuevos por igual.' },
    { id: 'a2', nivel: 'sintoma', texto: 'Los pedidos salen con productos faltantes.', retro: 'Este es el problema que ya conocían. ¿Por qué faltan productos si el inventario existe?' },
    { id: 'a3', nivel: 'distractor', texto: 'Las pistolas RF fallan por problemas de batería.', retro: 'Ocurrió solo el día 19 y afectó la productividad ese día. El problema de ubicaciones vacías es persistente desde el día 13.' },
    { id: 'a4', nivel: 'intermedia', texto: 'Los operadores confirman en el WMS ubicaciones donde no dejaron el pallet.', retro: 'Van bien: explica por qué el WMS «miente». Pero, ¿por qué lo hacen antiguos y nuevos por igual? ¿Qué los obliga?' },
    { id: 'a5', nivel: 'intermedia', texto: 'Los racks están sobre el 97% de ocupación y no hay ubicaciones libres reales.', retro: 'Muy cerca. La saturación es la condición que dispara el problema. Pero, ¿por qué se llegó a ese nivel y por qué no había un plan para manejarlo?' },
    { id: 'a6', nivel: 'raiz', texto: 'No existe planificación de capacidad entre Compras y el CD, ni un procedimiento de sobrestock con ubicaciones temporales registradas en el WMS.', retro: '¡Causa raíz! Compras adelantó un 40% del volumen sin consultar la capacidad del CD. Al saturarse los racks, no había un procedimiento ni ubicaciones de sobrestock en el WMS, así que los pallets se guardaron donde cupieron, sin registro. El ahorro de compra se pierde en ajustes y clientes.' },
    { id: 'a7', nivel: 'distractor', texto: 'El WMS tiene errores de software.', retro: 'El proveedor muestra registros sin caídas ni errores. El WMS hace lo que le informan: el error está en los datos que recibe, no en el software.' },
  ],
  solucion: {
    cadena: [
      'Desde el día 13 el fill rate cae de ~98,6% a ~90% y las incidencias de «ubicación vacía» pasan de ~7 a más de 70 por día.',
      '¿Por qué? Los pickers no encuentran el producto donde indica el WMS, aunque el producto sí está en el CD.',
      '¿Por qué? Los pallets se guardan en ubicaciones distintas a las registradas (huecos, pasillo 14, andenes) y se confirman ubicaciones forzadas.',
      '¿Por qué? Los racks superan el 97% de ocupación: el WMS sugiere ubicaciones que en la realidad están llenas y no hay ubicaciones de sobrestock en el sistema.',
      '¿Por qué? Compras adelantó +40% de importaciones para Black Friday sin coordinar con el CD la capacidad disponible.',
      'Causa raíz: no existe planificación de capacidad entre Compras y el CD ni un procedimiento de sobrestock con ubicaciones temporales registradas en el WMS.',
    ],
    ishikawa: {
      'Mano de obra': ['Operadores fuerzan confirmaciones (antiguos y temporales)', 'Presión del supervisor por avanzar', 'Descartado: temporales (ingresaron antes del problema)'],
      'Método': ['Sin procedimiento de sobrestock', 'Pasillo 14 sin registro en el WMS', 'Sin planificación de capacidad Compras–CD', 'Amonestaciones en vez de análisis'],
      'Máquina': ['WMS permite confirmar sin escanear', 'Pistolas RF sin batería (puntual, día 19)'],
      'Material': ['Sobrestock de importación (+40%, ~500 pallets)'],
      'Medición': ['Ocupación del CD no se comparte con Compras', 'Exactitud de inventario cae sin alertas', 'Confirmaciones manuales no monitoreadas'],
      'Medio ambiente': ['Racks sobre 97% de ocupación', 'Pasillos obstruidos y riesgo de seguridad'],
    },
    explicacion: [
      'La pista central es la secuencia temporal: recepciones suben desde el día 8, la ocupación cruza el 97% el día 12 y desde el día 13 se disparan las ubicaciones vacías. La dotación del turno noche cambió el día 10, sin efecto inmediato.',
      'Brayan, Ignacio y Óscar explican el mecanismo: el WMS sugiere ubicaciones que físicamente están llenas, se confirman a mano y el error se multiplica en bola de nieve.',
      'Amonestar a los temporales atacó un síntoma. La acción de fondo es coordinar capacidad entre Compras y el CD (S&OP) y contar con un procedimiento de sobrestock con ubicaciones registradas.',
    ],
    ideasReferencia: [
      'Crear en el WMS una zona de sobrestock con ubicaciones de piso etiquetadas',
      'Bloquear la confirmación manual sin escaneo (o exigir clave del supervisor)',
      'Reunión semanal Compras–CD con proyección de ocupación (S&OP)',
      'Retener contenedores en puerto o arrendar bodega externa temporal',
      'Inventario y reubicación del pasillo 14 en un turno dedicado',
      'Alerta automática cuando la ocupación supere el 90%',
    ],
  },
};
