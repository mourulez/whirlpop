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
  `--u` con suelo en px. Mobile first: una columna vertical; solo en landscape
  (ancho > alto) los marcadores salen a los lados y la esfera llena la altura.
- Sin detección de dispositivo. El input es la excepción a la regla anterior:
  sus umbrales (`DRAG_PX_*`, `SPEED_REF`) van en px a propósito, porque miden
  dedo, no tablero.
- La lógica no depende de la resolución ni de los fps: la misma semilla y el
  mismo input dan la misma partida en cualquier ventana y a cualquier ritmo de
  pantalla, también redimensionando a mitad de partida. Toda la lógica corre en
  `updateGame()`, a ticks fijos de `SIM_DT` (1/60); `draw(alpha)` interpola entre
  el tick anterior y el actual y no modifica nada de la partida. Los listeners de
  input solo tocan estado que el tick siguiente lee al empezar.

## Decisiones cerradas

- Las fichas nacen visibles a `0.52` (mundo), justo fuera del halo del arco de
  aviso, y ya con su velocidad normal. Si una spec propone sacarlas desde fuera
  de pantalla o con una fase de entrada, se descarta: el arco ya anticipa de
  dónde vienen.
- Puntuación sin decimales, ni en la lógica ni en pantalla: multiplicadores
  enteros (tamaño, combo y barrido limpio). El anillo se llena con los mismos
  puntos que suma el marcador; no tiene una tabla de carga propia.
- La cascada se premia con un solo `+N` que crece y engorda en cada eslabón, sin
  rótulo de multiplicador ni resumen aparte: los textos suman siempre lo que
  sube el marcador. El bonus que no deja una sola bola en el tablero vale ×4 y
  lo cuenta igual: un texto que dobla dos veces, con el ritmo y los parámetros
  de la cascada. Ningún bonus carga el anillo.
- Hay un solo bonus: la bomba, un disco alrededor del impacto, en naranja. Hubo
  dos que alternaban (un barrido naranja hacia fuera y la bomba en turquesa) y se
  dejó solo la bomba para simplificar. No se reintroduce un segundo bonus ni la
  alternancia sin decidirlo antes.
- La bola que no cabe se juzga antes de morir (hueco liberado o match desde
  fuera), pero solo espera una a la vez: sin cola. La espera dura un destello y
  en 16.000 partidas no llegó nunca una segunda; si llega, muere sin juicio.
- Portrait es una Game Boy: pantalla arriba, pulgares abajo. La esfera sube
  siempre hasta la guarda superior, sin tope propio: con tope, al estrechar la
  pantalla volvía a bajar. "NIVEL X" y el tip no reservan altura en ningún
  layout: se superponen (el nivel va a desaparecer).
- Portrait ancho (tablet en vertical, alto/ancho < 1.55) se queda con la columna
  0.645 y el HUD centrado debajo. La ergonomía Game Boy es de móvil (no hay
  móviles 4:3): no se rediseña el tablet por los pulgares. Se propuso abrir ahí
  el HUD a las esquinas para agrandar la esfera y se descartó.

## Verificación

No hay tests ni build. Se valida ejecutando el juego real en Chrome headless:

- Se genera una copia de `index.html` con un `<script>` extra tras el
  principal, y se sustituyen **todas** las `requestAnimationFrame(frame);` por
  nada: `frame()` se reprograma a sí misma y el headless no termina.
- Se avanza a mano con `updateGame(SIM_DT)`, con `Math.random` sembrado. Si la
  prueba pasa por `frame(now)` (cadencias, tope), antes `last = 0; acc = 0` y
  `now` virtual.
- Sembrar no basta: hay que **volver a llamar a `reset()`** después, porque el
  del arranque ya consumió el `Math.random` real. Sin eso, dos corridas de la
  misma semilla divergen en el primer aterrizaje y el arnés miente.
- El script de pruebas comparte ámbito global con el juego: `R`, `C`, `N`, `OUT`
  y compañía están cogidos, y redeclararlos es un `SyntaxError` que deja la
  página en blanco. Si no sale nada, la consola
  (`--enable-logging=stderr --v=0`) antes que sospechar del juego.
- La ventana se simula redefiniendo `innerWidth`/`innerHeight` y llamando a
  `resize()`, pero eso no mueve el CSS (`vw`, HUD): para el layout, ventana real
  con `--window-size`. El viewport sale 16×95 px menor y nunca baja de 500 de ancho.
- El input se simula despachando `PointerEvent`/`KeyboardEvent` reales, con
  `performance.now` redefinido al reloj virtual: el arrastre mide con él.
  Una partida entera dibujando cada frame tarda ~20 s: lanzar lotes en segundo plano.
  Si no hace falta ver nada, `draw = function(){}` baja a ~1000 partidas en
  segundos por instancia de Chrome, y varias en paralelo.
- El resultado sale por `--dump-dom`. `--screenshot` saca el canvas en negro y
  captura con un viewport mayor que el que vio el script: `draw()`, cambiar el
  canvas por un `<img>` con `cv.toDataURL()`, fijar el `body` a
  `innerWidth`×`innerHeight` con un `transform` (los `fixed` se anclan a él) y
  cortar el `resize` tardío en fase de captura.
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
