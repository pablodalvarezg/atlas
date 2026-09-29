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

- **Librerías de gráficos.** Un sparkline es un `<path>` de SVG calculado en el
  servidor. Una librería de charts son decenas de KB de JavaScript en la página
  que tiene presupuesto.
- **Clientes HTTP.** `fetch` ya viene, y es el que integra la caché de Next.
- **Librerías de estado.** Si aparece estado global, el diseño está mal.

### Estructura

```
src/
├─ app/                        # SOLO routing y composición. Finas: obtienen datos vía módulos.
│  ├─ layout.tsx               # html, body, tokens globales
│  ├─ page.tsx                 # el catálogo
│  ├─ token/[id]/page.tsx      # la página de un token
│  └─ not-found.tsx
├─ modules/                    # Un módulo por dominio. Cada uno expone su API en index.ts.
│  ├─ catalog/                 # El dominio central: qué es un token y cómo se lista
│  │  ├─ domain/               # Tipos, filtros, orden, formato. TS puro, sin Next/React/IO.
│  │  ├─ data/                 # Repositorio: único lugar que habla con CoinGecko
│  │  ├─ ui/                   # Tabla, fila, buscador, ficha. Reciben props.
│  │  └─ index.ts              # API pública del módulo
│  ├─ markets/                 # Dónde comprarlo: venues, tickers y links de salida
│  └─ seo/                     # Canonical, sitemap, JSON-LD, Open Graph
└─ shared/                     # Código sin dominio, reutilizable por cualquier módulo
   ├─ ui/                      # Primitivas: Button, Container, Section, Table
   └─ config/                  # env.ts (Zod) y site.ts
```

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

   Los errores también cuentan para el límite, así que un reintento en loop se
   paga. `TODO(pablo):` el detalle por token (descripción, tickers de venues para
   "dónde comprarlo") necesita `/coins/{id}`, que es una llamada por token: a
   250 tokens revalidados cada 7 días son ~1.071/mes. Se decide al escribir
   `markets`.

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

- [ ] Listado con búsqueda, filtros y orden. Andan **sin JavaScript**: son
      parámetros en la URL y el servidor devuelve la página ya ordenada. Un
      catálogo que necesita JS para ordenarse contradice la tesis.
- [ ] Página por token: precio, capitalización, suministro, rangos.
- [ ] **Dónde comprarlo**, con enlaces a los venues oficiales.
- [ ] Presupuesto de performance en CI **desde el primer commit**.
- [ ] Un test que abra el HTML construido de una página de token y **busque el
      precio adentro**. Es una línea y es la prueba de la tesis: si alguien mete
      un `"use client"` de más y los datos se van al cliente, ese test se pone
      rojo antes que cualquier métrica.
- [ ] README: cómo correr, de dónde salen los datos, cómo se mide el presupuesto.
- [ ] ADR 0001: ISR en vez de `output: 'export'`.

### Fase 2

Comparador lado a lado; endpoint propio de redirección para contar clics sin
meter un tracker de terceros —**acá aparece la primera base de datos**, Neon en
plan gratuito, no antes—; ingesta por lotes priorizando los tokens más vistos,
que depende de lo anterior.

### Fuera de alcance, a propósito

Carteras, alertas de precio, login, gráficos interactivos pesados, datos que
CoinGecko no dé gratis.

## El presupuesto de performance

Es la feature, no la verificación. Lighthouse CI corre en GitHub Actions contra
el deploy de preview y **falla el job** cuando se pasa un umbral. Como mínimo:
**LCP**, **CLS** y **bytes de JavaScript** de la página de un token.

`TODO(pablo):` los umbrales se fijan en el primer deploy, midiendo lo que ya hay,
y a partir de ahí solo bajan. Poner números antes de medir es inventar datos.

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
- Sin estado global salvo necesidad demostrada.
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

- Microservicios, backends separados o colas.
- Una base de datos en la fase 1.
- Lógica de negocio en `app/` o en componentes de `ui/`.
- Imports profundos entre módulos o de `shared/` hacia `modules/`.
- Colores, fuentes o espaciados hardcodeados fuera de los tokens.
- Renderizar el catálogo en el cliente. Es literalmente lo que el proyecto existe para no hacer.
- Inventar métricas de performance o datos de mercado.
- Gastar plata: todo tiene que caber en planes gratis.
