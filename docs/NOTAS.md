# Notas del proyecto

Contexto y decisiones de este proyecto. Se guarda acá, dentro de la carpeta, a propósito: **no se mezcla con ningún otro proyecto** (pedido explícito de Guido, 3/10/2026).

## Contexto
- Cliente: **SYS Global Pay**, billetera virtual para empresas, PSP registrado en el BCRA.
- Pedido original: scrapear el Boletín Oficial todos los días y avisar cuando salga algo del BCRA o similar que afecte a billeteras virtuales o a SYS.
- Arranque: 3/10/2026, de cero.

## Decisiones
- **Proyecto totalmente aparte.** Nada de código, datos, cuentas ni memoria compartidos con otros proyectos.
- **Sin presupuesto nuevo.** Si se usa IA, tiene que ser gratuita o casi gratuita. Por eso la detección es por reglas y la IA queda solo como un extra opcional para resumir.
- **Filtro generoso.** Perder una norma que afecta a SYS es peor que mostrar una de más, por eso hay dos niveles: "Le afecta" y "Para revisar".
- **Una fuente caída no puede verse como "no hubo nada".** El informe lista las fuentes que fallaron y el proceso sale con error.

## Estado al 3/10/2026 (noche)
- Prototipo andando en local: Boletín Oficial, comunicaciones del BCRA (A, B y C) y 9 textos ordenados.
- Validado contra 4 normas reales históricas: las 4 detectadas. 17 tests en verde.
- **Nuevo:** cada norma trae explicación sin IA (qué cambia, para qué, cómo le afecta a SYS, fechas clave, dónde nombra a SYS, normas relacionadas con link y de qué tratan) y un "qué hacer".
- **Nuevo:** informe visual en `salida/AAAA-MM-DD.html` (anda en celular y en modo oscuro) e historial en `salida/index.html`. Las "Para revisar" van plegadas.
- **Nuevo:** regla de feriados bancarios (llegan a "Para revisar").
- Todavía no corre solo, no manda mails y no tiene IA.

## Estado al 3/10/2026 (más tarde)
- **Una sola página** (`salida/index.html`) con pestañas: Último informe, Todas las normas (filtros por nivel y tema, buscador), Por día, Cómo funciona. Pedido de Guido: todo junto y clarísimo, nada de un HTML por día.
- Los informes se guardan como datos en `datos/informes/`. `npm run pagina` rearma la página sin revisar las fuentes.
- **IA activada:** Gemini, nivel gratuito (confirmado en AI Studio: "Nivel gratuito", sin facturación). Recuadro "En pocas palabras" en cada norma, marcado como IA. Prueba: 31 de 31 normas resumidas. Detalle de cupos en `docs/analisis-regulatorio.md`.
- La clave está en `.env` (no se sube). Guido la pegó en el chat: conviene regenerarla en AI Studio y reemplazarla en `.env`.
- La clave es de la cuenta personal de Google de Guido ("Default Gemini Project"). Si usa esa cuenta para otras cosas con la API, comparten cupo.
- **Decisión de Guido:** el repo puede ser **público**, no hay nada secreto.

## Propuesta de presentación y hosting (pendiente de que Guido decida)
- **Dónde corre:** GitHub Actions en repo **público**, 2 veces por día. Gratis y sin límite de minutos.
- **Link:** GitHub Pages publica `salida/index.html`. Gratis en repo público. Es el lugar donde entran todos los días.
- **Aviso por mail (opcional):** solo cuando hay algo que "Le afecta" o falló una fuente, con el link.
- **Clave de Gemini:** como secreto del repo.
- Hace falta que Guido cree la cuenta/repo de GitHub (o diga cuál usar). Nada se sube sin su OK.

## Próximos pasos (a definir con Guido)
1. Mandarle a SYS las preguntas del análisis (provincias, tarjetas, remuneración de saldos, exterior, a quién avisar).
2. OK de Guido a GitHub Actions + Pages (repo público) y armar el workflow.
3. Aviso por mail opcional, solo cuando hay algo.
4. Para mostrarle a SYS: demo con el historial de los 5 días de `salida/` (los 4 casos reales + el 2/10, con la A 8488 que no salió en el Boletín).
5. Regenerar la clave de Gemini (se pegó en el chat).
6. Segunda etapa: boletines provinciales (Ingresos Brutos), Congreso, prensa del BCRA.
7. Afinar "Para revisar": hoy trae unas 3 o 4 normas por día que suelen no aplicar.
