// Rearma la página del monitor con los informes ya guardados, sin revisar las
// fuentes. Sirve después de cambiar el diseño: npm run pagina

import { escribirSitio } from './sitio.js';

const ultimo = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
await escribirSitio(ultimo.format(new Date()).replace(',', ' a las'));
console.log('Página del monitor: salida/index.html');
