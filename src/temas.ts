// Los frentes regulatorios de SYS y cómo le pega a SYS un cambio en cada uno.
// Es la parte "cómo le afecta" del informe: sale de docs/analisis-regulatorio.md,
// así que si cambia el análisis, se cambia acá también.

export type Tema =
  | 'psp'
  | 'pagos'
  | 'usuarios'
  | 'tecnologia'
  | 'cambios'
  | 'lavado'
  | 'impuestos'
  | 'cheque'
  | 'iibb'
  | 'cnv'
  | 'datos'
  | 'informativo'
  | 'operativo'
  | 'general';

export const TEMAS: Record<Tema, { nombre: string; impacto: string }> = {
  psp: {
    nombre: 'Régimen de proveedores de servicios de pago',
    impacto:
      'Es el régimen que habilita a SYS a operar como billetera. Un cambio acá puede tocar el registro, el resguardo de los fondos de los clientes, la información que se les da o lo que hay que reportar al BCRA.',
  },
  pagos: {
    nombre: 'Transferencias, QR y débitos',
    impacto:
      'Toca la operatoria diaria de SYS: cómo se envían, acreditan y rechazan los pagos con QR y transferencias. Puede pedir cambios en el producto o en la integración con el banco o la red.',
  },
  usuarios: {
    nombre: 'Protección de usuarios y consumidores',
    impacto:
      'Reglas sobre comisiones, información al cliente y reclamos. A SYS le aplica en parte, porque sus clientes son empresas, pero conviene que compliance lo confirme.',
  },
  tecnologia: {
    nombre: 'Seguridad informática y riesgo tecnológico',
    impacto:
      'Requisitos mínimos de seguridad y de gestión del riesgo tecnológico, que desde la Com. A 8398 alcanzan a los PSP. Suele implicar trabajo del área de sistemas con plazos de adecuación.',
  },
  cambios: {
    nombre: 'Exterior y cambios',
    impacto:
      'Le importa solo si SYS permite pagar en el exterior o en moneda extranjera. Está pendiente de confirmar con SYS; si no lo hace, se puede descartar.',
  },
  lavado: {
    nombre: 'Prevención del lavado de dinero (UIF)',
    impacto:
      'Desde la Ley 27.739, SYS es sujeto obligado ante la UIF: tiene que conocer a sus clientes, monitorear operaciones y reportar las sospechosas. Un cambio puede pedir ajustar el alta de clientes o el monitoreo.',
  },
  impuestos: {
    nombre: 'Impuestos y regímenes de información (ARCA)',
    impacto:
      'SYS le informa a ARCA los movimientos y saldos de sus clientes, y puede tener que retener o percibir impuestos. Un cambio puede tocar sistemas y fechas de presentación.',
  },
  cheque: {
    nombre: 'Impuesto a los débitos y créditos ("impuesto al cheque")',
    impacto:
      'Hoy las cuentas de pago están exentas. Si eso cambia, cambia lo que le cuesta operar a SYS y a sus clientes.',
  },
  iibb: {
    nombre: 'Ingresos Brutos sobre cuentas de pago (SIRCUPA)',
    impacto:
      'Retenciones de Ingresos Brutos sobre lo que entra a las cuentas de pago. Puede cambiar cuánto se les retiene a los clientes de SYS o qué tiene que hacer SYS como agente.',
  },
  cnv: {
    nombre: 'CNV y activos virtuales',
    impacto:
      'Le importa si SYS remunera los saldos con un fondo común de inversión o toca activos virtuales. Está pendiente de confirmar con SYS.',
  },
  datos: {
    nombre: 'Datos personales',
    impacto: 'SYS maneja datos de los empleados de sus clientes. Un cambio puede pedir revisar consentimientos, resguardo o políticas de privacidad.',
  },
  informativo: {
    nombre: 'Regímenes informativos del BCRA',
    impacto: 'Cambia qué información hay que presentarle al BCRA, con qué formato o cada cuánto. Si alcanza a los PSP, lo tiene que ver quien arma esas presentaciones.',
  },
  operativo: {
    nombre: 'Feriados y operatoria bancaria',
    impacto: 'Puede mover cuándo se acreditan las transferencias o vencen los plazos. Conviene avisarle a operaciones y, si hace falta, a los clientes.',
  },
  general: {
    nombre: 'Sistema financiero en general',
    impacto: 'Es una norma general del sistema financiero. Lo más probable es que no le aplique a SYS, pero vale una mirada rápida.',
  },
};
