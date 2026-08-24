# Spec 01 — Ficheros de soporte del repo y primer push

## Contexto

Whirlpop es un prototipo de juego arcade en un único fichero HTML autocontenido
(canvas 2D, sin dependencias, sin build step).

**Estado actual del repositorio local:** ya está clonado desde
`git@github.com:mourulez/whirlpop.git`, y el prototipo ya está en la raíz con el
nombre `index.html`. El repo remoto está vacío: aún no se ha hecho ningún push.

Objetivo de esta fase: completar los ficheros de soporte y publicar `main` en el
remoto, para que GitHub Pages pueda servir el juego desde una URL estable que no
cambie entre versiones.

Ejecuta la spec entera de principio a fin, incluido el push. No te detengas a
pedir confirmación en cada paso.

## Tarea

Estado objetivo del repositorio:

```
/
├── index.html          # ya existe, NO tocar en esta spec
├── .nojekyll           # fichero vacío
├── .gitignore
├── README.md
└── specs/              # estas specs
```

### 1. Verificación previa

- Comprobar que `index.html` existe en la raíz y que no queda ningún otro `.html`
  en el repositorio. Si queda alguno, avisar al usuario en vez de borrarlo.
- No modificar el contenido de `index.html`. Los cambios de código van en la
  spec 02.
- El versionado del prototipo se hace con tags de git (`v0.20`, `v0.21`…), nunca
  con el nombre del fichero.

### 2. `.nojekyll`

Fichero vacío en la raíz. Evita que GitHub Pages procese el sitio con Jekyll.

### 3. `.gitignore`

Cubrir al menos: `.DS_Store`, `Thumbs.db`, `node_modules/`, `dist/`, `*.zip`,
`.vscode/`, `.idea/`.

### 4. `README.md`

Secciones, en español:

- **Whirlpop** — una línea describiendo el juego.
- **Jugar** — enlace a `https://mourulez.github.io/whirlpop/`.
- **Controles** — arrastrar para girar, mantener para seguir girando, toque rápido
  para hard drop, teclas ←/→/↓ y `F` para pantalla completa en escritorio.
- **Estado** — prototipo en testing, se busca feedback.
- **Desarrollo** — abrir `index.html` en el navegador; no hay build ni dependencias.
- **Estructura** — cuatro líneas explicando qué es cada fichero.

Sin badges, sin licencia, sin secciones de "contributing". Es un prototipo.

### 5. Carpeta `specs/`

Si las specs no están ya en `specs/`, moverlas ahí. Deben quedar versionadas
junto al código.

### 6. Commit y push

- Confirmar que la rama local se llama `main`; si es `master`, renombrarla con
  `git branch -M main`.
- `git add .` y commit con mensaje `Prototipo v0.20 + estructura del repo`.
- `git push -u origin main`.
- Si el push falla por autenticación SSH, no intentes rodearlo cambiando el remote
  a HTTPS ni tocando la configuración de claves: para y reporta el error al
  usuario con el mensaje exacto de git.

### 7. Verificar que la rama llegó al remoto

- `git ls-remote --heads origin` debe devolver una línea con `refs/heads/main`.
- Si no aparece, el push no ha llegado: reportarlo y detenerse.

### 8. Tag de la versión

Una vez confirmado el push:

```
git tag v0.20
git push origin v0.20
```

## Criterios de aceptación

- `index.html` sigue siendo byte a byte idéntico al estado inicial.
- Existen `.nojekyll`, `.gitignore` y `README.md` en la raíz, y `specs/` contiene
  los tres ficheros de spec.
- `git status` queda limpio y `main` está sincronizada con `origin/main`.
- `refs/heads/main` aparece en `git ls-remote --heads origin`.
- El tag `v0.20` existe en local y en remoto.

## Fuera de alcance

- No tocar la lógica del juego.
- No añadir herramientas de build, linters, ni gestores de paquetes.
- No crear workflows de GitHub Actions: Pages servirá la rama directamente.
- No instalar ni usar GitHub CLI (`gh`), ni ninguna otra herramienta nueva.
- No intentar configurar GitHub Pages por API: lo hace el usuario desde la web.
- No cambiar la visibilidad del repositorio ni la configuración global de git.

## Reporte final

Al terminar, resume en cuatro líneas: qué ficheros se han creado, el hash del
commit, si el push y el tag han ido bien, y recuérdale al usuario que ahora ya
puede activar Pages en:

Settings → Pages → Source: *Deploy from a branch* → `main` → `/ (root)` → Save.

> Nota sobre caché: Pages sirve con `max-age=600`. Al compartir una versión nueva,
> conviene añadir un parámetro a la URL (`?v=21`) para forzar recarga en los testers.
