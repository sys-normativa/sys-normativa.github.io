# SYS-Normativa

Monitor diario de normas que pueden afectar a **SYS Global Pay**, una billetera virtual para empresas registrada en el BCRA como proveedor de servicios de pago (PSP). Revisa el Boletín Oficial, las comunicaciones del BCRA y los textos ordenados del BCRA, y deja un informe por día.

## Regla número uno: proyecto aislado

Este proyecto **no tiene nada que ver con ningún otro proyecto de Guido**. No se comparte código, datos, cuentas, credenciales ni memoria con nada externo a esta carpeta. Tampoco se menciona ni se usa como referencia otro proyecto.

Todo lo que haya que recordar entre sesiones va en `docs/NOTAS.md`, dentro de esta carpeta, y en ningún otro lado.

## Antes de arrancar, leer

1. `docs/NOTAS.md`: contexto, decisiones tomadas, estado actual y próximos pasos.
2. `docs/analisis-regulatorio.md`: qué normas le importan a SYS, por qué, qué cubre el monitor y qué falta. Incluye las preguntas pendientes para SYS.

Al terminar una tarea, actualizar el "Estado" y los "Próximos pasos" de `docs/NOTAS.md`.

## Comandos

```bash
npm install
npm run revisar                          # corrida de hoy -> datos/informes/AAAA-MM-DD.json + salida/index.html
npm run revisar -- --fecha 2026-10-02    # Boletín Oficial de otro día (para probar)
npm run revisar -- --bcra-desde A=8480   # releer el BCRA desde un número
npm run pagina                           # rearmar la página sin revisar las fuentes
npm test                                 # tests de las reglas
npm run typecheck
```

## Cómo está armado

- `src/revisar.ts`: corrida completa. Cada fuente va en su propio try: una que falla queda listada en el informe y el proceso sale con error. **Nunca puede decir "hoy no hubo nada" porque una fuente se cayó.**
- `src/fuentes/boletinOficial.ts`: primera sección del día, HTML en `/seccion/primera/AAAAMMDD`. La lista viene completa, sin paginar.
- `src/fuentes/bcraComunicaciones.ts`: PDF en `/archivos/Pdfs/comytexord/{A|B|C}{n}.pdf`. Detecta las nuevas preguntando por el número siguiente. Tolera 5 huecos seguidos. `PISO` es el número desde donde busca en la primera corrida.
- `src/fuentes/bcraTextosOrdenados.ts`: lee solo la carátula ("Última comunicación incorporada"). Si cambia, avisa. Es la red de seguridad.
- `src/reglas.ts`: filtro de relevancia por palabras con peso más el organismo emisor. Para "Le afecta" hace falta un término propio de SYS: muchos términos débiles juntos no alcanzan. Las comunicaciones del BCRA dirigidas a "proveedores de servicios de pago" van directo a "Le afecta"; las demás del BCRA llegan como mucho a "Para revisar".
- `src/estado.ts` → `datos/estado.json`: última comunicación leída por tipo y versión de cada texto ordenado. No hay base de datos.
- `src/explicar.ts`: arma la explicación de cada norma con recortes de su texto (qué cambia, para qué, fechas, normas citadas, dónde nombra a SYS).
- `src/temas.ts`: los frentes de SYS y el texto de "cómo le afecta" de cada uno. Sale de `docs/analisis-regulatorio.md`.
- `src/ia.ts`: resumen opcional con Gemini (nivel gratuito). Solo resume lo que ya pasó el filtro; si falla, el informe sale igual. Clave en `.env` (`GEMINI_API_KEY`), nunca en el código.
- `src/informe.ts`: el informe del día como datos (`datos/informes/AAAA-MM-DD.json`) y en Markdown para la consola.
- `src/sitio.ts` + `src/sitio/`: la página única `salida/index.html` (pestañas: último informe, todas las normas, por día, cómo funciona), con todos los informes embebidos. Abre con doble clic y se publica tal cual.

**Todo lo que ve el usuario tiene que ser clarísimo**: una sola página, lenguaje simple, sin jerga.

**Si se agrega o cambia una regla en `reglas.ts`**, actualizar `docs/analisis-regulatorio.md` y sumar un caso en `src/reglas.test.ts`, de ser posible con una norma real.

## Decisiones vigentes

- **Sin presupuesto.** Toda herramienta, hosting o IA tiene que ser gratuita o casi gratuita. Si algo tiene costo, cuota o límite, avisarlo siempre antes de sumarlo.
- **La detección es por reglas, sin IA.** La IA es opcional y solo para resumir lo que ya pasó el filtro. Si se usa un nivel gratuito, nunca mandarle datos internos de SYS: solo normas públicas.
- **El filtro es generoso.** Perder una norma relevante es peor que mostrar una de más.
- **Las fuentes son públicas.** Pedidos con pausa y reintentos, sin castigar los sitios del Estado.

## Cómo trabajar con Guido

- Hablar simple y en criollo: primero qué pasa, qué hago y qué tiene que hacer él. La jerga técnica después, y solo si aporta.
- Dar **una** recomendación fundamentada, no un menú de opciones.
- Las decisiones de fondo (dónde corre, qué servicio usar, cambios de alcance) se le consultan antes de codear. El resto se avanza.
- "¿Se puede X?" es una pregunta: se contesta, no se ejecuta.
- No subir nada a internet, no crear cuentas y no contactar a SYS sin que él lo pida.
- Si se usa git: commits en español, en imperativo, sin el trailer `Co-Authored-By`.
- Horarios: siempre en hora de Argentina (UTC−3).
