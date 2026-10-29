import type { DiaKpi, Escenario } from '../types';
import { fechasOperativas, limitar, rampa, redondear, ruido, semilla } from '../lib/datos';

// ─────────────────────────────────────────────────────────────
// ESCENARIO 1 · ÚLTIMA MILLA
// Causa raíz oculta: MercaHogar (productos voluminosos) se incorporó
// sin un proceso de onboarding con Operaciones; el software de ruteo
// sigue usando 4 min por parada y las rutas no caben en el turno.
// El problema parte el día 11.
// ─────────────────────────────────────────────────────────────

function generarDias(): DiaKpi[] {
  const r = semilla(1101);
  const fechas = fechasOperativas('2026-08-17', 30);
  return fechas.map((f, i) => {
    const d = i + 1;
    const sab = f.diaSemana === 6;
    const k = rampa(d, 11, 3);
    const sev = k * (1 + 0.14 * rampa(d, 14, 14)); // efecto bola de nieve de los reintentos
    const lluvia = d === 18;
    const panne = d === 15;
    const promoLumen = d >= 5 && d <= 9 ? 55 : 0;

    const programadas = Math.round(
      (sab ? 1160 : 1600) + ruido(r, 40) + promoLumen + (sab ? 140 : 215) * k + ruido(r, 12) * k,
    );
    const rutas = (sab ? 16 : 22) - (panne ? 1 : 0);
    const tParada = 4.3 + ruido(r, 0.15) + 0.95 * k;
    const am = limitar(96 + ruido(r, 0.8) - 3 * sev - (lluvia ? 7 : 0) - (panne ? 4 : 0), 0, 100);
    const pm = limitar(90.5 + ruido(r, 1.2) - 25 * sev - (lluvia ? 9 : 0) - (panne ? 6 : 0), 0, 100);
    const sur = limitar(93 + ruido(r, 1) - 27 * sev - (lluvia ? 9 : 0) - (panne ? 7 : 0), 0, 100);
    const oriente = limitar(93.5 + ruido(r, 1) - 5 * sev - (lluvia ? 6 : 0), 0, 100);
    const primer = limitar(95.2 + ruido(r, 0.7) - 11 * sev - (lluvia ? 5 : 0) - (panne ? 3 : 0), 0, 100);

    return {
      dia: d,
      fecha: f.fecha,
      programadas,
      rutas,
      paradas: redondear(programadas / rutas, 1),
      tParada: redondear(tParada, 1),
      horaSalida: redondear(8.5 + ruido(r, 0.06), 2),
      horaTermino: redondear(18.4 + ruido(r, 0.15) + 2.3 * sev + (lluvia ? 0.6 : 0) - (sab ? 1.2 : 0), 2),
      aTiempo: redondear(0.45 * am + 0.55 * pm, 1),
      aTiempoAM: redondear(am, 1),
      aTiempoPM: redondear(pm, 1),
      aTiempoSur: redondear(sur, 1),
      aTiempoOriente: redondear(oriente, 1),
      primerIntento: redondear(primer, 1),
      reintentos: Math.round(programadas * (1 - primer / 100)),
      reclamos: Math.round(15 + ruido(r, 4) + 52 * sev + (lluvia ? 20 : 0)),
      horasExtra: Math.round(5 + ruido(r, 2) + 40 * sev + (lluvia ? 6 : 0)),
      kmRuta: redondear(93 + ruido(r, 3) + 10 * k, 0),
      costoEntrega: Math.round(2310 + ruido(r, 40) + 520 * sev),
      flota: panne ? 95.5 : 100,
      ausentes: Math.round(r() * 1.4 + (d > 20 ? r() * 1.6 : 0)),
    };
  });
}

export const ultimaMilla: Escenario = {
  id: 'ultima-milla',
  tipo: 'Última milla',
  titulo: 'Entregas que no llegan a tiempo',
  empresa: 'Despachos Cordillera SpA',
  ubicacion: 'Cross-dock en Quilicura · reparto en 18 comunas de Santiago',
  resumen:
    'Empresa de reparto e-commerce para retailers. En las últimas semanas cayó el cumplimiento de entregas y un cliente clave amenaza con licitar el servicio.',
  color: '#f26b1d',
  briefing: {
    personajeId: 'claudia',
    texto: [
      'Buenas tardes, equipo. Soy Claudia Fuentes, gerenta de operaciones de Despachos Cordillera.',
      'Repartimos pedidos de comercio electrónico desde nuestro cross-dock en Quilicura a dieciocho comunas de Santiago, con veintidós furgones arrendados.',
      'Tenemos un problema serio. El cumplimiento de entregas a tiempo se nos vino abajo, los reclamos se triplicaron y Tiendas Lumen, nuestro cliente más antiguo, nos amenaza con licitar el servicio.',
      'Ya amonestamos a varios conductores y autoricé horas extra sin tope, pero no mejora nada, y el costo por entrega se está disparando.',
      'Necesito que ustedes revisen los indicadores del último mes, conversen con la gente y encuentren la causa raíz. No quiero un culpable: quiero entender qué está pasando de verdad.',
    ],
    mision:
      'Analizar 30 días de operación, definir el problema con 5W2H, entrevistar a los involucrados, construir el Ishikawa, aplicar los 5 Porqués y proponer mejoras priorizadas.',
  },
  kpisIniciales: ['aTiempo', 'primerIntento'],
  kpis: [
    { key: 'programadas', nombre: 'Entregas programadas', unidad: 'entregas', mayorEsMejor: true, decimales: 0, grupo: 'Volumen', descripcion: 'Total de pedidos asignados a ruta en el día.' },
    { key: 'rutas', nombre: 'Rutas operadas', unidad: 'furgones', mayorEsMejor: true, decimales: 0, grupo: 'Volumen', descripcion: 'Furgones que salieron a ruta. Los sábados se opera con menos furgones.' },
    { key: 'paradas', nombre: 'Paradas promedio por ruta', unidad: 'paradas', mayorEsMejor: false, decimales: 1, grupo: 'Volumen', descripcion: 'Entregas programadas dividido por rutas operadas.' },
    { key: 'aTiempo', nombre: 'Entregas a tiempo (total)', unidad: '%', mayorEsMejor: true, decimales: 1, formato: 'pct', grupo: 'Nivel de servicio', descripcion: 'Entregas realizadas dentro de la ventana comprometida. Meta contractual: 92%.' },
    { key: 'aTiempoAM', nombre: 'A tiempo · franja AM (9–14 h)', unidad: '%', mayorEsMejor: true, decimales: 1, formato: 'pct', grupo: 'Nivel de servicio', descripcion: 'Entregas a tiempo de la mañana.' },
    { key: 'aTiempoPM', nombre: 'A tiempo · franja PM (14–21 h)', unidad: '%', mayorEsMejor: true, decimales: 1, formato: 'pct', grupo: 'Nivel de servicio', descripcion: 'Entregas a tiempo de la tarde.' },
    { key: 'aTiempoSur', nombre: 'A tiempo · zona Sur', unidad: '%', mayorEsMejor: true, decimales: 1, formato: 'pct', grupo: 'Nivel de servicio', descripcion: 'La Florida, Puente Alto, La Granja, San Ramón.' },
    { key: 'aTiempoOriente', nombre: 'A tiempo · zona Oriente', unidad: '%', mayorEsMejor: true, decimales: 1, formato: 'pct', grupo: 'Nivel de servicio', descripcion: 'Las Condes, Providencia, Ñuñoa, Vitacura.' },
    { key: 'primerIntento', nombre: 'Éxito en primer intento', unidad: '%', mayorEsMejor: true, decimales: 1, formato: 'pct', grupo: 'Nivel de servicio', descripcion: 'Pedidos entregados en la primera visita. Meta contractual: 94%.' },
    { key: 'reintentos', nombre: 'Pedidos para reintento', unidad: 'pedidos', mayorEsMejor: false, decimales: 0, grupo: 'Nivel de servicio', descripcion: 'Pedidos que vuelven al cross-dock y salen de nuevo al día siguiente.' },
    { key: 'reclamos', nombre: 'Reclamos de clientes', unidad: 'reclamos', mayorEsMejor: false, decimales: 0, grupo: 'Nivel de servicio', descripcion: 'Reclamos recibidos por call center, correo y redes sociales.' },
    { key: 'horaSalida', nombre: 'Hora promedio de salida del cross-dock', unidad: 'h', mayorEsMejor: false, decimales: 2, formato: 'hora', grupo: 'Operación', descripcion: 'Hora en que los furgones dejan el cross-dock (registro de portería).' },
    { key: 'horaTermino', nombre: 'Hora promedio de término de ruta', unidad: 'h', mayorEsMejor: false, decimales: 2, formato: 'hora', grupo: 'Operación', descripcion: 'Hora de la última entrega del día según GPS.' },
    { key: 'tParada', nombre: 'Tiempo promedio en cada parada (GPS)', unidad: 'min', mayorEsMejor: false, decimales: 1, grupo: 'Operación', descripcion: 'Minutos que el furgón permanece detenido por entrega, medido por el GPS de FlotaSur.' },
    { key: 'kmRuta', nombre: 'Kilómetros promedio por ruta', unidad: 'km', mayorEsMejor: false, decimales: 0, grupo: 'Operación', descripcion: 'Distancia recorrida por furgón en el día.' },
    { key: 'horasExtra', nombre: 'Horas extra de conductores', unidad: 'h', mayorEsMejor: false, decimales: 0, grupo: 'Recursos', descripcion: 'Horas trabajadas sobre la jornada pactada (sumatoria de todos los conductores).' },
    { key: 'ausentes', nombre: 'Conductores ausentes', unidad: 'personas', mayorEsMejor: false, decimales: 0, grupo: 'Recursos', descripcion: 'Licencias médicas y ausencias del día.' },
    { key: 'flota', nombre: 'Disponibilidad de flota', unidad: '%', mayorEsMejor: true, decimales: 1, formato: 'pct', grupo: 'Recursos', descripcion: 'Furgones operativos sobre furgones contratados.' },
    { key: 'costoEntrega', nombre: 'Costo por entrega', unidad: 'CLP', mayorEsMejor: false, decimales: 0, formato: 'clp', grupo: 'Costos', descripcion: 'Costo total de la operación del día dividido por entregas exitosas.' },
  ],
  dias: generarDias(),
  bitacora: [
    { dia: 2, area: 'Prevención', texto: 'Capacitación de seguridad vial para todos los conductores (1 hora, antes de la salida).' },
    { dia: 5, area: 'Comercial', texto: 'Tiendas Lumen inicia campaña «Semana del Calzado» (+3% de volumen por 5 días).' },
    { dia: 8, area: 'RR.HH.', texto: 'Ingresan 3 conductores nuevos por rotación habitual.' },
    { dia: 10, area: 'Comercial', texto: 'Correo de Comercial: «Mañana inicia operación MercaHogar, aprox. 200 pedidos diarios».' },
    { dia: 11, area: 'Operaciones', texto: 'Inicio de operación del nuevo cliente MercaHogar.' },
    { dia: 12, area: 'Servicio al cliente', texto: 'Tiendas Lumen envía reclamo formal por entregas fuera de ventana.' },
    { dia: 15, area: 'Flota', texto: 'Furgón FS-23 en panne en Av. Vicuña Mackenna; reemplazo en 2,5 horas.' },
    { dia: 16, area: 'Gerencia', texto: 'Amonestación verbal a 4 conductores por atrasos reiterados.' },
    { dia: 18, area: 'Meteorología', texto: 'Sistema frontal: lluvia intensa en Santiago, anegamientos en La Florida.' },
    { dia: 19, area: 'RR.HH.', texto: 'Renuncia un conductor con 2 años de antigüedad («demasiadas horas»).' },
    { dia: 21, area: 'Operaciones', texto: 'Se autorizan horas extra sin tope para terminar todas las rutas.' },
    { dia: 23, area: 'Comercial', texto: 'Reunión con MercaHogar: reclamos de sus clientes por esperar todo el día.' },
    { dia: 26, area: 'TI', texto: 'Actualización de la app de conductores a la versión 3.2 (mejoras visuales).' },
    { dia: 28, area: 'Comercial', texto: 'Tiendas Lumen anuncia que evaluará licitar el servicio de última milla.' },
  ],
  personajes: [
    {
      id: 'claudia',
      nombre: 'Claudia Fuentes',
      cargo: 'Gerenta de Operaciones',
      organizacion: 'Despachos Cordillera',
      tipo: 'Jefatura',
      personalidad: 'Ejecutiva, directa y apurada. Siente la presión del directorio y quiere resultados rápidos.',
      animoInicial: 'nervioso',
      color: '#2f6fb0',
      voz: { genero: 'f', tono: 1.0, velocidad: 1.08 },
      saludo: ['Hola, pasen. Tengo una reunión con el directorio en media hora, así que vamos al grano. ¿Qué necesitan saber?'],
      preguntas: [
        { id: 'c1', texto: '¿Qué es lo que más le preocupa en este momento?', respuesta: ['Tiendas Lumen. Son el treinta por ciento de nuestra facturación y llevan semanas reclamando. Si licitan el servicio, perdemos al cliente más importante.', 'Y las horas extra. Cada día que pasa el costo por entrega sube.'] },
        { id: 'c2', texto: '¿Desde cuándo notó el problema?', respuesta: ['Diría que desde la segunda semana del período. Los reclamos se dispararon. No tengo el día exacto en la cabeza, para eso están los datos. Revísenlos.'] },
        { id: 'c3', texto: '¿Qué ha cambiado en la operación este último mes?', clave: true, respuesta: ['Nada relevante, la verdad. Entraron conductores nuevos, la rotación de siempre.', 'Ah, y ganamos un cliente nuevo, MercaHogar, que es un tremendo logro comercial. Pero el modelo operativo es exactamente el mismo.'] },
        { id: 'c4', texto: '¿Operaciones participó en la incorporación de MercaHogar?', requiere: ['c3'], clave: true, animo: 'defensivo', respuesta: ['Comercial cerró el contrato y me mandó un correo con el volumen estimado: mil doscientos pedidos semanales. Lo revisé rápido y pensé: con veintidós furgones tenemos capacidad de sobra.', 'No hubo reunión técnica, si es lo que preguntan. Siempre lo hemos hecho así con los clientes nuevos y nunca hubo problemas.'] },
        { id: 'c4b', texto: '¿Los clientes anteriores tenían productos parecidos a los de MercaHogar?', requiere: ['c4'], clave: true, animo: 'nervioso', respuesta: ['No... Lumen es ropa, calzado y accesorios. FarmaPlus son remedios. Todo paquetería chica, bolsas y cajitas.', 'MercaHogar vende cosas para la casa. Muebles armables, microondas, colchones enrollados. Ahora que lo digo en voz alta, es otro tipo de carga.'] },
        { id: 'c5', texto: '¿Qué medidas han tomado hasta ahora?', respuesta: ['Amonestamos a cuatro conductores por atrasos reiterados y autoricé horas extra sin tope para que terminen todas las rutas del día.', 'Pero las horas extra me están matando el costo por entrega, y los reclamos siguen.'] },
        { id: 'c6', texto: '¿Por qué amonestaron a los conductores?', requiere: ['c5'], animo: 'defensivo', respuesta: ['Porque los reportes muestran que los atrasos son en la calle. Llegan tarde a las últimas paradas.', 'Aunque, siendo honesta, no hemos revisado por qué llegan tarde. Asumimos que se demoran o que se pierden.'] },
        { id: 'c7', texto: '¿Cuáles son las metas comprometidas con los clientes?', respuesta: ['Con Tiendas Lumen tenemos contrato: noventa y dos por ciento de entregas a tiempo y noventa y cuatro por ciento de éxito en primer intento.', 'Por cada punto bajo la meta pagamos una multa de medio punto porcentual de la facturación mensual. Lumen nos factura unos cuarenta y ocho millones de pesos al mes.'] },
        { id: 'c8', texto: '¿Cuánto les está costando este problema?', respuesta: ['Entre horas extra, recargos de FlotaSur, segundos intentos y multas, calculo entre nueve y once millones de pesos este mes.', 'Y si perdemos a Lumen, perdemos casi un tercio de la facturación. Eso no es un problema, eso es una crisis.'] },
        { id: 'c9', texto: '¿Ha habido problemas con la flota de furgones?', respuesta: ['Un furgón se quedó en panne el día 15, en Vicuña Mackenna. Fue un mal día, pero FlotaSur respondió bien y mandó el reemplazo en un par de horas. Fuera de eso, nada.'] },
        { id: 'c10', texto: '¿Recibe reportes de GPS de los furgones?', clave: true, respuesta: ['FlotaSur me manda un Excel todos los lunes. Lo uso para revisar la factura de recargos.', 'La verdad es que no lo analizo en detalle. No tengo tiempo, y no sé muy bien qué mirar ahí.'] },
        { id: 'c11', texto: '¿Qué espera de nuestro análisis?', animo: 'cooperador', respuesta: ['Que encuentren la causa raíz, no al culpable. Ya probamos retando a la gente y no funcionó.', 'Y quiero propuestas concretas, que pueda presentar al directorio: qué hacer primero, cuánto cuesta y qué indicador va a mejorar.'] },
      ],
    },
    {
      id: 'jonathan',
      nombre: 'Jonathan Soto',
      cargo: 'Conductor de reparto',
      organizacion: 'Despachos Cordillera',
      tipo: 'Trabajador',
      personalidad: 'Joven, lleva 3 meses en la empresa. Está asustado porque lo amonestaron y teme perder la pega.',
      animoInicial: 'asustado',
      color: '#c0392b',
      voz: { genero: 'm', tono: 1.15, velocidad: 0.92 },
      saludo: ['Eh... hola. ¿Esto es por la amonestación? Mire, yo... yo hago lo que puedo, de verdad. No me vayan a echar, por favor, tengo una guagua.'],
      preguntas: [
        { id: 'j1', texto: 'Tranquilo, no buscamos culpables. ¿Cómo es un día normal de trabajo?', animo: 'nervioso', respuesta: ['Ah... ya, ya. Gracias. Eh, llego a las siete y media al cross-dock en Quilicura. Cargo el furgón con la gente de la señora Carmen y salgo tipo ocho y media.', 'Hago la ruta que me marca la app, en el orden que dice, y vuelvo cuando termino la última entrega.'] },
        { id: 'j2', texto: '¿A qué hora sale del cross-dock?', respuesta: ['Ocho y media, ocho cuarenta. Como siempre. La carga está lista cuando llego, eso no es problema. La señora Carmen es bien ordenada.'] },
        { id: 'j3', texto: '¿Cuántas entregas hace al día?', clave: true, respuesta: ['Cuando entré eran unas setenta, setenta y cinco entregas. Ahora me cargan ochenta y tantas. Ayer fueron ochenta y siete.'] },
        { id: 'j4', texto: '¿Por qué cree que ahora tiene más entregas?', requiere: ['j3'], clave: true, respuesta: ['Por el cliente nuevo, MercaHogar. Llegan cajas grandes, pesadas: microondas, sillas, muebles para armar, hasta colchones enrollados.', 'Antes eran puras bolsitas de ropa, cajitas de remedios. Uno las tomaba con una mano.'] },
        { id: 'j5', texto: '¿Cuánto se demora en entregar un pedido de MercaHogar?', requiere: ['j4'], clave: true, respuesta: ['Uf... Un paquete de ropa lo entrego en tres, cuatro minutos. Un pedido de MercaHogar, entre diez y quince.', 'Hay que bajarlo del furgón, a veces subir a pie a un cuarto piso porque no cabe en el ascensor, esperar en conserjería que llamen al departamento, que firme el titular con carnet... En los condominios de Puente Alto es peor todavía.'] },
        { id: 'j6', texto: '¿A qué hora termina su ruta ahora?', respuesta: ['Antes terminaba a las seis, seis y media. Ahora llego a las últimas paradas a las ocho, ocho y media de la noche.', 'Y a esa hora la gente ya no está, o no contesta el citófono. O me dicen que esperaron todo el día y se tuvieron que ir.'] },
        { id: 'j7', texto: '¿Qué pasa cuando el cliente no está?', requiere: ['j6'], respuesta: ['Lo marco como «cliente ausente» en la app y el paquete vuelve al cross-dock. Al otro día sale de nuevo, sumado a los pedidos nuevos.', 'Entonces al día siguiente tengo todavía más paradas. Es como una bola de nieve, cada día peor.'] },
        { id: 'j8', texto: '¿La app le da tiempos realistas para su ruta?', clave: true, respuesta: ['La app dice que voy a terminar a las cinco cuarenta. Nunca, nunca he terminado a esa hora desde que llegó MercaHogar.', 'Es como si la app pensara que todos los paquetes son iguales. Que un colchón se entrega igual de rápido que una polera.'] },
        { id: 'j9', texto: '¿Le ha comentado esto a alguien?', requiere: ['j8'], animo: 'triste', respuesta: ['Le comenté a don Marcelo, el planificador. Me dijo que el sistema optimiza y que los nuevos somos lentos.', 'Así que no dije nada más. No quería problemas. Si soy el nuevo, soy el primero que echan.'] },
        { id: 'j10', texto: '¿Conoce bien las calles de su ruta?', respuesta: ['Sí, yo soy de La Florida, me conozco el sector de memoria. Además uso Waze. No me pierdo, no es eso.', 'Las entregas de la mañana las hago súper bien, a tiempo. El problema es en la tarde, cuando ya vengo atrasado.'] },
        { id: 'j11', texto: '¿Cómo fue el día de la lluvia?', respuesta: ['El día 18 fue terrible. Vicuña Mackenna inundada, todo lento. Ese día todos llegamos tarde.', 'Pero fue un día. Los otros días igual llego tarde, sin lluvia.'] },
        { id: 'j12', texto: '¿Alguien lo ayuda con los productos pesados?', clave: true, respuesta: ['No, ando solo. Los furgones son para un conductor no más. Cuando me toca un colchón para un cuarto piso, lo subo como puedo... Ya me duele la espalda.'] },
        { id: 'j13', texto: '¿Qué cambiaría usted si pudiera?', animo: 'aliviado', respuesta: ['Que las rutas con cosas grandes tengan menos paradas. O que haya furgones solo para MercaHogar, con un peoneta que ayude a subir.', 'Y que la app calcule bien el tiempo. Gracias por preguntarme, de verdad. Nadie me había preguntado nada.'] },
      ],
    },
    {
      id: 'rodrigo',
      nombre: 'Rodrigo Valdés',
      cargo: 'Cliente final de MercaHogar',
      organizacion: 'Vecino de La Florida',
      tipo: 'Cliente',
      personalidad: 'Furioso. Pidió dos veces el día libre para esperar un pedido que no llegó. Exige respuestas y no tolera excusas.',
      animoInicial: 'furioso',
      color: '#8e44ad',
      voz: { genero: 'm', tono: 0.85, velocidad: 1.18 },
      saludo: ['¡Por fin alguien me contesta! ¿Usted sabe lo que es pedir el día libre en la pega para esperar un mueble que nunca llegó? ¡Dos veces! ¡Dos veces me ha pasado!'],
      preguntas: [
        { id: 'r1', texto: 'Lamentamos mucho lo ocurrido. ¿Qué compró y cuándo se lo prometieron?', animo: 'molesto', respuesta: ['Bueno, al menos alguien pide disculpas. Compré un mueble de televisión y un microondas en MercaHogar.', 'Me dijeron: «entrega el martes entre nueve y veintiuna horas». ¡Doce horas de ventana! Me quedé todo el día encerrado esperando.'] },
        { id: 'r2', texto: '¿A qué hora llegó el furgón la primera vez?', respuesta: ['¡Nunca llegó! A las nueve y cuarto de la noche me llega un mensaje: «Intento fallido, cliente ausente».', '¡Ausente! Yo había salido cinco minutos a comprar pan porque no había comido nada en todo el día. Cinco minutos, después de doce horas.'] },
        { id: 'r3', texto: '¿Y la segunda vez?', requiere: ['r2'], clave: true, animo: 'molesto', respuesta: ['Llegó a las ocho y media de la noche. El chofer, pobre cabro, venía reventado, sudando entero.', 'Me dijo que llevaba ochenta y tantas entregas, que le cargaban de todo. Ahí me dio pena, la verdad. Me di cuenta de que el problema no es él.'] },
        { id: 'r4', texto: '¿Recibió algún aviso de la hora estimada de llegada?', respuesta: ['Ningún aviso. Ni una hora aproximada, nada. Otras empresas te mandan un mensaje: «tu pedido llega en treinta minutos». Aquí, cero.'] },
        { id: 'r5', texto: '¿Cómo fue la entrega cuando finalmente llegó?', clave: true, respuesta: ['El chofer muy amable, nada que decir. Me subió el microondas y el mueble al tercer piso por la escalera, porque la caja del mueble no cabía en el ascensor.', 'Entre que subió, esperó que yo revisara y firmé, se demoró como quince minutos. Pero eso a mí no me importa. ¡A mí me importa que llegue el día que dijeron!'] },
        { id: 'r6', texto: '¿Ha puesto algún reclamo?', animo: 'furioso', respuesta: ['¡Obvio! Reclamo en el SERNAC y en redes sociales. MercaHogar me dice que es culpa del transporte. El transporte me dice que es culpa mía por no estar.', '¡Nadie se hace cargo! ¡Todos se tiran la pelota!'] },
        { id: 'r7', texto: '¿Conoce a otras personas con el mismo problema?', respuesta: ['Mi cuñado, en Puente Alto, compró un colchón. Le llegó al tercer intento. Y en el grupo de WhatsApp del condominio hay otros tres vecinos igual. Todos con compras de MercaHogar.'] },
        { id: 'r8', texto: '¿Qué esperaría de un buen servicio de entrega?', animo: 'neutral', respuesta: ['Que me den una ventana corta, de dos o tres horas. Que me avisen cuando vienen en camino. Y que cumplan.', 'No es tanto pedir, ¿o sí? Hay empresas que lo hacen.'] },
        { id: 'r9', texto: '¿Volvería a comprar en MercaHogar?', respuesta: ['Ni loco. Y se lo dije a toda mi familia. Ustedes no solo le hacen perder un cliente a MercaHogar, me hicieron perder dos días de trabajo.'] },
      ],
    },
    {
      id: 'marcelo',
      nombre: 'Marcelo Ibáñez',
      cargo: 'Planificador de rutas',
      organizacion: 'Despachos Cordillera',
      tipo: 'Trabajador',
      personalidad: 'Técnico, defensivo y algo soberbio. Confía ciegamente en el software y cree que el problema está «en la calle».',
      animoInicial: 'defensivo',
      color: '#16a085',
      voz: { genero: 'm', tono: 0.95, velocidad: 1.05 },
      saludo: ['Hola. Si vienen por las rutas, les adelanto: el sistema optimiza. Las rutas están perfectas. El problema está en la calle, no en mi escritorio.'],
      preguntas: [
        { id: 'm1', texto: '¿Cómo se planifican las rutas cada día?', respuesta: ['A las cinco de la mañana cargo los pedidos del día al software de ruteo, RutaMax. El sistema agrupa por zona, calcula la secuencia óptima de paradas y asigna a los veintidós furgones.', 'Yo reviso que no haya errores y libero las rutas a las siete, cuando llegan los conductores.'] },
        { id: 'm2', texto: '¿Qué parámetros usa el software para calcular los tiempos?', clave: true, respuesta: ['Distancia entre paradas, velocidad promedio por comuna según la hora del día, capacidad del furgón en volumen y peso, y el tiempo de servicio por parada.'] },
        { id: 'm3', texto: '¿Cuál es el tiempo de servicio por parada configurado?', requiere: ['m2'], clave: true, respuesta: ['Cuatro minutos. Es el estándar que medimos cuando implementamos RutaMax en 2024. Para paquetería chica es exacto, lo validamos con cronómetro.'] },
        { id: 'm4', texto: '¿Ese tiempo es el mismo para todos los clientes y productos?', requiere: ['m3'], clave: true, animo: 'nervioso', respuesta: ['Sí, es un parámetro general. El sistema permite configurar tiempos distintos por tipo de producto o por cliente, pero nunca lo hemos necesitado.', 'Todos nuestros clientes eran de paquetería chica... hasta ahora.'] },
        { id: 'm5', texto: '¿Alguien le informó cómo eran los productos de MercaHogar?', requiere: ['m4'], clave: true, animo: 'nervioso', respuesta: ['No. Me llegó un correo de Felipe, de Comercial, el día 10 en la tarde: «Mañana parte MercaHogar, unos doscientos pedidos diarios».', 'Cargué el código del cliente en el sistema y listo. Nadie me dijo que eran colchones y muebles. Me enteré por los conductores.'] },
        { id: 'm6', texto: '¿Cuántas paradas tiene cada ruta?', respuesta: ['Entre ochenta y ochenta y cinco ahora. Antes eran setenta y dos, setenta y cinco.', 'Pero el sistema dice que caben: el volumen del furgón aguanta y el tiempo calculado termina antes de las seis de la tarde.'] },
        { id: 'm7', texto: '¿Compara el tiempo planificado con el tiempo real de las rutas?', requiere: ['m6'], clave: true, animo: 'nervioso', respuesta: ['Eh... no de forma sistemática. El GPS de los furgones registra el tiempo detenido en cada parada, pero ese reporte lo recibe la gerencia, no yo.', 'Yo trabajo con el plan. Si el plan está bien hecho, el resultado debería salir bien.'] },
        { id: 'm8', texto: '¿Por qué cree que los conductores llegan tarde?', respuesta: ['Hay conductores nuevos. Tres entraron el día 8. Los nuevos se demoran, se pierden, conversan mucho con los clientes...'] },
        { id: 'm9', texto: 'Si los conductores nuevos entraron el día 8, ¿por qué el problema parte el día 11?', requiere: ['m8'], animo: 'cooperador', respuesta: ['Bueno... buena pregunta. No lo había pensado así.', 'Y además los atrasos son de todos, no solo de los nuevos. Don Pedro lleva seis años y también está terminando a las nueve de la noche.'] },
        { id: 'm10', texto: '¿Las rutas de la zona sur se comportan distinto?', clave: true, respuesta: ['La zona sur, Puente Alto y La Florida, es donde se concentra MercaHogar... Ahora que lo dice, ahí están los peores atrasos. En Las Condes y Providencia estamos casi igual que antes.'] },
        { id: 'm11', texto: '¿Se podría cambiar el tiempo de servicio en el sistema?', respuesta: ['Técnicamente es un clic. Pero si subo el tiempo, el sistema me va a pedir más furgones para cubrir todas las paradas, y eso es plata.', 'Esa decisión no es mía, es de la gerencia. Y nadie me lo ha pedido.'] },
      ],
    },
    {
      id: 'felipe',
      nombre: 'Felipe Araya',
      cargo: 'Ejecutivo Comercial',
      organizacion: 'Despachos Cordillera',
      tipo: 'Trabajador',
      personalidad: 'Entusiasta y vendedor. Muy orgulloso del contrato que cerró; tiende a minimizar los problemas operacionales.',
      animoInicial: 'entusiasta',
      color: '#d4a017',
      voz: { genero: 'm', tono: 1.1, velocidad: 1.2 },
      saludo: ['¡Hola, hola! ¿Vienen por MercaHogar? ¡El negocio del año! Mil doscientos pedidos semanales, contrato a dos años. Pregunten no más, encantado.'],
      preguntas: [
        { id: 'f1', texto: '¿Cómo se cerró el contrato con MercaHogar?', respuesta: ['Seis meses de negociación, cafecito va, cafecito viene. Les ofrecimos la misma tarifa que a Tiendas Lumen: dos mil cuatrocientos noventa pesos por entrega, con ventana de día completo.', '¡Les encantó! Nuestra competencia les cobraba casi el doble.'] },
        { id: 'f2', texto: '¿La tarifa considera el tamaño o peso del producto?', requiere: ['f1'], clave: true, animo: 'nervioso', respuesta: ['Eh... no. Es tarifa plana por entrega. Para mí una entrega es una entrega.', '¿Por qué? ¿Hay algún problema con eso? Ahora entiendo por qué la competencia cobraba el doble...'] },
        { id: 'f3', texto: '¿Qué información le entregó a Operaciones antes de partir?', clave: true, respuesta: ['Mandé un correo a Claudia y a Marcelo con el volumen estimado y la fecha de inicio. Lo típico, lo que siempre hacemos.'] },
        { id: 'f4', texto: '¿Informó el tipo de productos, peso o tamaño?', requiere: ['f3'], clave: true, animo: 'nervioso', respuesta: ['Estaba en el anexo del contrato, el catálogo de productos: muebles armables, electrodomésticos chicos, colchones enrollados...', 'Pero no lo adjunté al correo, eran como cuarenta páginas. Pensé que Operaciones lo pediría si lo necesitaba.'] },
        { id: 'f5', texto: '¿Existe un procedimiento para incorporar clientes nuevos?', clave: true, respuesta: ['¿Procedimiento? Mmm... no formal. Yo cierro el negocio, aviso por correo, y Operaciones se las arregla. Siempre ha funcionado así.', 'Bueno, antes todos los clientes eran de paquetería chica. Nunca habíamos tenido uno tan distinto.'] },
        { id: 'f6', texto: '¿Qué zonas de Santiago concentra MercaHogar?', clave: true, respuesta: ['Su fuerte es Puente Alto, La Florida y Maipú. Familias jóvenes que se cambian a departamentos nuevos y compran todo para la casa. Es su público objetivo.'] },
        { id: 'f7', texto: '¿MercaHogar ha reclamado por el servicio?', respuesta: ['Sí, tuvimos reunión el día 23. Están molestos: sus clientes esperan todo el día y no les llega.', 'Me preguntaron si podíamos ofrecer ventanas de tres horas. Les dije que lo íbamos a ver. Ojalá se pueda, si no, se nos cae el contrato.'] },
        { id: 'f8', texto: '¿Cómo está la relación con Tiendas Lumen?', respuesta: ['Complicada. Javiera, su jefa de cuenta, me llama todos los días. Y no entiendo por qué, si ellos no cambiaron nada. Su volumen es el mismo de siempre.'] },
        { id: 'f9', texto: '¿Los pedidos de Lumen y de MercaHogar van en los mismos furgones?', requiere: ['f8'], animo: 'cooperador', respuesta: ['Sí, claro. El sistema mezcla todo por zona para optimizar.', 'Ah... entonces si los pedidos de MercaHogar atrasan la ruta, los de Lumen que van al final también llegan tarde. ¿Será eso? Uf.'] },
      ],
    },
    {
      id: 'carmen',
      nombre: 'Carmen Rivas',
      cargo: 'Supervisora de cross-dock',
      organizacion: 'Despachos Cordillera',
      tipo: 'Trabajador',
      personalidad: 'Práctica, cansada y sin rodeos. Lleva 12 años en la empresa y conoce la operación mejor que nadie.',
      animoInicial: 'neutral',
      color: '#7f8c8d',
      voz: { genero: 'f', tono: 0.92, velocidad: 1.0 },
      saludo: ['Hola, chiquillos. Tengo diez minutos, que a las siete empieza la carga. Pregunten rápido, que no tengo todo el día.'],
      preguntas: [
        { id: 'ca1', texto: '¿A qué hora salen los furgones del cross-dock?', respuesta: ['Ocho y media, todos los días, como reloj. Mírenlo en los datos si no me creen. Desde que estoy acá no ha cambiado.'] },
        { id: 'ca2', texto: '¿Ha cambiado algo en la carga este mes?', clave: true, respuesta: ['Los bultos de MercaHogar. Ocupan harto espacio. Un furgón que antes iba a medio llenar, ahora va lleno hasta el techo.', 'Hay que cargar con más cuidado para que un microondas no aplaste las cajitas de Lumen.'] },
        { id: 'ca3', texto: '¿Eso ha afectado la hora de salida?', requiere: ['ca2'], respuesta: ['Nos demoramos un poco más en cargar, pero mi equipo entra media hora antes, a las siete. Así que los furgones salen a la misma hora.', 'A costa de mi gente, eso sí. Nadie me lo ha agradecido.'] },
        { id: 'ca4', texto: '¿Cuántos pedidos vuelven sin entregar?', clave: true, respuesta: ['Antes volvían veinte, treinta bultos por día. Ahora vuelven doscientos, doscientos cincuenta. Y la mitad son de MercaHogar.', 'Se me está llenando la zona de devoluciones. Y esos vuelven a salir al otro día, encima de los pedidos nuevos.'] },
        { id: 'ca5', texto: '¿Qué opina de los conductores?', respuesta: ['Son buenos cabros. El Jonathan es nuevo, pero es responsable, llega antes que todos.', 'Los están retando por algo que no es culpa de ellos. Vuelven a las nueve de la noche, muertos de cansancio.'] },
        { id: 'ca6', texto: '¿Los furgones se cargan en el orden de la ruta?', respuesta: ['Sí, en orden inverso: lo último que se entrega va al fondo del furgón. Eso está bien hecho, lo revisamos todos los días. No busquen por ahí.'] },
        { id: 'ca7', texto: '¿Tiene alguna idea de qué está pasando?', clave: true, animo: 'cooperador', respuesta: ['Mire, yo no soy ingeniera. Pero la cuenta es simple: si le metes más paradas a la ruta y cada parada se demora el triple, no te alcanza el día.', 'Eso lo sabe cualquiera que haya repartido alguna vez. Los de la oficina deberían salir un día en el furgón.'] },
      ],
    },
    {
      id: 'hector',
      nombre: 'Héctor Muñoz',
      cargo: 'Jefe de cuenta',
      organizacion: 'FlotaSur · arriendo de furgones',
      tipo: 'Proveedor',
      personalidad: 'Bromista, relajado y conversador. Siempre tiene una anécdota y aprovecha de vender algo.',
      animoInicial: 'cooperador',
      color: '#27ae60',
      voz: { genero: 'm', tono: 0.8, velocidad: 0.95 },
      saludo: ['¡Buenas, buenas! Héctor Muñoz, de FlotaSur, a sus órdenes. Si vienen por el furgón que se quedó en Vicuña, ya les pido disculpas. ¡Pero pasa en las mejores familias!'],
      preguntas: [
        { id: 'h1', texto: '¿Qué pasó con el furgón FS-23?', respuesta: ['El día 15 se le cortó la correa de distribución en plena Vicuña Mackenna, a la altura de Macul. Mandamos el de reemplazo en dos horas y media.', 'Mala suerte no más, ese furgón tenía la mantención al día. Le pasa hasta a los autos de la Fórmula Uno.'] },
        { id: 'h2', texto: '¿Cómo ha estado la flota en general este mes?', respuesta: ['Impecable, mi amigo. Disponibilidad sobre el noventa y nueve por ciento. Ese fue el único problema del mes. Los furgones están bien, se los firmo.'] },
        { id: 'h3', texto: '¿Ha notado algún cambio en cómo se usan los furgones?', clave: true, respuesta: ['¡Uy, sí! Los GPS muestran que están andando hasta las nueve de la noche. Antes volvían a las seis y media.', 'Y el tiempo detenido en cada parada subió harto: de cuatro minutos y algo, a más de cinco en promedio. En algunas paradas, hasta veinte minutos. Sobre todo en Puente Alto y La Florida.'] },
        { id: 'h4', texto: '¿Comparten ese reporte de GPS con la empresa?', requiere: ['h3'], clave: true, respuesta: ['Se lo mandamos todos los lunes a Claudia por correo, un Excel bien completo. Yo no sé si alguien lo abre, ja, ja.', 'Nadie nos ha preguntado nada sobre los tiempos. Solo nos preguntan por la factura.'] },
        { id: 'h5', texto: '¿Los furgones son adecuados para productos voluminosos?', respuesta: ['Son furgones de ocho metros cúbicos, pensados para paquetería. Para muebles y colchones yo les ofrecería unos de doce metros cúbicos con plataforma elevadora.', 'Tenemos disponibles, por si acaso. Les hago un precio especial, ¿ah?'] },
        { id: 'h6', texto: '¿Ha cambiado el kilometraje?', respuesta: ['Un poco, de noventa y tantos kilómetros por ruta a cien y algo. Pero lo que más subió son las horas detenido con el motor apagado.', 'Eso no es manejo, eso es estar parado entregando. El chofer está más tiempo bajándose que manejando.'] },
        { id: 'h7', texto: '¿Hay recargos por uso fuera de horario?', respuesta: ['Sí, después de las diecinueve horas cobramos un recargo por hora de uso. Este mes la factura de recargos viene gordita, les aviso desde ya para que no se asusten.'] },
      ],
    },
  ],
  opcionesCausa: [
    { id: 'u1', nivel: 'distractor', texto: 'Los conductores nuevos no conocen bien las calles y se demoran.', retro: 'Los conductores nuevos ingresaron el día 8 y los indicadores se mantuvieron estables hasta el día 11. Además, la franja AM casi no cambió y los atrasos afectan también a conductores antiguos. Los datos no respaldan esta hipótesis.' },
    { id: 'u2', nivel: 'sintoma', texto: 'Los clientes finales no están en su casa cuando llega el furgón.', retro: 'Esto es un síntoma. Los clientes no están porque el furgón llega de noche, fuera de lo esperado. Pregúntense: ¿por qué el furgón llega tan tarde?' },
    { id: 'u3', nivel: 'distractor', texto: 'El cross-dock despacha tarde los furgones.', retro: 'La hora promedio de salida se mantiene en torno a las 08:30 durante todo el período. La supervisora y los conductores lo confirman. Esta causa queda descartada con evidencia.' },
    { id: 'u4', nivel: 'intermedia', texto: 'Las rutas tienen más paradas y más tiempo de entrega del que cabe en el turno.', retro: 'Van bien: es una causa real, pero intermedia. ¿Por qué el sistema arma rutas que no caben en el turno? Sigan preguntando por qué.' },
    { id: 'u5', nivel: 'intermedia', texto: 'El software de ruteo usa 4 minutos por parada para todos los productos, aunque los de MercaHogar tardan 10–15 minutos.', retro: 'Muy cerca. Es la causa técnica directa. Pero un parámetro mal configurado es la consecuencia de algo: ¿por qué nadie lo ajustó cuando entró un cliente tan distinto? Un porqué más.' },
    { id: 'u6', nivel: 'raiz', texto: 'No existe un procedimiento de incorporación de clientes nuevos que obligue a revisar con Operaciones el perfil de carga y los parámetros de ruteo antes de iniciar la operación.', retro: '¡Causa raíz! Comercial cerró un cliente con productos voluminosos y tarifa plana, y Operaciones solo recibió un volumen por correo. Sin un proceso de onboarding nadie revisó el perfil de carga, el tiempo de servicio ni la flota. Si solo cambian el parámetro, el próximo cliente distinto repetirá el problema.' },
    { id: 'u7', nivel: 'distractor', texto: 'La falla del furgón FS-23 y la lluvia del día 18.', retro: 'Son eventos puntuales: se ven como caídas de un solo día en los gráficos. El problema parte el día 11 y es persistente; estos eventos lo agravan, pero no lo explican.' },
  ],
  solucion: {
    cadena: [
      'Desde el día 11 caen las entregas a tiempo (93% → 78%) y el éxito en primer intento (95% → 84%), sobre todo en la franja PM y en la zona sur.',
      '¿Por qué? Los conductores llegan a las últimas paradas después de las 20:00, cuando el cliente ya no está, y se generan reintentos que sobrecargan los días siguientes.',
      '¿Por qué? Las rutas tienen más paradas (≈73 → ≈82) y cada parada tarda más (4,3 → 5,3 min promedio según GPS) de lo que el turno permite.',
      '¿Por qué? El software de ruteo calcula con un tiempo de servicio fijo de 4 minutos, pero los pedidos voluminosos de MercaHogar requieren 10–15 minutos.',
      '¿Por qué? Comercial incorporó a MercaHogar informando solo el volumen; nadie revisó el perfil de carga ni ajustó parámetros, flota o tarifa.',
      'Causa raíz: no existe un procedimiento de incorporación de clientes (onboarding) que obligue a evaluar con Operaciones el perfil de carga y los parámetros operacionales antes de iniciar.',
    ],
    ishikawa: {
      'Mano de obra': ['Conductores solos, sin peoneta, para productos pesados', 'Fatiga por jornadas hasta las 21:00', 'Descartado: conductores nuevos (ingresaron antes del problema)'],
      'Método': ['Sin procedimiento de onboarding de clientes', 'Tiempo de servicio único para todos los productos', 'Ventana de entrega de 12 horas sin aviso al cliente', 'Respuesta con amonestaciones en vez de análisis'],
      'Máquina': ['Furgones de 8 m³ sin plataforma para voluminosos', 'Software de ruteo mal parametrizado'],
      'Material': ['Productos voluminosos de MercaHogar mezclados con paquetería chica'],
      'Medición': ['No se compara tiempo planificado vs. real (GPS)', 'Reporte semanal de FlotaSur sin análisis', 'KPIs sin apertura por cliente, franja ni zona'],
      'Medio ambiente': ['Edificios sin ascensor amplio y conserjerías en zona sur', 'Lluvia del día 18 (puntual)'],
    },
    explicacion: [
      'La pista central está en los datos: la hora de salida no cambia, la franja AM casi no cae, pero la franja PM, la zona sur, el tiempo por parada y la hora de término empeoran desde el día 11, el mismo día en que inicia MercaHogar.',
      'Las entrevistas con Jonathan, Marcelo, Felipe y Héctor permiten reconstruir la cadena: productos voluminosos → parámetro de 4 min no ajustado → rutas imposibles → entregas nocturnas fallidas → reintentos en bola de nieve.',
      'Amonestar a los conductores atacó el síntoma. Cambiar solo el parámetro sería una corrección; la acción correctiva de fondo es un proceso de onboarding que involucre a Operaciones antes de partir con cualquier cliente.',
    ],
    ideasReferencia: [
      'Configurar tiempo de servicio por tipo de producto/cliente en RutaMax',
      'Procedimiento de onboarding con checklist operacional (perfil de carga, zonas, flota, tarifa)',
      'Rutas dedicadas para voluminosos con peoneta y furgón de 12 m³',
      'Ventanas de 3 horas y aviso SMS/WhatsApp con hora estimada',
      'Tablero semanal de tiempo planificado vs. real usando el GPS',
      'Renegociar tarifa de MercaHogar según volumen o peso',
    ],
  },
};
