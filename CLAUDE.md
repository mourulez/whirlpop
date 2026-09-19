# Whirlpop — guía para Claude

## Función de este fichero

Aquí va solo lo que **cruza todo el juego o no está en el código**: reglas
transversales, decisiones cerradas, cómo se verifica, cómo se trabaja y el
entorno. Se lee antes de tocar nada.

No va aquí nada de lo que ya cuenta el README (controles, estructura) ni el
detalle de cada mecánica: eso vive en los comentarios de `index.html`, junto al
código, y ahí se mantiene al día. Si una entrada solo afecta a una función, su
sitio es un comentario. Si algo de aquí deja de ser cierto, se borra. Tope
orientativo: 80 líneas.

## Reglas transversales del código

- **Tres espacios** (ver "conversiones" en `index.html`):
  - celda: el grid.
  - mundo: lo que vuela; unidades de `PS`, origen en el centro de la esfera, sin girar.
  - pantalla: px CSS.

  **Ningún estado que dure más de un frame se guarda en px.** Solo el dibujo
  convierte a pantalla, y `resize()` no migra nada.
- Toda medida de juego y de UI es un múltiplo de `PS` (`STAGE`). En CSS se usa
  `--u` con suelo en px. Mobile first: siempre una columna vertical.
- Sin detección de dispositivo. El input es la excepción a la regla anterior:
  sus umbrales (`DRAG_PX_*`, `SPEED_REF`) van en px a propósito, porque miden
  dedo, no tablero.
- La lógica no depende de la resolución: la misma semilla da la misma partida
  en cualquier ventana, también redimensionando a mitad de partida.

## Decisiones cerradas

- Las fichas nacen visibles a `0.52` (mundo), justo fuera del halo del arco de
  aviso, y ya con su velocidad normal. Si una spec propone sacarlas desde fuera
  de pantalla o con una fase de entrada, se descarta: el arco ya anticipa de
  dónde vienen.
- Puntuación sin decimales, ni en la lógica ni en pantalla: multiplicadores
  enteros (tamaño y combo). El anillo se llena con los mismos puntos que suma el
  marcador; no tiene una tabla de carga propia.

## Verificación

No hay tests ni build. Se valida ejecutando el juego real en Chrome headless:

- Se genera una copia de `index.html` con un `<script>` extra tras el
  principal, y se sustituyen **todas** las `requestAnimationFrame(frame);` por
  nada: `frame()` se reprograma a sí misma y el headless no termina.
- Se avanza a mano con `frame(now)` y `dt` fijo, con `Math.random` sembrado.
  Antes del primer frame, `last = 0`: arranca con el `performance.now()` real y
  el primer `dt` rompe el determinismo, incluso de `HEAD` contra `HEAD`.
- La ventana se simula redefiniendo `innerWidth`/`innerHeight` y llamando a
  `resize()`.
- El input se simula despachando `PointerEvent`/`KeyboardEvent` reales, con
  `performance.now` redefinido al reloj virtual: el arrastre mide con él.
  Una partida entera dibujando cada frame tarda ~20 s: lanzar lotes en segundo plano.
- El resultado sale por `--dump-dom`. `--screenshot` saca el canvas en negro:
  para verlo, `draw()` y volcar `cv.toDataURL()` al DOM.
- Perfil nuevo por ejecución (`--user-data-dir`): el guardado de `localStorage`
  cambia la partida.
- URL con `?reset&tut=3&nivel=N`.
- Un grid montado a mano tiene que estar asentado (`gravityPass()` no mueve
  nada): si no, el primer destello lo recoloca y la prueba mide otra cosa.
- Un cambio que no debe alterar el juego se demuestra con partidas sembradas
  idénticas contra `HEAD`: mismo grid, puntuación y frame de muerte. Un bug se
  demuestra primero reproduciéndolo en `HEAD`.

## Forma de trabajar

- Fases dirigidas por una spec suelta en la raíz (`spec-*.md`). Historia lineal
  en `main`, sin ramas ni PRs.
- Si el usuario pide entender o plantear, no se toca nada hasta que lo confirme.
  Sus propuestas se juzgan, no se aceptan por defecto.
- Commits en castellano: título con lo que cambia en el juego; cuerpo con el
  porqué, las cifras medidas y cómo se verificó.
- **"consolidar"** significa que la versión queda jugable online. Se hace de
  principio a fin y sin pedir confirmación:
  1. Borrar del todo la spec implementada (`spec-*.md` de la raíz). No moverla.
  2. **Actualizar este `CLAUDE.md`** con lo que deja la fase, si cumple el
     criterio de "Función de este fichero": una regla transversal nueva, una
     decisión cerrada, un cambio en verificación, flujo o entorno. Borrar lo
     que haya quedado obsoleto. Si no hay nada, no se toca: no se añade crónica
     de la fase.
  3. Commit en `main`, con `CLAUDE.md` incluido.
  4. `git push origin main`.
  5. Comprobar que GitHub Pages sirve la versión nueva
     (https://mourulez.github.io/whirlpop/, tarda 1-3 min; pedir la URL
     saltándose la caché).

## Entorno

- Windows, con Git Bash y PowerShell. No hay node; sí `python3`.
- Chrome en `C:/Program Files/Google/Chrome/Application/chrome.exe`.
- `to-do list.md` es del usuario y está excluido en `.git/info/exclude`: no tocarlo.
