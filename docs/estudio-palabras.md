# Estudio de palabras clave

> **Ojo (5/10/2026):** este resultado es de la corrida **anterior** a los ajustes del filtro que salieron de este mismo estudio (PSP postales, transferencia electrónica como forma de pago, números de ley sueltos, Ley 27.739 en considerandos). La sección 1 está mal medida: evaluaba la carta sin el encabezado, y por eso decía que "se escaparían" comunicaciones que en la práctica siempre se detectan. El script ya está corregido (`npm run estudio`); falta volver a correrlo para tener los números finales. La segunda corrida se cortó por falta de memoria en la compu.

Corrido el 4 de octubre de 2026 con `npm run estudio`. Fuentes oficiales; la IA solo opina sobre normas reales.

## 1. Comunicaciones del BCRA dirigidas a los PSP (A 8000 a A 8488)

- Leídas: 489. Dirigidas a los PSP: **66**.
- Con el filtro por palabras solo (sin el atajo "dirigida a los PSP"): 25 "Le afecta", 11 "Para revisar", **30 se escaparían**.

En la corrida diaria estas comunicaciones nunca se escapan (el atajo las marca siempre). Esta prueba mide si las palabras clave alcanzan para normas parecidas que lleguen por el Boletín Oficial.

Las que el filtro solo no detectaría:

| Comunicación | Tema |
| --- | --- |
| A 8023 (17/05/2024) | Circular SINAP 1-209: Plataformas para el financiamiento MiPyME. Actualización. |
| A 8038 (06/06/2024) | Circular SINAP 1-212: Proveedores de servicios de pago. Adecuaciones. |
| A 8051 (27/06/2024) | Circular SINAP 1-214: “Sistema Nacional de Pagos – Cheques y otros instrumentos compensables”. “Sistema Nacional de Pagos – Cámaras Electrónicas de Compensación”. "Plataformas para el financiamiento MiPy- ME". Actualización. |
| A 8131 (12/11/2024) | Circular CAMEX 1-1032, LISOL 1-1081, OPRAC 1-1265, RUNOR 1-1862, SECYC 1-12, CREFI 2-138, OPASI 2-729: Decreto 953/24. Actualización de textos ordenados. |
| A 8140 (02/12/2024) | Circular CONAU 1-1650: Decreto 953/24. Actualización de textos ordenados. |
| A 8145 (09/12/2024) | Circular RUNOR 1-1865: Decreto 953/24. Actualización de textos ordenados. |
| A 8172 (30/12/2024) | Circular SINAP 1-225: Sistema Nacional de Pagos - Débito inmediato. Actualización. |
| A 8173 (08/01/2025) | Circular RUNOR 1-1876: Régimen Disciplinario a cargo del Banco Central de la República Argentina (Leyes 21.526 y 25.065) y Tramitación de Sumarios Cambiarios (Ley 19.359). Adecuación. |
| A 8176 (14/01/2025) | Circular SINAP 1-226: TO Proveedores de servicios de pago. TO Sistema Nacional de Pagos – Transferencias. TO Sistema Nacional de Pagos – Servicios de pago. TO Sistema Nacional de Pagos – Cheques y otros instrumentos compensables. TO Plataformas para el financiamiento Mipyme. Actualizaciones. |
| A 8188 (28/01/2025) | Circular RUNOR 1-1882: Régimen Informativo de Transparencia - Capítulo I. |
| A 8209 (28/02/2025) | Circular RUNOR 1-1889: Régimen Informativo Contable Mensual. Base de Datos Padrón. Modificaciones |
| A 8212 (11/03/2025) | Circular CONAU 1-1668: Régimen Informativo Contable Mensual. Prorroga. |
| A 8248 (02/06/2025) | Circular RUNOR 1-1899: Régimen Disciplinario a cargo del Banco Central de la República Argentina (Leyes 21.526 y 25.065) y Tramitación de Sumarios Cambiarios (Ley 19.539). Adecuaciones. |
| A 8251 (04/06/2025) | Circular CONAU 1-1677: Régimen Informativo Contable Mensual. Prorroga. |
| A 8278 (11/07/2025) | Circular RUNOR 1-1908: Régimen Disciplinario a cargo del Banco Central de la República Argentina (Leyes 21.526 y 25.065) y Tramitación de Sumarios Cambiarios (Ley 19.539). Adecuaciones. |
| A 8284 (23/07/2025) | Circular CONAU 1-1685: Régimen Informativo Proveedores de Servicios de Pago que ofrecen cuentas de pago. |
| A 8285 (23/07/2025) | Circular RUNOR 1-1912: Régimen Informativo Proveedores de Servicios de Pago que Ofrecen Cuentas de Pago (R.I. P.S.P.) |
| A 8295 (07/08/2025) | Circular SINAP 1-233: Sistema Nacional de Pagos - Transferencias. Sistema Nacional de Pagos - Débito Directo. Actualización. |
| A 8298 (07/08/2025) | Circular SINAP 1-234: Sistemas de pago minoristas - Medidas para mitigar el fraude. |
| A 8321 (08/09/2025) | Circular SINAP 1-236: Sistema Nacional de Pagos - Débito Inmediato. Actualización. |
| A 8354 (13/11/2025) | Circular RUNOR 1-1929: Régimen Disciplinario a Cargo del Banco Central de la República Argentina (Leyes 21.526 y 25.065) y Tramitación de Sumarios Cambiarios (Ley 19.359). Adecuaciones. |
| A 8379 (23/12/2025) | Circular CONAU 1-1712, RUNOR 1-1935: Régimen Informativo de Transparencia - Modificaciones |
| A 8382 (23/12/2025) | Circular RUNOR 1-1938: Régimen Informativo Proveedores de Servicios de Pagos que Ofrecen Cuentas de Pagos (R.I. - P.S.P). Adecuaciones |
| A 8384 (09/01/2026) | Circular RUNOR 1-1940: Régimen Disciplinario a cargo del Banco Central de la República Argentina (Leyes 21.526 y 25.065) y Tramitación de Sumarios Cambiarios (Ley 19.539). Adecuación. |
| A 8402 (18/02/2026) | Circular CONAU 1-1717: Régimen Informativo Contable Mensual. Prórroga. |
| A 8415 (27/03/2026) | Circular RUNOR 1-1953: Régimen Disciplinario a Cargo del Banco Central de la República Argentina (Leyes 21.526 y 25.065) y Tramitación de Sumarios Cambiarios (Ley 19.539). Actualización. |
| A 8434 (08/05/2026) | Circular RUNOR 1-1960: R.I. Transferencias inmediatas intraentidades (R.I. -T.I.I.) |
| A 8438 (15/05/2026) | Circular SINAP 1-248: Sistema Nacional de Pagos - Cheques y otros instrumentos compensables. Actualización. |
| A 8458 (23/07/2026) | Circular SINAP 1-251: Sistema Nacional de Pagos - Cheques y Otros Instrumentos Compensables. Actualización. |
| A 8477 (08/09/2026) | Circular SINAP 1-255: Normas sobre Sistema Nacional de Pagos – Transferencias – Normas Complementarias. Actualización. |

### Frases típicas de las comunicaciones a los PSP

Aparecen en al menos el 15% de las dirigidas a los PSP y al menos 3 veces más que en el resto.

| Frase | En las de PSP | En el resto | ¿La detecta el filtro? |
| --- | --- | --- | --- |
| servicios pago | 35% | 2% | **no** |
| proveedores servicios | 32% | 1% | **no** |
| cuentas pago | 20% | 0% | **no** |
| sistema nacional | 20% | 2% | **no** |
| nacional pagos | 20% | 2% | **no** |
| central republica | 23% | 6% | **no** |
| pago ofrecen | 17% | 0% | **no** |
| ofrecen cuentas | 17% | 0% | **no** |
| cuyo vencimiento | 18% | 2% | **no** |
| republica argentina | 23% | 7% | **no** |
| funcion disposiciones | 21% | 6% | **no** |
| fin hacerles | 15% | 2% | **no** |
| uds fin | 15% | 2% | **no** |

## 2. Boletín Oficial del 2026-07-01 al 2026-09-30

- 63 ediciones, **4254 normas** leídas.
- Pasan el filtro: 29. Después de la IA se muestran **7 "Le afecta"** y **13 "Para revisar"**; 9 quedan plegadas. Resumen con IA: 29 de 29 normas.
- "Casi" (descartadas por el filtro, de un organismo que importa y que hablan de pagos): 606 (la IA vio las primeras 250). Resumen con IA: 250 de 250 normas.
- **Huecos del filtro** (la IA dice que aplicaban o podían aplicar): **0**.

### Lo que se mostró en esos meses

| Fecha | Norma | Resultado | Qué hacer (IA) |
| --- | --- | --- | --- |
| 03/07/2026 | Resolución General 5873/2026 — Agencia de Recaudación y Control Aduanero | Para revisar | No afecta la operatoria de la billetera ni sus regímenes de información. |
| 07/07/2026 | Resolución 308/2026 — Ministerio de Justicia | Para revisar | No modifica las obligaciones operativas, fiscales ni de cumplimiento de SYS como PSPCP. |
| 14/07/2026 | Resolución General 5875/2026 — Agencia de Recaudación y Control Aduanero | Le afecta | Ingresar al servicio Mis Facilidades en la web de ARCA y presentar el plan de pago hasta el 30 de octubre de 2026. |
| 17/07/2026 | Decreto 604/2026 — Poder Ejecutivo | Para revisar | La norma regula envíos postales y aduanas, sin modificar las obligaciones de la billetera virtual. |
| 28/07/2026 | Resolución General 5882/2026 — Agencia de Recaudación y Control Aduanero | Para revisar | No modifica las obligaciones de SYS como billetera virtual. |
| 29/07/2026 | Resolución General 5883/2026 — Agencia de Recaudación y Control Aduanero | Para revisar | La norma regula operadores postales y no la operatoria de la billetera virtual. |
| 29/07/2026 | Comunicación "A" 8454/2026 — Banco Central (BCRA) | Le afecta | Consultar las Comunicaciones A 8411 y 8432 en la web del Banco Central para conocer el detalle de los cambios normativos. |
| 29/07/2026 | Comunicación "A" 8457/2026 — Banco Central (BCRA) | Para revisar | La norma va dirigida a entidades financieras y cámaras, sin alcanzar a SYS. |
| 30/07/2026 | Resolución General 5884/2026 — Agencia de Recaudación y Control Aduanero | Para revisar | La norma regula envíos postales internacionales y no la operatoria de SYS. |
| 30/07/2026 | Comunicación "A" 8458/2026 — Banco Central (BCRA) | Le afecta | Consultar la web del BCRA para ver las modificaciones resaltadas en el texto ordenado de la Circular SINAP 1-251. |
| 10/08/2026 | Resolución 93/2026 — Unidad de Información Financiera | Para revisar | La norma regula exclusivamente a los Registros de la Propiedad Inmueble y no a SYS. |
| 10/08/2026 | Aviso Oficial — Agencia de Recaudación y Control Aduanero - Aduana Posadas | Para revisar | Es un aviso aduanero particular sin impacto en la operatoria de SYS. |
| 11/08/2026 | Comunicación "C" 102121/2026 — Banco Central (BCRA) | Le afecta | Actualizar los códigos de régimen y requerimiento en los reportes al Banco Central según la nueva hoja de la Sección 84. |
| 13/08/2026 | Comunicación "A" 8438/2026 — Banco Central (BCRA) | Le afecta | Consultar la Comunicación A 8299 y los boletines CIMPRA 537, 538, 542 y 545 en la web del BCRA. |
| 10/09/2026 | Comunicación "A" 8473/2026 — Banco Central (BCRA) | Le afecta | Implementar las medidas de mitigación de fraude de los acápites 5.1, 5.2 y 5.3 dentro de los 60 o 90 días corridos, según corresponda, contados desde que el administrador de pagos entregue la documentación técnica. |
| 15/09/2026 | Resolución General 1166/2026 — Comisión Nacional de Valores | Para revisar | La norma regula a los sujetos obligados ante la CNV y SYS es un PSP registrado ante el BCRA. |
| 16/09/2026 | Resolución General 5896/2026 — Agencia de Recaudación y Control Aduanero | Para revisar | No modifica las operaciones de la billetera virtual de SYS. |
| 18/09/2026 | Resolución 109/2026 — Unidad de Información Financiera | Para revisar | La norma regula el mercado de capitales y no afecta a las billeteras virtuales. |
| 18/09/2026 | Comunicación "A" 8477/2026 — Banco Central (BCRA) | Le afecta | Consultar la web del BCRA para leer los cambios resaltados en el texto ordenado de Sistema Nacional de Pagos. |
| 25/09/2026 | Resolución 483/2026 — Ministerio de Justicia | Para revisar | Es una medida interna del Estado para la investigación penal que no impone obligaciones operativas a SYS. |
