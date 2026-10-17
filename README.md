# Whirlpop

Juego arcade de piezas que caen sobre un tablero que gira, en un único fichero HTML con canvas 2D.

## Jugar

https://mourulez.github.io/whirlpop/

## Controles

- **Arrastrar**: gira el tablero.
- **Mantener pulsado**: sigue girando mientras mantienes.
- **Toque rápido**: hard drop (la pieza cae de golpe).
- **Pausa**: botón de arriba a la derecha; también al cambiar de app, de pestaña o de ventana. En la pausa se apagan la música y los efectos.
- **Escritorio**: teclas ← / → para girar, ↓ para bajar, `P` o `Esc` para pausar y `F` para pantalla completa.

## Estado

Prototipo en fase de testing. Se busca feedback.

## Desarrollo

Abre `index.html` en el navegador. No hay build ni dependencias: el código entero
está en ese fichero.

## Estructura

- `index.html` — el juego completo: lógica, estilos y glifos en un solo fichero.
- `fonts/` — la tipografía Baloo 2 (subset latino) y su licencia SIL OFL.
- `img/` — el logotipo de los telones de pausa y fin de partida.
- `audio/` — las diez notas de piano de los efectos (`piano.js`, generado por `build_piano.py`) y sus créditos. El resto del audio se sintetiza en el navegador.
- `bench-audio.html` — banco de escucha de la música y los efectos; no se carga al jugar.
- `art/` — fuente editable de los glifos del tutorial; no se carga al jugar.
- `CLAUDE.md` — reglas transversales, verificación y flujo de trabajo para Claude.
- `.nojekyll` — evita que GitHub Pages procese el sitio con Jekyll.
- `.gitignore` — ficheros que no se versionan (temporales del sistema y de editores).

## Créditos

- Piano: Salamander Grand Piano V2 by Alexander Holm, CC BY 3.0 (ver `audio/CREDITOS.md`).
- Tipografía: Baloo 2, SIL OFL 1.1 (`fonts/`).
