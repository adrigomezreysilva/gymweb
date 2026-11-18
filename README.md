# GymProgress

App web progresiva (PWA) para registrar entrenamientos de gimnasio. HTML + CSS + JavaScript sin dependencias ni compilación. Los datos se guardan en **IndexedDB**, en tu dispositivo.

## Publicar gratis en GitHub Pages
1. Crea un repositorio público en GitHub y sube **el contenido** de esta carpeta (`index.html`, `css/`, `js/`, `icons/`, `manifest.json`, `sw.js`).
2. En el repositorio: **Settings → Pages → Build and deployment → Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. En 1-2 minutos tendrás la URL `https://TU-USUARIO.github.io/NOMBRE-REPO/`. Funciona en una subcarpeta porque todas las rutas son relativas.

## Instalar en iPhone
Abre la URL en **Safari** → botón Compartir → **Añadir a pantalla de inicio**. Se abre a pantalla completa y funciona sin conexión tras la primera carga.

## Compartir con un amigo
Envíale la URL. Cada dispositivo guarda sus propios datos locales; no hay registro ni cuentas ni sincronización entre dispositivos.

## Copias de seguridad
**Más → Copia de seguridad** permite exportar e importar un `.json` (se valida el archivo y se pide confirmación antes de sobrescribir). Haz copias con frecuencia: si se borran los datos del navegador, se pierden los datos locales.

## Actualizar la app
Tras cambiar archivos, sube el número de `V` en `sw.js` (por ejemplo `gymprogress-v2`) para que los dispositivos descarguen la nueva versión.

## Probar en local
`python3 -m http.server 8000` y abre `http://localhost:8000` (el service worker requiere HTTPS o localhost).

## Limitaciones conocidas
- No hay vídeos: no se han podido verificar fuentes fiables, así que las fichas de técnica muestran texto y un mapa muscular orientativo.
- Las fichas de «Máquina de la esquina», «Polea rara (balda)» y las máquinas de espalda son genéricas.
- Las gráficas están dibujadas con SVG propio (sin Chart.js) para funcionar sin conexión.
- Sin sincronización en la nube.
