# SYS-Normativa

Monitor diario de normas que pueden afectar a **SYS Global Pay** (billetera virtual para empresas).
Proyecto independiente: no comparte código, datos ni cuentas con ningún otro proyecto.

**En producción:** https://sys-normativa.github.io (corre solo con GitHub Actions: lunes a viernes a las 10 y a las 22, sábados a las 12, hora argentina; avisa por mail con un issue del repo).

Lee:
- el **Boletín Oficial** (primera sección completa),
- las **comunicaciones "A", "B" y "C" del BCRA** (la mayoría no sale en el Boletín),
- la carátula de los **textos ordenados del BCRA** que regulan a los PSP (si cambian, avisa),
- la **normativa impositiva de Rentas Córdoba** (el Boletín de Córdoba bloquea conexiones de fuera del país),
- las **noticias de prensa del BCRA**.

Decide en dos pasos: un filtro de palabras clave y la IA (Gemini, nivel gratuito), que dice si aplica, qué cambia y qué hacer. Arma **una sola página**, `salida/index.html`, con pestañas: último informe, historial por día y cómo funciona.

## Uso

```bash
npm install
npm run revisar                          # hoy
npm run revisar -- --fecha 2026-10-02    # Boletín Oficial de otro día
npm run revisar -- --bcra-desde A=8480   # releer el BCRA desde un número
npm run pagina                           # rearmar la página sin revisar las fuentes
npm run validar                          # casos reales, BCRA y ruido -> docs/validacion.md (~25 min)
npm run estudio-rapido                   # ruido en 3 meses de Boletín -> docs/estudio-palabras.md (~15 min)
npm test
```

La primera corrida solo fija desde qué comunicación del BCRA arranca, sin informar el histórico.
Lo que recuerda entre corridas está en `datos/estado.json`, y cada informe en `datos/informes/AAAA-MM-DD.json`.

Para el resumen con IA: crear `.env` con `GEMINI_API_KEY=...` (clave gratuita de Google AI Studio). Sin clave, todo funciona igual, sin ese resumen.

## Documentos

- [`docs/analisis-regulatorio.md`](docs/analisis-regulatorio.md): qué normas le importan a SYS y por qué, qué cubre el monitor y qué falta.
- [`docs/NOTAS.md`](docs/NOTAS.md): contexto del proyecto, decisiones tomadas y próximos pasos.
