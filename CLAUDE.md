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
  sus umbrales (`DRAG_PX_*`, `SPEED_REF`, `WHEEL_PX`) van en px a propósito,
  porque miden dedo, no tablero. Se pregunta al navegador qué puede hacer, no qué es.
- La lógica no depende de la resolución ni de los fps: la misma semilla y el
  mismo input dan la misma partida en cualquier ventana y a cualquier ritmo de
  pantalla, también redimensionando a mitad de partida. Toda la lógica corre en
  `updateGame()`, a ticks fijos de `SIM_DT` (1/60); `draw(alpha)` interpola entre
  el tick anterior y el actual y no modifica nada de la partida. Los listeners de
  input solo tocan estado que el tick siguiente lee al empezar.
- `Math.random` es solo de la partida. Cada efecto visual (fondo, rayo, estela,
  explosión del pop, giro de las piedras) tiene su PRNG con semilla fija (`vrand`,
  `rrand`, `prand`, `xrand`, `srand`) y su reloj propio
  avanza en `updateGame()` sin escribir estado de juego: gastarlo desde el dibujo
  cambiaría la partida. El audio igual: `arand`, y `sfx()` solo lee la partida.
- Toda caché horneada en un canvas aparte se crea con `bgCanvas()` y se hornea
  desde `bake()`: si la GPU se reinicia, Chrome devuelve los canvas vacíos y solo
  eso se rehornea. Se reproduce abriendo `chrome://gpucrash` en otra pestaña.
  Se pinta 1:1 en px de dispositivo, recortada a lo que ocupa: con DPR
  fraccionario, un canvas de `ceil(W·DPR)` pintado a `W` se reescala y se corre
  medio píxel. La excepción es lo que gira con el tablero (las capas de sombras y de piedras):
  se remuestrea por fuerza.
- Cero peticiones externas (requisito Poki): fuente e imágenes van en el repo
  con ruta relativa, nada de CDN ni Google Fonts.

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
- La bomba es el único evento que sacude la cámara (y solo el tablero, no el
  fondo; nada con `prefers-reduced-motion`). No se añade shake a pops, combos,
  nivel ni game over sin decidirlo antes.
- Las bolas que recoloca la gravedad no dejan estela: se probó la del hard drop
  y casi no se notaba.
- Cada ficha en vuelo, de color o blanca, pinta su fantasma de aterrizaje,
  siempre y sin opción para quitarlo; el bonus, no. Predice con la misma regla
  que el aterrizaje (`traceSeg()`, `restCell()`), nunca con una copia: si cambia
  el aterrizaje, el fantasma lo sigue solo. Es un disco con el canto fundido
  hacia dentro, no un anillo cortado.
- La carga llega al anillo con los orbes, no en el match: cada bola del match
  vuela a la punta y el arco crece al llegar; la bomba sale cuando lo cierra el
  último. Un solo gesto del destello a la punta (`drawCharge()`), todos a la vez
  y en `ORB_TRIP`. Se probó con salidas escalonadas, anticipación y ondas, y se
  descartó por poco fluido y por complejo.
- El ángulo de salida se re-elige en el spawn para evitar la muerte súbita, sin
  salir de la zona del aviso (color) ni de ±90° del opuesto (blancas); las
  sinusoides no.
- La bola que no cabe se juzga antes de morir (hueco liberado o match desde
  fuera), pero solo espera una a la vez: sin cola. La espera dura un destello y
  en 16.000 partidas no llegó nunca una segunda; si llega, muere sin juicio.
- Portrait es una Game Boy: pantalla arriba, pulgares abajo. La esfera sube
  siempre hasta la guarda superior, sin tope propio: con tope, al estrechar la
  pantalla volvía a bajar. El tip no reserva altura en ningún layout: se
  superpone. No hay rótulo de nivel.
- Solo los botones del telón (continuar, reiniciar) tienen forma de botón. HUD,
  pausa, pantalla completa y los interruptores de audio van sin píldora
  (`.wp--bare`): el icono o el texto sueltos, con su filo de tinta.
- Portrait ancho (tablet en vertical, alto/ancho < 1.55): el HUD sigue centrado
  debajo, pero la columna crece hasta llenar el alto (`tallStage()`): la franja
  de pulgares es de móvil y en tablet sobraba. Se propuso abrir ahí el HUD a las
  esquinas para agrandar más la esfera y se descartó.
- Los marcadores no escalan con la columna a pleno: `--uh` es `--u` hasta 4.3px
  y por encima, el 60 % de `--u`, en todos los layouts. En móvil no cambia nada.
- El tutorial de controles del nivel 1 manda sobre el calendario: la partida no
  arranca (ni corre `t` ni cae nada) hasta el primer giro, y mientras dura `t` se
  retiene en el `at` del nivel 2, que no abre hasta consumirlo. Los niveles no se
  solapan con él.
- No hay colores nuevos: el nivel 7 es el último. El rosa (nivel 8) se quitó.
- El tutorial es una partida entera, no una lista de tips: la primera (se da
  por hecha al primer giro) y la que se pide con "Jugar de nuevo al tutorial",
  siempre visible en pausa y en fin de partida. Abandonarlo a medias no deja
  nada pendiente ni se guarda progreso por tip: el almacén solo lleva `tutDone`.
  Fuera de él no hay tips y el anillo está desde el frame cero.
- Todo texto sale de la tabla única `STR`; el original es el castellano de
  España y el HTML solo lleva claves (`data-t`). Idioma: el primero de
  `navigator.languages` entre ES, EN, FR, IT y DE; si no, inglés. Sin selector
  ni forma de forzarlo. Las metas (`description`, `og:`) van fijas en inglés:
  quien las lee no ejecuta JS. "Match" y "combo" no se traducen.
- Audio: todo lo que suena igual cada vez (notas de la música, golpes, texturas
  de los efectos) se hornea una vez, al construir, y va en el repo como MP3
  (`audio/baked.js`); el juego lo decodifica al cargar, sin gesto, y en partida
  es un búfer. En directo solo el piano, el final de cada nota y la mezcla.
  Sintetizar al sonar llevaba el hilo de audio al 40 % de un núcleo, con cortes;
  hornear en el navegador retrasaba la primera nota de 0,8 a 3,5 s en un PC.
- Sin reverb: era un tercio del hilo de audio y no se distinguía. El match suena solo a burbujas, sin piano. Sin volumen: en la pausa,
  interruptores de música y efectos.

## Verificación

No hay tests ni build. Se valida ejecutando el juego real en Chrome headless:

- Se genera una copia de `index.html` con un `<script>` extra tras el
  principal, y se sustituyen **todas** las `requestAnimationFrame(frame);` por
  nada: `frame()` se reprograma a sí misma y el headless no termina.
- Se avanza a mano con `updateGame(SIM_DT)`, con `Math.random` sembrado. Si la
  prueba pasa por `frame(now)` (cadencias, tope), antes `last = 0; acc = 0` y
  `now` virtual. `frame()` no simula con `paused`, y cualquier `blur` o pestaña
  oculta pausa: comprobar que la prueba no se quedó parada.
- Sembrar no basta: hay que **volver a llamar a `reset()`** después, porque el
  del arranque ya consumió el `Math.random` real. Sin eso, dos corridas de la
  misma semilla divergen en el primer aterrizaje y el arnés miente.
- El script de pruebas comparte ámbito global con el juego: `R`, `C`, `N`, `OUT`
  y compañía están cogidos, y redeclararlos es un `SyntaxError` que deja la
  página en blanco. Si no sale nada, la consola
  (`--enable-logging=stderr --v=0`) antes que sospechar del juego.
- La ventana se simula redefiniendo `innerWidth`/`innerHeight` y llamando a
  `resize()`, pero eso no mueve el CSS (`vw`, HUD): para el layout, ventana real
  con `--window-size`. El viewport sale 16×95 px menor y nunca baja de 500 de ancho:
  para un móvil real, un `<iframe>` del tamaño exacto dentro de la página capturada.
  `--dump-dom` no espera a los iframes: si la prueba carga varios (versión
  antigua y nueva, una por tamaño), que mande el resultado por POST a un
  servidor local. Redimensionar el iframe dispara el `resize` real.
- El input se simula despachando `PointerEvent`/`KeyboardEvent` reales, con
  `performance.now` redefinido al reloj virtual: el arrastre mide con él.
  Una partida entera dibujando cada frame tarda ~20 s: lanzar lotes en segundo plano.
  Si no hace falta ver nada, `draw = function(){}` baja a ~1000 partidas en
  segundos por instancia de Chrome, y varias en paralelo.
- El resultado sale por `--dump-dom`. `--screenshot` saca el canvas en negro y
  captura con un viewport mayor que el que vio el script: `draw()`, cambiar el
  canvas por un `<img>` con `cv.toDataURL()`, fijar el `body` a
  `innerWidth`×`innerHeight` con un `transform` (los `fixed` se anclan a él) y
  cortar el `resize` tardío en fase de captura. Las transiciones y animaciones
  CSS no avanzan con el tiempo virtual: pausarlas en el punto que se quiera ver
  (`animation-delay` negativo) y quitar las transiciones, o el tip sale a medio
  fundido. Esperar a `document.fonts.ready` y a `img.decode()` antes de capturar.
- El idioma se fuerza con un `<script>` *antes* del principal que redefina
  `Navigator.prototype.languages`: `LANG` se decide al cargar.
- Perfil nuevo por ejecución (`--user-data-dir`): el guardado de `localStorage`
  cambia la partida.
- URL con `?reset&tut=1&nivel=N` (`tut=1` da el tutorial por hecho, `tut=0` lo
  trae). En la partida del tutorial (`?reset` solo) el tablero arranca con un
  montón precargado y la partida no corre hasta que la prueba gire.
- Un grid montado a mano tiene que estar asentado (`gravityPass()` no mueve
  nada): si no, el primer destello lo recoloca y la prueba mide otra cosa.
- Un cambio que no debe alterar el juego se demuestra con partidas sembradas
  idénticas contra `HEAD`: mismo grid, puntuación y frame de muerte. Del grid se
  comparan los campos de juego: las celdas llevan también estado solo de dibujo
  (`rew`, `so`, `sf`). Un bug se
  demuestra primero reproduciéndolo en `HEAD`.
- Un cambio que no debe alterar el dibujo se demuestra igual, comparando además
  el canvas píxel a píxel (`getImageData`) en los mismos ticks: `HEAD` y la
  versión nueva en dos iframes de la misma página, resultado por POST. Las
  lecturas repetidas pasan el canvas a CPU: no sirven para cronometrar.
- Audio: sin gesto no hay `AudioContext` y `sfx()` no hace nada. Para probarlo,
  `--autoplay-policy=no-user-gesture-required` y un `pointerup` en `document`.
  Decodificar no avanza con tiempo virtual: resultado por POST. Lo horneado se
  compara con el PCM que guarda `build_baked.py --keep` por espectro y
  envolvente, no muestra a muestra: es MP3.

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

- Windows, con Git Bash y PowerShell. No hay node; sí `python3`, con `lameenc`
  (`pip install lameenc`, para `build_baked.py`).
- Chrome en `C:/Program Files/Google/Chrome/Application/chrome.exe`.
- `art/` es la fuente editable de los glifos (Kenney Input Prompts, CC0), ya
  pegados en `index.html`: no se carga en ejecución y se excluye de cualquier
  zip de distribución, no del repo. `fonts/` (Baloo 2, OFL) e `img/` sí van en el
  zip: el juego los carga.
- `audio/` va en el zip, salvo los `build_*`: el juego carga `audio/piano.js`
  (se regenera con `python3 audio/build_piano.py`, con red) y `audio/baked.js`
  (con `python3 audio/build_baked.py`, que lo renderiza en Chrome headless). La
  síntesis de la música y los efectos vive en `audio/build_baked.js`: tras
  cambiarla, o cambiar una nota de la partitura, se regenera.
- Chrome headless se cierra por PID (`taskkill /PID <pid> /T /F`), nunca por
  nombre: cerraría también el Chrome del usuario.
- `to-do list.md` es del usuario y está excluido en `.git/info/exclude`: no tocarlo.
