# CLAUDE.md

Guía para Claude Code en el repositorio de **Atlas**. Leé este archivo completo
antes de escribir código.

Atlas es el side project 1 del portfolio de Pablo (`pablodagdev`). Hereda de ese
repo el rol, la arquitectura y las convenciones; lo que cambia está marcado.

> Cuando `next dev` genere `AGENTS.md`, hacele caso: avisa que esta versión de
> Next difiere de lo que un modelo tiene en su training data y manda leer
> `node_modules/next/dist/docs/` antes de escribir código. Ya evitó errores de
> andamiaje en el portfolio.

## Rol

Actuás como **Full-Stack Engineer senior especializado en arquitectura**. Tus
prioridades, en orden:

1. **Separación de responsabilidades clara**: cada archivo tiene un solo motivo para cambiar.
2. **Modularidad**: el código se organiza por feature/dominio, no por tipo de archivo.
3. **Simplicidad**: la solución más simple que respete 1 y 2. Nada de abstracciones "por si acaso".
4. **Calidad verificable**: tipado estricto, tests en la lógica, métricas de performance y accesibilidad.

## Qué es Atlas

Un **catálogo público de tokens** con buscador, filtros, página por token y
comparador. Su trabajo es que encuentres un token, entiendas de qué se trata y
salgas hacia el lugar correcto para comprarlo.

**No es** un gestor de carteras, no calcula resultados, no da consejo financiero
y no tiene cuentas de usuario. Cada una de esas cosas agrega una base de datos y
un flujo de sesión que no aportan nada a lo que el proyecto tiene que demostrar.

**Lo que tiene que demostrar, en una frase:** que el HTML de una página de token
llega con los datos adentro, medido, y con un presupuesto que rompe el build
cuando se pasa.

Eso es lo que lo separa de STM, el trabajo profesional que resuelve el mismo
problema renderizando en el navegador porque tenía cuatro semanas. El case study
de STM en el portfolio ya nombra esa diferencia, así que **Atlas existe para
cerrar esa comparación**. Cualquier decisión que debilite la tesis —datos que
llegan por fetch, JavaScript que no hacía falta— está peleando contra el motivo
del proyecto.

Ante una ambigüedad de producto, **preguntá** antes de asumir. Para datos
faltantes usá `TODO(pablo):`, y **nunca inventes números**, ni de mercado ni de
performance.

## Arquitectura: monolito modular

**Un solo repositorio, un solo deploy, sin microservicios.** No propongas
microservicios, colas, servicios separados ni monorepos multi-paquete salvo que
Pablo lo pida explícitamente. La escalabilidad se resuelve con buenos límites
entre módulos, no con red entre servicios.

### La diferencia con el portfolio: ISR, no `output: 'export'`

El portfolio es un export estático. **Atlas no.** Un catálogo de precios necesita
datos frescos sin rebuild manual, así que se despliega en Vercel con **ISR**: las
páginas se prerenderizan y se revalidan solas. El navegador sigue recibiendo el
HTML con los datos adentro —la tesis se mantiene— pero con fecha de vencimiento.

Esto va en **`docs/adr/0001-isr-over-static-export.md`**, porque es la decisión
que alguien va a cuestionar en una entrevista.

Consecuencias, para que nadie las descubra tarde:

- Hay route handlers de verdad, que el endpoint de salida de la fase 2 necesita.
- El plan Hobby de Vercel corre **un cron por día**. Cualquier trabajo programado
  con más frecuencia va a **GitHub Actions**, no a Vercel.
- Con ISR, el primer visitante después de que expira la caché puede recibir la
  página vieja mientras se regenera. Es el comportamiento correcto y va contado
  en el case study, no escondido.

### Stack

| Pieza         | Elección                                                                               | Por qué                                                                               |
| ------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Framework     | **Next.js 16**, App Router                                                             | La misma major que el portfolio: una sola versión de App Router en la cabeza de Pablo |
| Runtime       | **Node 24.21.0**                                                                       | Ver "Entorno local"                                                                   |
| Lenguaje      | **TypeScript** en modo `strict`                                                        |                                                                                       |
| UI            | **React 19**, Server Components por defecto                                            | `"use client"` solo donde haya interacción real                                       |
| Estilos       | **Tailwind 4** vía `@tailwindcss/postcss` + tokens semánticos en CSS custom properties |                                                                                       |
| Validación    | **Zod**                                                                                | La respuesta de la API y el env, validados                                            |
| Datos         | **CoinGecko**, plan gratuito con API key                                               | Fuente documentada, estable y gratis                                                  |
| Tests         | **Vitest** (unit), **Playwright** (smoke), **Lighthouse CI** (presupuesto)             |                                                                                       |
| Deploy        | **Vercel** Hobby                                                                       |                                                                                       |
| Base de datos | **Ninguna en la fase 1**                                                               | Ver "Alcance por fases"                                                               |

Antes de usar una API de Next, verificá la versión instalada en `package.json` y
seguí la documentación de esa versión: el App Router cambió bastante entre majors.

**Dependencias nuevas:** justificá por qué no alcanza con lo existente. En
particular, tres que no van a entrar sin una razón muy buena:

- **Librerías de gráficos en el listado.** Un sparkline es un `<path>` de SVG
  calculado en el servidor: con 250 filas, una librería son 250 instancias
  montadas en el cliente. Esa regla **no cambió y no está en discusión**.
  Para el gráfico de precios de la **ficha** sí entra una: **shadcn/ui sobre
  Recharts**, decidido el 2026-09-29 en `docs/adr/0003`, que supersede la mitad
  del 0002. Costó **+63 % de JavaScript** en esa ruta, medido, y el presupuesto
  se puso rojo antes de que entrara — que es para lo que está.
- **Clientes HTTP.** `fetch` ya viene, y es el que integra la caché de Next.
- **Librerías de estado.** Si aparece estado global, el diseño está mal.

### Estructura

Lo que hay hoy, no solo adónde van las cosas:

```
src/
├─ app/                        # SOLO routing y composición. Finas: obtienen datos vía módulos.
│  ├─ layout.tsx               # html, body, tokens globales, header
│  ├─ page.tsx                 # el catálogo. Prerenderizada: NO lee searchParams
│  ├─ search/page.tsx          # las vistas refinadas. Por request, noindex
│  ├─ category/[slug]/page.tsx # los presets (RWA, exchange tokens). Prerenderizadas
│  ├─ token/[id]/page.tsx      # la ficha de un token. SSG + dynamicParams
│  ├─ icon.svg                 # favicon por convención de archivo
│  └─ not-found.tsx
├─ modules/
│  ├─ catalog/                 # El dominio central: qué es un token y cómo se lista
│  │  ├─ domain/               # token · listing · format · presets · price-history · highlights
│  │  ├─ data/                 # token-repository · price-history-repository · schemas Zod
│  │  ├─ ui/                   # CatalogView · TokenTable · TokenDetail · Highlights · PriceChartPanel
│  │  └─ index.ts
│  ├─ markets/                 # Dónde comprarlo: venues, tickers y links de salida
│  ├─ currency/                # Conversión a fiat, para información
│  └─ seo/                     # TODO: canonical, sitemap, JSON-LD, Open Graph
└─ shared/
   ├─ ui/                      # Logo · SiteHeader · SiteNav · Skeleton · chart (shadcn) · cn
   └─ config/                  # env.ts (Zod, server-only) · env-schema.ts (puro) · site.ts
```

**`env` está partido en dos a propósito:** `env-schema.ts` es puro y testeable,
`env.ts` lleva `import "server-only"` y es la única línea que lee `process.env`.
Sin ese guard, un componente cliente que alcance la config arrastra Zod entero al
navegador — medido: 392 KB.

**Este árbol es adónde van las cosas, no lo que hay el día uno.** Una carpeta se
crea cuando tiene contenido: si `markets` empieza siendo tres funciones, que sean
tres funciones con su `index.ts`, no cuatro capas vacías. Si un módulo es chico
puede no tener todas las capas, pero **no mezcles capas en un mismo archivo**.

### Reglas de dependencia

La dirección es única y no se rompe:

```
app → modules (vía index.ts) → shared
         ui → domain
       data → domain
```

- `app/` importa de los módulos **solo por su `index.ts`**. Nada de `@modules/x/data/...` desde afuera del módulo.
- Un módulo usa a otro solo por su `index.ts`. Si dos se necesitan mutuamente, el límite está mal: extraé lo común a `shared/`.
- `domain/` es TypeScript puro: sin Next, React, DOM ni I/O. Es la capa que se testea con más detalle.
- `data/` es la única capa con I/O. Devuelve tipos de `domain/`, nunca el JSON crudo de CoinGecko.
- `ui/` no busca datos ni sabe de dónde vienen: recibe props tipadas.
- `shared/` nunca importa de `modules/`.
- Aliases obligatorios: `@modules/*`, `@shared/*`, `@app/*`. Sin rutas relativas que suban más de un nivel.
- Hacelo cumplir con `eslint-plugin-boundaries` **desde el primer commit**, no
  después. Si una regla molesta, se corrige el diseño, no la regla.

## El contrato con CoinGecko

`data/` es la frontera con el mundo, y el mundo miente. Tres reglas:

1. **La respuesta se valida con Zod antes de entrar al dominio.** Un campo que
   cambia de nombre tiene que fallar en un solo archivo, no dejar `undefined`
   viajando hasta un componente.
2. **El tipo de dominio no es la forma de la API.** CoinGecko devuelve docenas de
   campos por token; el dominio define los que Atlas usa y `data/` mapea. Cambiar
   de proveedor tiene que ser tocar una carpeta.
3. **Los límites del plan gratuito son un dato de diseño, no una sorpresa.**
   Verificado en la doc el 2026-09-28, plan **Demo** (el gratuito, con key):

   | Dato | Valor | Fuente |
   |---|---|---|
   | Rate limit | **100 llamadas/min** | doc de errores y rate limit |
   | Cupo mensual | **10.000 créditos/mes** | página de precios |
   | Frescura del dato | **60 s** (30 s en pago) | referencia de `/coins/markets` |
   | Base URL | `https://api.coingecko.com/api/v3` | auth del Demo API |
   | Auth | header `x-cg-demo-api-key` | idem; el query param expone la key |
   | `per_page` de `/coins/markets` | **máx. 250**, default 100 | referencia del endpoint |

   **El que manda es el cupo mensual, no el rate limit.** 10.000/mes son ~333 por
   día, ~13,9 por hora. Con 100/min se queman en 100 minutos, así que el límite
   por minuto nunca se va a tocar y no hay que diseñar para él.

   De ahí salen tres consecuencias que no se negocian:

   - **Una sola llamada alimenta el catálogo y las 250 fichas.**
     `/coins/markets?per_page=250` ya devuelve precio, capitalización, ranking,
     suministro circulante/total/máximo, máximo y mínimo de 24 h, ATH/ATL y
     sparkline de 7 días. Una llamada por token serían 250 × 24 × 30 = 180.000
     al mes: 18 veces el cupo. Las fichas se sirven del mismo payload.
   - **`per_page` no cambia el costo.** Una llamada gasta un crédito, devuelva 10
     monedas o 250. Bajar la cantidad de tokens no ahorra créditos del listado:
     ahorra las llamadas de **detalle**, que son una por token, más tiempo de
     build y peso de payload. No confundir las dos cosas.
   - **El que gasta es el intervalo.** 600 s son 4.320/mes (43 % del cupo). Se
     evaluó 300 s y se descartó: 8.640 es el 86 %, y con el detalle por token
     queda ~97 %, o sea ~1 build de aire al mes. Los dos números son **techos, no
     pronósticos**: ISR revalida *cuando entra un request*, así que una página sin
     tráfico no gasta nada.

   **Presupuesto vigente** (decidido por Pablo el 2026-09-28), en
   `shared/config/env.ts`, validado con Zod y con techo de 250 y piso de 60 s:

   | | `ATLAS_TOKEN_COUNT` | `ATLAS_LISTING_REVALIDATE_SECONDS` |
   |---|---|---|
   | Default (dev y CI) | 10 | 600 |
   | Producción, seteado en Vercel | 250 | 600 (el default: no hace falta setearlo) |

   El intervalo es el mismo en todos los entornos, así que **pasar a producción es
   una sola variable**. Los defaults son los de desarrollo a propósito: así un
   build de CI no gasta 250 llamadas de detalle por accidente.

   Con esto el comprometido es ~54 % (~5.400/mes) y quedan ~4.600 libres, unos 18
   builds que prerendericen fichas. **El techo lo pone CI, no la revalidación.**
   Si aprieta, el orden es: primero cuántas fichas se prerenderizan
   —`dynamicParams` deja que el resto se genere on demand—, después se alarga el
   detalle por token, y la frescura del listado al final, porque es la que se ve.

   Los errores también cuentan para el límite. Por eso `fetchTokens` reintenta
   **una sola vez** y solo ante 429 o 5xx: dos créditos de 10.000 valen evitar
   que un hipo de CoinGecko bloquee un deploy, y un loop no.

   **Venues ("dónde comprarlo"), resuelto el 2026-09-29.** `/coins/{id}/tickers`,
   una llamada por token, revalidando cada **7 días**: a 250 tokens son
   ~1.071/mes (11 % del cupo). Diario serían 7.500 y no entran al lado del
   listado.

   Y de ahí sale una tercera perilla, `ATLAS_PRERENDERED_TOKEN_COUNT`, porque
   **cada ficha prerenderizada gasta dos créditos en el build**. Medido: un build
   con 10 fichas hace **24 llamadas**: 4 fijas (listado, dos categorías, tasas) y
   **2 por ficha** (tickers e historial). Bajarla
   abarata el build sin romper nada —`dynamicParams` genera el resto al primer
   request—; en 0, un build cuesta un crédito.

   | | Default (dev y CI) | Producción |
   |---|---|---|
   | `ATLAS_TOKEN_COUNT` | 10 | 250 |
   | `ATLAS_PRERENDERED_TOKEN_COUNT` | 10 | a elegir según cuántos builds al mes |
   | `ATLAS_LISTING_REVALIDATE_SECONDS` | 600 | 600 |

   **Las cinco llamadas que hace Atlas**, con su intervalo y su porqué:

   | Endpoint | Revalidate | Alcance | Costo a 250 tokens |
   |---|---|---|---|
   | `/coins/markets` | 600 s | el catálogo entero | 4.320/mes (43 %) |
   | `/coins/markets?category=…` | 3.600 s | un preset, por categoría | 720/mes cada uno |
   | `/coins/markets?ids=…` | 24 h | un token que el listado no trae | 1 por token de cola larga |
   | `/coins/{id}/tickers` | 7 días | **por token** | ~1.071/mes (11 %) |
   | `/coins/{id}/market_chart?days=30` | 24 h | **por token** | según tráfico, ver abajo |
   | `/exchange_rates` | 6 h | **todas las monedas y todos los tokens** | 120/mes (1 %) |

   Dos cosas que no son obvias y conviene no volver a deducir:

   - **`market_chart?days=30` cubre los tres rangos.** Devuelve 720 puntos
     horarios, así que 24 h, 7 d y 30 d son recortes del mismo payload: cambiar
     de rango no gasta un crédito. El recorte se hace **en el servidor**
     (`toRangedHistory`), porque mandarle al cliente los 720 puntos crudos costó
     8.000 bytes de HTML y mandarle los tres rangos ya listos costó cero.
   - **El gráfico escala con visitantes, no con el tiempo.** El techo es
     (tokens visitados en la ventana) × (ventanas al mes). A 24 h son 30
     ventanas: veinte tokens populares son ~600/mes (6 %), y una hora de
     revalidate serían 14.400 y no entrarían.

   **El build de hoy cuesta 24 créditos** con los defaults: 1 del listado + 10 de
   tickers + 10 de historial + 2 de categorías + 1 de tasas.

   **El plan Demo no manda `trust_score`.** Verificado el 2026-09-29: los 100
   tickers de bitcoin vienen con `trust_score: null`. Descartar los venues sin
   rating —que era la regla intuitiva— deja la sección vacía. La regla correcta
   es que un `"red"` explícito es un rechazo y la ausencia no.

   `TODO(pablo):` sin `trust_score`, los venues quedan ordenados por **volumen
   autoinformado**, que es justamente lo que el rating existe para corregir. Si
   el orden termina mostrando exchanges dudosos arriba, la salida es una lista
   curada de venues conocidos, y es una decisión de producto, no técnica.

La API key va en el env, validada con Zod en `shared/config/env.ts`. Nunca
`process.env` suelto en el resto del código.

### Caché, que es la mitad del proyecto

Tres capas, de adentro hacia afuera:

- **Upstream:** cada `fetch` a CoinGecko con su propia `revalidate`. El precio y el nombre de un token no vencen al mismo tiempo.
- **Página:** `revalidate` por ruta. El listado más seguido que una ficha.
- **Borde:** cabeceras con `stale-while-revalidate`, para que nadie espere una regeneración.

Que las tres estén bien puestas es lo que el case study va a contar, así que
**cada valor elegido lleva un comentario con el porqué**.

## Alcance por fases

Trabajá solo en la fase actual. No adelantes la siguiente.

### Fase 1 — el catálogo con los datos adentro del HTML

- [x] Listado con búsqueda, filtros y orden. Andan **sin JavaScript**: son
      parámetros en la URL y el servidor devuelve la página ya ordenada. Un
      catálogo que necesita JS para ordenarse contradice la tesis.
- [x] Página por token: precio, capitalización, suministro, rangos.
- [x] **Dónde comprarlo**, con enlaces a los venues oficiales.
- [x] Presupuesto de performance en CI **desde el primer commit**. Bytes de JS y
      de HTML, en `tests/performance-budget.test.ts`. LCP y CLS siguen faltando.
- [x] Un test que abra el HTML construido de una página de token y **busque el
      precio adentro**: `tests/prerendered-html.test.ts`.

      **Ojo con cómo se lee esa promesa.** Un `"use client"` de más **no** saca
      los datos del HTML: un componente cliente igual se renderiza en el
      servidor. Lo que el test atrapa es que la ruta deje de prerenderizarse, o
      que los datos pasen a buscarse desde el navegador. Verificado poniéndolo
      rojo a propósito.
- [x] README: cómo correr, de dónde salen los datos, cómo se mide el presupuesto.
- [x] ADR 0001: ISR en vez de `output: 'export'`.
- [ ] **SEO:** canonical, sitemap con todos los tokens, JSON-LD y Open Graph. El
      módulo `seo/` no existe todavía; la ficha tiene canonical propio y nada más.
- [ ] **Smoke e2e con Playwright** y **Lighthouse CI** con umbrales medidos en el
      primer deploy. Los dos esperan a que Atlas esté en Vercel.

#### Orden de trabajo, porque cada paso hace barato al siguiente

1. **Andamiaje con las reglas puestas. Hecho.**
2. **`catalog/domain` completo y testeado sin red. Hecho.**
3. **`catalog/data` contra CoinGecko de verdad. Hecho.** Falta el primer deploy a
   Vercel, que es lo que bloquea todo lo de abajo.
4. **El test del precio en el HTML. Hecho**, junto con el presupuesto de bytes.
   Lighthouse queda para cuando haya un deploy que medir.

**Lo que bloquea hoy: el deploy.** Sin él no hay umbrales de LCP que fijar, ni
smoke e2e contra una URL real, ni las dos mediciones —antes y después— que el
case study necesita. Lo demás de la fase 1 ya está en verde.

### Fase 2

Comparador lado a lado; endpoint propio de redirección para contar clics sin
meter un tracker de terceros —**acá aparece la primera base de datos**, Neon en
plan gratuito, no antes—; ingesta por lotes priorizando los tokens más vistos,
que depende de lo anterior.

### Fuera de alcance, a propósito

Carteras, alertas de precio, login, datos que CoinGecko no dé gratis.

El gráfico de precios interactivo de la ficha **sí está adentro** desde el
2026-09-29 (`docs/adr/0003`), con una condición: es aditivo. Los números se
renderizan en el servidor y el gráfico se monta al lado. Si el presupuesto de
performance no lo banca, se cae el gráfico, no los números.

También entró un **convertidor a fiat** (9 monedas) en la ficha, con la misma
condición: es información, no una cotización, y lo dice en pantalla.

## El presupuesto de performance

Es la feature, no la verificación, y **ya corre en cada commit**:
`tests/performance-budget.test.ts` mide la salida del build y rompe cuando se
pasa. Por eso `npm run build` va **antes** de `npm test`, en CI y en local.

| Métrica | Presupuesto | Medido |
|---|---|---|
| JavaScript de una ficha | 290.000 gz | ~281.000 |
| HTML de una ficha | 10.000 gz | ~8.600 |

Los bytes son deterministas, así que no necesitan navegador. **LCP y CLS sí**, y
por eso siguen siendo `TODO(pablo):` con Lighthouse contra el primer deploy: sus
umbrales tienen que salir de esa medición.

**Cómo se mueve un presupuesto.** Solo cuando el test se pone rojo primero y la
decisión queda escrita con las dos mediciones. Ya pasó tres veces en un día:

- HTML 12.000 → 16.000 por las lecturas del tooltip, y **de vuelta a 11.000**
  cuando el recorte volvió al servidor. Un presupuesto que solo sube no es un
  presupuesto.
- JS 186.000 → 300.000 al migrar a Recharts (177.054 → 288.986, +63 %), en
  `docs/adr/0003`.

Antes de subir uno, se recorta lo que no se ve: precisión de coordenadas, puntos
superpuestos, datos que cruzan al cliente sin necesidad. Eso solo ya ahorró 47 %
en el HTML de la ficha.

El número que va al case study no es "se siente rápido": es el **peso del HTML de
una página de token y el LCP en red lenta, antes y después**. Guardá las dos
mediciones desde el principio; la de "antes" no se recupera más tarde.

## Convenciones de código

- Código, nombres, comentarios y commits en **inglés**.
- Nombres de archivos en `kebab-case`; componentes en `PascalCase.tsx`. Los archivos especiales de Next llevan el nombre que el framework exige.
- Funciones chicas y con nombre que explique el qué. Comentarios solo para el porqué.
- Sin `any`. Sin `// @ts-ignore` salvo con comentario que explique por qué y un `TODO`.
- **Server Components por defecto.** `"use client"` solo donde haya estado, eventos o APIs del navegador, y lo más abajo posible: la directiva es contagiosa hacia abajo.
- Cuando un componente cliente envuelve contenido estático, pasalo como `children` en vez de importarlo adentro: así ese contenido sigue renderizándose en el servidor.
- **Hay cuatro `"use client"` en el proyecto, y cada uno se justificó.** Si agregás
  uno, sumalo a esta lista con su motivo; si la lista crece sin motivos, el diseño
  se está yendo al cliente:

  | Archivo | Por qué |
  |---|---|
  | `shared/ui/SiteNav.tsx` | Un layout no recibe el pathname en el servidor, y `headers()` sacaría toda ruta del prerender solo para pintar un link |
  | `shared/ui/chart.tsx` | Primitivos de shadcn sobre Recharts |
  | `catalog/ui/PriceChartPanel.tsx` | El rango del gráfico es estado, y Recharts dibuja en el cliente |
  | `currency/ui/CurrencyConverter.tsx` | Es una calculadora: dos inputs y un número que los sigue |

  **Lo que ninguno hace es traer datos.** Las tasas y las series llegan con la
  página, ya recortadas en el servidor; cambiar de moneda o de rango es
  aritmética, no un fetch.
- **Nada de widgets nativos donde haya que estilar.** Sin `<select>` ni
  `type="number"`: el primero abre un popover que dibuja el navegador y el
  segundo trae los spinners de Chrome, y ninguno de los dos se puede estilar. Con
  pocas opciones fijas, pills; para montos, `type="text"` con
  `inputMode="decimal"`, que conserva el teclado numérico del teléfono.
- **El elemento activo no se puede clickear.** La página en la que estás se
  renderiza como `<span aria-current="page">`, no como link; el rango o la moneda
  ya elegidos van `disabled`. Saca el click, el stop de tabulación y la
  navegación inútil de una sola vez.
- Sin estado global salvo necesidad demostrada.
- **Estética: clara y densa, tabular, cerca de un terminal financiero sobrio.** Paleta propia, que después se replica como el tema `atlas` del portfolio; ese tema se crea cuando llegue el case study, no antes.
- **Tokens semánticos, no valores a mano.** Nada de colores, fuentes, radios ni espaciados hardcodeados en componentes.
- **`font-variant-numeric: tabular-nums` en toda columna de números**, o las cifras bailan al actualizarse.
- **Si formateás números o fechas, el tag de locale lleva región.** `es` a secas formatea 1200 como `1200 US$`; `es-AR` da `US$ 1.200`. El formateo vive en `catalog/domain` y se testea ahí.

## Calidad

- **Tests unitarios obligatorios** para `domain/` de cada módulo: filtros, orden, formato y el mapeo de la respuesta de la API.
- **Smoke e2e** (Playwright): listado, una ficha de token, un link de salida.
- **Accesibilidad:** HTML semántico —una tabla que sea una tabla—, foco visible, contraste AA, `alt` en imágenes, navegación por teclado.
- **Responsive desde 360 px.** En una tabla de siete columnas ese es el problema difícil: decidí temprano qué columnas se caen y cuáles no.
- **SEO:** canonical, sitemap con todos los tokens, JSON-LD y Open Graph por página. Un catálogo cuyo trabajo es que lo encuentren no puede tener esto pendiente.
- Antes de dar una tarea por terminada, corré `npm run check && npm run lint && npm test` y confirmá que pasan.

## Entorno local

Hallazgos verificados de la máquina de Pablo (Windows 11), heredados del
portfolio. Si descubrís algo del entorno que costó averiguar, anotalo acá.

- **Node 24.21.0**, la LTS activa. `nvm-windows` 1.2.2 ya está instalado con 24.21.0, 22.14.0, 20.17.0 y 18.16.1. **No propongas instalar Node ni `winget`**: alcanza con `nvm use 24.21.0`.
- **Hay un Node suelto fuera de nvm** en `C:\Program Files\nodejs\node.exe` (v22.14.0). Hoy gana el symlink de nvm, pero si el orden del PATH cambia, `nvm use` deja de tener efecto **sin decir nada**. Si cambiaste de versión y `node -v` no te sigue, mirá `where node` antes que nada.
- **PowerShell cachea la resolución de comandos.** Después de un `nvm use`, `node -v` puede seguir mostrando la versión vieja en esa terminal. Abrí una nueva para verificar.
- **`nvm use` cambia la versión de la máquina, no la del directorio.** Hay otro proyecto en Node 20.17. Antes de dar por rota una dependencia, verificá `node -v`.
- **Git pide elegir cuenta en cada operación si no se fija el usuario.** Se resuelve por repo: `git config --local credential.https://github.com.username pablodalvarezg`. Vive en `.git/config`, así que hay que repetirlo si se reclona. Si un comando de red tarda más de unos segundos, sospechá de esto antes que de la red.
- **Gestor de paquetes: `npm`**, no pnpm. El lockfile es `package-lock.json`.
- **npm aplana `node_modules`:** un `import` de un paquete no declarado en `package.json` funciona en local y explota en el deploy. Declará toda dependencia que importes, aunque ya esté como transitiva.
- **npm 11 bloquea los scripts de instalación** salvo los aprobados en `allowScripts`. Importa: `unrs-resolver` es el resolver nativo de `eslint-import-resolver-typescript`, y sin su postinstall **las reglas de boundaries pasan en verde sin comprobar nada** en un clone limpio.
- **En `allowScripts`, la clave va sin versión.** `npm install-scripts approve <pkg>` escribe `"unrs-resolver@1.12.2": true`, y ese pin deja de cubrir el paquete en el próximo bump: el postinstall vuelve a bloquearse y las boundaries vuelven a pasar sin comprobar nada. Un rango (`@^1`) **no** se acepta; el nombre pelado (`"unrs-resolver": true`) sí, y cubre toda versión. Verificado: `npm install` no emite el warning `install-scripts`.
- **`next typegen` antes de `tsc`.** Next 16 genera tipos globales (`LayoutProps`, `PageProps`) en `.next/types/`, y `next-env.d.ts` los importa. En un clone limpio, `tsc --noEmit` a secas falla porque esos tipos no existen todavía. Por eso `npm run check` es `next typegen && tsc --noEmit`.
- **Git Bash traduce los argumentos que empiezan con `/`.** `taskkill /PID 1234 /F` falla con `Argumento u opción no válido - "C:/Program Files (x86)/Git/PID"`: MSYS lee `/PID` como una ruta POSIX y la convierte. Salidas, de mejor a peor: `Stop-Process -Id 1234 -Force` en PowerShell, `taskkill //PID 1234 //F` con la barra duplicada, o `MSYS_NO_PATHCONV=1` delante. Vale para cualquier `.exe` de Windows con flags de barra, no solo `taskkill`.
- **`next dev` no arranca un segundo servidor sobre el mismo directorio.** Toma otro puerto, avisa `Another next dev server is already running` y te da el PID y el log en `.next/dev/logs/next-development.log`. Si un agente dejó uno vivo, matalo con el PID que imprime ahí. **Un agente que levanta el dev server lo baja antes de terminar el turno**, o queda ocupando el 3000 en la sesión siguiente.
- **Una clase inválida de Tailwind no falla: no existe.** `max-w-75ch` compila a
  nada y el elemento queda sin ancho máximo, en silencio — ni el build ni el lint
  dicen una palabra. Los valores arbitrarios van entre corchetes: `max-w-[75ch]`.
  Si un estilo "no se aplica", buscá la clase en el CSS construido
  (`.next/static/**/*.css`) antes de sospechar de la cascada.
- **Los heredocs de esta terminal se comen un nivel de backslash, incluso citados.** Cualquier archivo con secuencias de escape se escribe con la herramienta de edición, no por heredoc. Y la lógica que puede estar mal va en un `.ts` de `domain/`, no al lado del componente, para que los tests la vean.

## Comandos

```bash
nvm use 24.21.0   # solo si venís de otro proyecto en Node 20
npm install       # la primera vez, y cuando cambien las dependencias
npm run dev       # http://localhost:3000

npm run build     # build de producción
npm run check     # tsc --noEmit
npm run lint      # eslint, incluye boundaries
npm run format    # prettier --write
npm test          # vitest
```

## Forma de trabajo

1. **Tareas no triviales:** primero proponé un plan corto (archivos a crear o tocar, módulo afectado, riesgos) y esperá confirmación.
2. **El agente no commitea ni pushea solo.** Trabajá sobre la rama activa, dejá
   los cambios sin commitear y terminá diciendo qué tocaste. Commit, rama, push y
   PR los decide Pablo. Una tarea terminada es `check`, `lint` y `test` en verde
   con el árbol sucio, no un commit.
3. Cuando Pablo sí pide commitear: un tema por commit, nada directo a `main`,
   cada tarea en su rama (`feat/...`, `chore/...`, `fix/...`) y entra por PR.
   Verificá `git branch --show-current` antes de cada commit y pusheá con
   `git push -u origin HEAD`, nunca con el nombre de la rama escrito a mano.

   | Tag     | Cuándo se usa                                             |
   | ------- | --------------------------------------------------------- |
   | `[ADD]` | Agrega funcionalidad nueva                                |
   | `[UPD]` | Actualiza algo que ya existía                             |
   | `[FIX]` | Arregla un bug no intencionado                            |
   | `[PAT]` | Parche mínimo: typo, bump de versión, ajuste de una línea |

   Formato: `[ADD] token list with server-side sorting`. Subject en inglés, imperativo, sin punto final.

4. **Decisiones de arquitectura** relevantes van en `docs/adr/NNNN-titulo.md` (contexto, decisión, consecuencias), en inglés como el README.
5. Mantené el `README.md` al día: cómo correr, de dónde salen los datos, cómo se mide el presupuesto.
6. Si detectás deuda técnica que no corresponde a la tarea actual, anotala como `TODO` o en un issue; no la resuelvas de paso.

## Tags y veredicto de review

Fuente única de estas reglas. La skill `/pr-review` las referencia por el nombre
de esta sección y **no las duplica**: dos copias terminan diciendo cosas
distintas.

| Tag     | Significado                                                                              | ¿Bloquea el merge? |
| ------- | ---------------------------------------------------------------------------------------- | ------------------ |
| `FIX`   | Rompe algo y hay que arreglarlo antes de mergear                                         | Sí                 |
| `CHECK` | Vale mirarlo pero no rompe nada: código muerto, simplificación posible, mejora sugerida   | No                 |
| `GTG`   | Good to go: no quedó ningún `FIX`                                                        | No                 |

- `CHECK` convive con `GTG` y con `FIX`.
- `GTG` y `FIX` **nunca** aparecen juntos: si hay aunque sea un hallazgo `FIX`, el
  veredicto es `FIX`.
- `FIX` como tag de review y `[FIX]` como tag de commit son cosas distintas: el
  primero califica un hallazgo, el segundo un commit.

## No hacer

- **Commitear o pushear sin permiso explícito de Pablo.** Incluye el primer commit
  de un repo nuevo, un `git add`, un `git rm` y un `--amend`. El estado en el que
  se entrega una tarea es el árbol sucio con `check`, `lint` y `test` en verde; el
  commit se pide, no se asume. Si algo parece necesitar un commit para avanzar,
  preguntá.
- **Borrar o sobrescribir archivos de Pablo sin avisar**, en particular los `.md`
  que escribió él. Proponé el borrado y dejá que lo haga o lo confirme.
- Microservicios, backends separados o colas.
- Una base de datos en la fase 1.
- Lógica de negocio en `app/` o en componentes de `ui/`.
- Imports profundos entre módulos o de `shared/` hacia `modules/`.
- Colores, fuentes o espaciados hardcodeados fuera de los tokens.
- Renderizar el catálogo en el cliente. Es literalmente lo que el proyecto existe para no hacer.
- Inventar métricas de performance o datos de mercado.
- Gastar plata: todo tiene que caber en planes gratis.
