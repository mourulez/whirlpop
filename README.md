# Whirlpop

Juego arcade de piezas que caen sobre un tablero que gira, en un único fichero HTML con canvas 2D.

## Jugar

https://mourulez.github.io/whirlpop/

## Controles

- **Arrastrar**: gira el tablero.
- **Mantener pulsado**: sigue girando mientras mantienes.
- **Toque rápido**: hard drop (la pieza cae de golpe).
- **Escritorio**: teclas ← / → para girar, ↓ para bajar, y `F` para pantalla completa.

## Estado

Prototipo en fase de testing. Se busca feedback.

## Desarrollo

Abre `index.html` en el navegador. No hay build ni dependencias: el juego entero
está en ese fichero.

## Estructura

- `index.html` — el juego completo: lógica, estilos y assets en un solo fichero.
- `.nojekyll` — evita que GitHub Pages procese el sitio con Jekyll.
- `.gitignore` — ficheros que no se versionan (temporales del sistema y de editores).
