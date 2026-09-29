# Atlas — kickoff

Documento de arranque para el repo **`atlas`**, el side project 1 de
`PORTFOLIO_BRIEF.md` (sección 5). Está escrito para que un agente pueda abrir el
repo vacío y empezar sin volver a decidir nada de lo que ya está decidido acá.

Cuando el repo exista, este archivo se copia adentro y se parte en dos: la parte
de rol, arquitectura y convenciones pasa a ser su `CLAUDE.md`, y la parte de
alcance y fases pasa a ser su `BRIEF.md`. Mientras tanto, vive acá.

---

## 1. Qué es Atlas y qué no es

Un **catálogo público de tokens** con buscador, filtros, página por token y
comparador. Su trabajo es que encuentres un token, entiendas de qué se trata y
salgas hacia el lugar correcto para comprarlo.

**No es** un gestor de carteras, no calcula resultados, no da consejo financiero
y no tiene cuentas de usuario. Cada una de esas cosas agrega una base de datos y
un flujo de sesión que no aportan nada a lo que el proyecto tiene que demostrar.

**Lo que tiene que demostrar, en una frase:** que el HTML de una página de token
llega con los datos adentro, medido y con un presupuesto que rompe el build
cuando se pasa.

Eso es lo que lo separa de STM, que resuelve el mismo problema renderizando en
el navegador porque tenía cuatro semanas. El case study de STM ya nombra esa
diferencia, así que **Atlas existe para cerrar esa comparación**: sin Atlas, ese
párrafo del portfolio es una promesa.

---

## 2. La decisión de arquitectura que no es igual a la del portfolio

El portfolio usa `output: 'export'`. **Atlas no.**

Un catálogo de precios necesita datos frescos sin rebuild manual, así que Atlas
se despliega en Vercel con **ISR**: las páginas se generan y se revalidan solas
cada N minutos. Sigue siendo HTML prerenderizado —el navegador recibe los datos
ya adentro, que es la tesis del proyecto— pero con una fecha de vencimiento.

Esto va en la **ADR 0001 del repo de Atlas**, porque es la diferencia de fondo
con el portfolio y alguien la va a cuestionar.

Consecuencias, para que nadie las descubra tarde:

- Hay route handlers de verdad (los necesita el endpoint de salida de la fase 2).
- El plan Hobby de Vercel corre **un cron por día**. Cualquier trabajo programado
  que necesite más frecuencia va a **GitHub Actions**, no a Vercel.
- ISR se mide distinto: el primer visitante después de que expira la caché puede
  recibir la página vieja mientras se regenera. Es el comportamiento correcto y
  hay que decirlo en el case study, no esconderlo.

Todo lo demás se hereda del portfolio sin cambios: **monolito modular**, un solo
repo, un solo deploy, sin microservicios, sin colas, sin backend aparte.

---

## 3. Stack

| Pieza         | Elección                                                                   | Por qué                                                                                        |
| ------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Framework     | **Next.js 16** (App Router), la misma major que el portfolio               | Una sola versión de App Router en la cabeza de Pablo, y las convenciones ya están escritas     |
| Runtime       | **Node 24.21.0** (`nvm use 24.21.0`)                                       | Es lo que corre en la máquina; ver "Entorno local" del `CLAUDE.md` del portfolio               |
| Lenguaje      | **TypeScript** `strict`                                                    |                                                                                                |
| UI            | **React 19**, Server Components por defecto                                | `"use client"` solo donde haya interacción real, y lo más abajo posible                        |
| Estilos       | **Tailwind 4** + tokens semánticos en CSS custom properties                | Mismo contrato que el portfolio: nada de colores a mano en componentes                         |
| Validación    | **Zod**                                                                    | Valida la respuesta de la API y el env al arrancar                                             |
| Datos         | **CoinGecko**, plan gratuito con API key                                   | Fuente documentada, estable y gratis. Es la razón por la que Atlas está en el lineup y Apex no |
| Tests         | **Vitest** (unit), **Playwright** (smoke), **Lighthouse CI** (presupuesto) |                                                                                                |
| Deploy        | **Vercel Hobby**                                                           |                                                                                                |
| Base de datos | **Ninguna en la fase 1**                                                   | Ver sección 6                                                                                  |

**Ninguna dependencia más sin justificarla.** En particular: nada de librerías
de gráficos —un sparkline es un `<path>` de SVG calculado en el servidor—, nada
de librerías de estado, nada de clientes HTTP: `fetch` ya viene.

---

## 4. Estructura

```
atlas/
├─ .github/workflows/ci.yml       # check, lint, test, build, Lighthouse CI
├─ docs/adr/0001-isr-over-static-export.md
├─ src/
│  ├─ app/                        # SOLO routing y composición
│  │  ├─ layout.tsx               # html, body, tokens globales
│  │  ├─ page.tsx                 # el catálogo
│  │  ├─ token/[id]/page.tsx      # la página de un token
│  │  └─ not-found.tsx
│  ├─ modules/
│  │  ├─ catalog/                 # el dominio central: qué es un token y cómo se lista
│  │  │  ├─ domain/               # tipos, filtros, orden, formato. TS puro, sin Next ni React
│  │  │  ├─ data/                 # el repositorio: único lugar que habla con CoinGecko
│  │  │  ├─ ui/                   # tabla, fila, buscador, ficha. Reciben props
│  │  │  └─ index.ts              # API pública
│  │  ├─ markets/                 # dónde comprarlo: venues, tickers y links de salida
│  │  │  ├─ domain/               # qué venue se muestra y cuál se descarta
│  │  │  ├─ data/
│  │  │  ├─ ui/
│  │  │  └─ index.ts
│  │  └─ seo/                     # canonical, sitemap, JSON-LD, Open Graph
│  └─ shared/
│     ├─ ui/                      # Button, Container, Section, Table
│     └─ config/                  # env.ts (Zod) y site.ts
└─ public/
```

**Este árbol es adónde van las cosas, no lo que hay el día uno.** Una carpeta se
crea cuando tiene contenido. Si `markets` empieza siendo tres funciones, que
sean tres funciones con su `index.ts`, no cuatro capas vacías.

### Reglas de dependencia

Las mismas del portfolio, y se hacen cumplir con `eslint-plugin-boundaries`
desde el primer commit, no después:

```
app → modules (vía index.ts) → shared
         ui → domain
       data → domain
```

- `app/` importa de los módulos **solo por su `index.ts`**.
- `domain/` es TypeScript puro: sin Next, sin React, sin DOM, sin I/O. Es la capa
  que se testea en serio.
- `data/` es la única capa que hace `fetch`. Devuelve tipos de `domain/`, nunca
  el JSON crudo de CoinGecko.
- `ui/` recibe props y no sabe de dónde salieron los datos.
- `shared/` nunca importa de `modules/`.
- Aliases `@modules/*`, `@shared/*`, `@app/*`. Nada de `../../`.

---

## 5. El contrato con CoinGecko

`data/` es la frontera con el mundo, y el mundo miente. Tres reglas:

1. **La respuesta se valida con Zod antes de entrar al dominio.** Un campo que
   cambia de nombre tiene que fallar en un solo archivo, no dejar `undefined`
   viajando hasta un componente.
2. **El tipo de dominio no es la forma de la API.** CoinGecko devuelve docenas de
   campos por token; el dominio define los que Atlas usa y `data/` mapea. Si
   mañana hay que cambiar de proveedor, se toca una carpeta.
3. **Los límites del plan gratuito son un dato de diseño, no una sorpresa.**
   `TODO(agente):` leer la doc del plan gratuito de CoinGecko y anotar acá el
   límite real por minuto y por mes **antes** de escribir la ingesta. De ese
   número salen la frecuencia de revalidación y el tamaño del lote. No lo
   estimes: lo dice la doc.

La API key va en el env, validada con Zod en `shared/config/env.ts`. Nunca
`process.env` suelto.

### Caché, que es la mitad del proyecto

Tres capas, de adentro hacia afuera:

- **Upstream:** cada `fetch` a CoinGecko lleva su propia `revalidate`. Los
  precios y el listado no vencen al mismo tiempo que el nombre de un token.
- **Página:** `revalidate` por ruta. El listado más seguido que una ficha.
- **Borde:** las cabeceras de Vercel, con `stale-while-revalidate`, para que
  nadie espere una regeneración.

Que las tres estén bien puestas es exactamente lo que el case study va a contar,
así que cada valor elegido merece un comentario con el porqué.

---

## 6. Alcance por fases

La fase 1 es lo que hace falta para que el proyecto **exista y se pueda
defender**. Todo lo demás espera.

### Fase 1 — el catálogo con los datos adentro del HTML

- [ ] Listado con búsqueda, filtros y orden. El orden y el filtro andan **sin
      JavaScript**: son parámetros en la URL y el servidor devuelve la página ya
      ordenada. Un catálogo que necesita JS para ordenarse contradice la tesis.
- [ ] Página por token: precio, capitalización, suministro, rangos.
- [ ] **Dónde comprarlo**, con enlaces a los venues oficiales.
- [ ] Presupuesto de performance en CI **desde el primer commit**, no al final.
- [ ] Un test que abra el HTML construido de una página de token y **busque el
      precio adentro**. Es una línea y es la prueba de que la tesis se cumple:
      si alguien mete un `"use client"` de más y los datos se van al cliente,
      ese test se pone rojo antes que cualquier métrica.
- [ ] README con cómo correr, de dónde salen los datos y cómo se mide el
      presupuesto.
- [ ] ADR 0001: ISR en vez de `output: 'export'`.

### Fase 2 — lo que suma una vez que lo de arriba está en verde

- Comparador lado a lado.
- Endpoint propio de redirección para contar clics de salida sin meter un
  tracker de terceros. **Acá aparece la primera base de datos** (Neon, plan
  gratuito, que duerme a los 5 minutos y está bien). No antes.
- Ingesta por lotes priorizando los tokens más vistos, que necesita saber cuáles
  son, o sea que depende del punto anterior.

### Fuera de alcance, a propósito

Carteras, alertas de precio, login, gráficos interactivos pesados, datos de
cadenas que CoinGecko no dé gratis.

---

## 7. El presupuesto de performance

Es la feature, no la verificación. Lighthouse CI corre en GitHub Actions contra
el deploy de preview y **falla el job** cuando se pasa alguno de los umbrales.

Qué se mide, como mínimo: **LCP**, **CLS** y **bytes de JavaScript** de la página
de un token.

`TODO(pablo):` los umbrales se fijan en el primer deploy, midiendo lo que ya
hay, y a partir de ahí solo pueden bajar. Poner números antes de tener una
medición es inventar datos.

El número que va al case study no es "se siente rápido": es el **peso del HTML
de una página de token y el LCP en red lenta, antes y después**. Guardá las dos
mediciones desde el principio; la de "antes" no se puede recuperar más tarde.

---

## 8. Estética

Clara y densa, tabular, cercana a un terminal financiero sobrio. Paleta propia
que después se replica como el tema `atlas` del portfolio (hoy el registro solo
tiene `base` y `markets`; el tema se crea cuando llegue el case study).

Una regla concreta: **`font-variant-numeric: tabular-nums` en toda columna de
números**, o las cifras bailan al actualizarse.

Y una que ya aprendimos en el portfolio: **si formateás números o fechas, el tag
de locale lleva región.** `es` a secas formatea 1200 como `1200 US$`; `es-AR` da
`US$ 1.200`. El formateo vive en `catalog/domain` y se testea ahí.

---

## 9. Calidad

- Tests unitarios obligatorios sobre `domain/`: filtros, orden, formato y el
  mapeo de la respuesta de la API.
- Smoke e2e con Playwright: listado, una ficha de token y un link de salida.
- Accesibilidad: HTML semántico, una tabla que sea una tabla, foco visible,
  contraste AA, navegación por teclado. Responsive desde 360 px, que en una
  tabla de siete columnas es el problema difícil: decidí temprano qué columnas
  se caen y cuáles no.
- SEO: canonical, sitemap con todos los tokens, JSON-LD y Open Graph por página.
  Un catálogo cuyo trabajo es que lo encuentren no puede tener esto pendiente.
- Antes de dar algo por terminado: `npm run check && npm run lint && npm test`.

---

## 10. Forma de trabajo

- **No se commitea automáticamente.** El agente trabaja sobre la rama actual,
  deja los cambios sin commitear y Pablo decide qué entra.
- Código, nombres, comentarios y commits en **inglés**.
- Tags de commit: `[ADD]`, `[UPD]`, `[FIX]`, `[PAT]`. Subject imperativo, sin
  punto final.
- Ante una ambigüedad de producto, **preguntar**. Para datos faltantes,
  `TODO(pablo):`. Nunca inventar números, ni de mercado ni de performance.
- Todo tiene que caber en planes gratis. El único costo aceptado del stack de
  side projects es el dominio.

---

## 11. Primeros cuatro pasos

En este orden, porque cada uno hace barato al siguiente:

1. **Andamiaje con las reglas puestas:** Next 16 + TS strict + Tailwind 4 +
   Vitest + ESLint con `boundaries`, y el CI corriendo `check`, `lint`, `test` y
   `build`. Sin features todavía.
2. **`catalog/domain` completo y testeado sin red:** el tipo `Token`, los
   filtros, el orden y el formato, contra un fixture JSON. Acá se decide la
   forma del dominio, que es lo más caro de cambiar después.
3. **`catalog/data` contra CoinGecko de verdad**, con el schema de Zod y las
   revalidaciones comentadas una por una. Primer deploy a Vercel.
4. **Lighthouse CI con los umbrales medidos en ese primer deploy**, y el test que
   busca el precio dentro del HTML. A partir de acá, el presupuesto defiende
   solo lo que el proyecto promete.

Recién entonces empieza la UI de verdad.
