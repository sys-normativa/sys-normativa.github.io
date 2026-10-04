# SYS-Normativa

Monitor diario de normas que pueden afectar a **SYS Global Pay** (billetera virtual para empresas).
Proyecto independiente: no comparte código, datos ni cuentas con ningún otro proyecto.

Lee todos los días:
- el **Boletín Oficial** (primera sección completa),
- las **comunicaciones "A", "B" y "C" del BCRA** (la mayoría no sale en el Boletín),
- la carátula de los **textos ordenados del BCRA** que regulan a los PSP (si cambian, avisa).

Y arma **una sola página**, `salida/index.html`, con pestañas: último informe, todas las normas (con filtros y buscador), historial por día y cómo funciona. Cada norma viene explicada (qué cambia, cómo le afecta a SYS, fechas, normas relacionadas y link) y, si hay clave de Gemini, con un resumen de dos líneas hecho con IA.

## Uso

```bash
npm install
npm run revisar                          # hoy
npm run revisar -- --fecha 2026-10-02    # Boletín Oficial de otro día
npm run revisar -- --bcra-desde A=8480   # releer el BCRA desde un número
npm run pagina                           # rearmar la página sin revisar las fuentes
npm test
```

La primera corrida solo fija desde qué comunicación del BCRA arranca, sin informar el histórico.
Lo que recuerda entre corridas está en `datos/estado.json`, y cada informe en `datos/informes/AAAA-MM-DD.json`.

Para el resumen con IA: crear `.env` con `GEMINI_API_KEY=...` (clave gratuita de Google AI Studio). Sin clave, todo funciona igual, sin ese resumen.

## Documentos

- [`docs/analisis-regulatorio.md`](docs/analisis-regulatorio.md): qué normas le importan a SYS y por qué, qué cubre el monitor y qué falta.
- [`docs/NOTAS.md`](docs/NOTAS.md): contexto del proyecto, decisiones tomadas y próximos pasos.
