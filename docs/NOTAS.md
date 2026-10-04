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

## En producción desde el 3/10/2026
- **Link:** https://guidoparisi91.github.io/sys-normativa/
- **Repo (público):** https://github.com/Guidoparisi91/sys-normativa. Decisión de Guido: público, no hay nada secreto.
- **Corre solo** con GitHub Actions (`.github/workflows/monitor.yml`): días hábiles a las 8:00 y 19:00 (hora argentina). Se puede correr a mano desde la pestaña Actions → "Run workflow".
- Cada corrida guarda `datos/` en el repo (commit "Guardar informe del …") y publica la página. Si una fuente falla, el informe igual se publica y el workflow queda en rojo.
- **Aviso por mail:** cuando hay algo nuevo (o falla una fuente) se crea un issue que menciona a @Guidoparisi91; GitHub lo manda al mail de la cuenta. Hay que confirmar en GitHub → Settings → Notifications que ese mail sea guidoparisi91@gmail.com. Prueba enviada: issue #1.
- **Clave de Gemini:** secreto `GEMINI_API_KEY` del repo (y `.env` en la compu).
- **Historial:** arranca con los 4 días hábiles anteriores (29/9 al 2/10), armados con `npm run historial`: Boletín de ese día + comunicaciones del BCRA con esa fecha. Los 4 días sueltos de la validación se sacaron del historial (la validación sigue documentada en el análisis).
- Una comunicación del BCRA que ya salió un día no se repite cuando después aparece en el Boletín Oficial.
- Días sin Boletín (fines de semana, feriados) y sin novedades no generan informe vacío.

## Datos y límites
- No hay base de datos: cada día es un JSON en `datos/informes/` (~7 KB). Un año ≈ 2 MB. La página embebe todo: al año pesa ~2 MB, carga bien. Si en unos años pesa demasiado, mostrar solo los últimos meses en la página.
- Límites de GitHub (repo público, gratis): Actions sin límite de minutos; Pages hasta 1 GB por sitio; repo recomendado < 1 GB. Sobra.
- GitHub apaga los cron tras 60 días sin commits; el commit diario de `datos/` lo evita.
- Aviso de GitHub (3/10/2026): las acciones `checkout@v4`, `setup-node@v4`, `configure-pages@v5`, `deploy-pages@v4`, `upload-artifact@v4` usan Node 20, que está deprecado; hoy corren igual. Actualizar las versiones cuando salgan las nuevas.
- `ubuntu-latest` pasa a Ubuntu 26 desde el 19/10/2026; no debería afectar.

## Próximos pasos
1. **Darle más personalidad al diseño** de la página (pedido de Guido, después del link).
2. Mandarle a SYS las preguntas del análisis (provincias, tarjetas, remuneración de saldos, exterior, a quién avisar).
3. Regenerar la clave de Gemini (se pegó en el chat): actualizar `.env` y el secreto del repo.
4. Segunda etapa de fuentes: boletines provinciales (Ingresos Brutos), empezando por ARBA y AGIP según lo que diga SYS; después Congreso y prensa del BCRA.
5. Si los mails diarios resultan muchos: avisar solo cuando hay algo que "Le afecta".
6. Afinar "Para revisar".
