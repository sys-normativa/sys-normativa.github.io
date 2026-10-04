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
      'Régimen que habilita a SYS a operar como proveedor de servicios de pago. Sus cambios pueden alcanzar el registro, el resguardo de fondos de clientes, la información a clientes y los reportes al BCRA.',
  },
  pagos: {
    nombre: 'Transferencias, QR y débitos',
    impacto:
      'Alcanza la operatoria de pagos de SYS: envío, acreditación y rechazo de pagos con QR y transferencias. Puede requerir cambios en el producto o en la integración con entidades y redes.',
  },
  usuarios: {
    nombre: 'Protección de usuarios y consumidores',
    impacto:
      'Normas sobre comisiones, información al cliente y reclamos. Su aplicación a SYS es parcial, dado que sus clientes son empresas.',
  },
  tecnologia: {
    nombre: 'Seguridad informática y riesgo tecnológico',
    impacto:
      'Requisitos mínimos de seguridad y gestión del riesgo tecnológico, aplicables a los PSP desde la Com. A 8398. Suelen requerir adecuaciones de sistemas con plazos definidos.',
  },
  cambios: {
    nombre: 'Exterior y cambios',
    impacto:
      'Aplica si SYS opera pagos en el exterior o en moneda extranjera.',
  },
  lavado: {
    nombre: 'Prevención del lavado de dinero (UIF)',
    impacto:
      'SYS es sujeto obligado ante la UIF desde la Ley 27.739 (identificación de clientes, monitoreo y reporte de operaciones sospechosas). Sus cambios pueden requerir ajustes en el alta de clientes o en el monitoreo.',
  },
  impuestos: {
    nombre: 'Impuestos y regímenes de información (ARCA)',
    impacto:
      'SYS informa a ARCA los movimientos y saldos de sus clientes y puede actuar como agente de retención o percepción. Sus cambios pueden alcanzar sistemas y vencimientos.',
  },
  cheque: {
    nombre: 'Impuesto a los débitos y créditos ("impuesto al cheque")',
    impacto:
      'Las cuentas de pago se encuentran exentas. Una modificación alteraría el costo operativo de SYS y de sus clientes.',
  },
  iibb: {
    nombre: 'Ingresos Brutos sobre cuentas de pago (SIRCUPA)',
    impacto:
      'Retenciones de Ingresos Brutos sobre las acreditaciones en cuentas de pago. Puede modificar las alícuotas aplicables a los clientes de SYS o sus obligaciones como agente.',
  },
  cnv: {
    nombre: 'CNV y activos virtuales',
    impacto:
      'Aplica si SYS remunera saldos mediante fondos comunes de inversión u opera con activos virtuales.',
  },
  datos: {
    nombre: 'Datos personales',
    impacto: 'SYS trata datos personales de los empleados de sus clientes. Sus cambios pueden alcanzar consentimientos, resguardo y políticas de privacidad.',
  },
  informativo: {
    nombre: 'Regímenes informativos del BCRA',
    impacto: 'Modifica la información a presentar al BCRA, su formato o su periodicidad.',
  },
  operativo: {
    nombre: 'Feriados y operatoria bancaria',
    impacto: 'Puede modificar plazos de acreditación de transferencias y vencimientos.',
  },
  general: {
    nombre: 'Sistema financiero en general',
    impacto: 'Norma general del sistema financiero, de aplicación eventual a SYS.',
  },
};
