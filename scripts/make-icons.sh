#!/usr/bin/env bash
# Génère le logo de l'app et les icônes PWA (outils macOS : sips).
#   assets-src/logo.jpg : bannière 1408×768 « RTЯ Timer » → logo affiché dans l'app
#   assets-src/icon.jpg : carré 1024×1024 « RTЯ Timer »  → icônes PWA, iPhone, favicon
set -euo pipefail
cd "$(dirname "$0")/.."
LOGO=assets-src/logo.jpg
ICON=assets-src/icon.jpg
BG=141A26                      # bleu nuit du fond des images (= fond de l'app)
TMP="$(mktemp -d)"

# Logo affiché dans l'app : zone serrée autour du monogramme (760×460 à partir de x=324, y=250), 600 px de large.
sips -s format png -c 460 760 --cropOffset 250 324 "$LOGO" --out "$TMP/banner.png" >/dev/null
sips -s format jpeg -s formatOptions 85 -Z 600 "$TMP/banner.png" --out src/assets/banner.jpg >/dev/null

# Icônes : l'image carrée telle quelle.
sips -s format png -z 512 512 "$ICON" --out public/pwa-512x512.png >/dev/null
sips -s format png -z 192 192 "$ICON" --out public/pwa-192x192.png >/dev/null
sips -s format png -z 180 180 "$ICON" --out public/apple-touch-icon-180x180.png >/dev/null
sips -s format png -z 64 64   "$ICON" --out public/favicon.png >/dev/null

# Maskable : motif dans la zone sûre (80 %), marges dans la couleur du fond.
sips -s format png -z 410 410 "$ICON" --out "$TMP/inner.png" >/dev/null
sips -p 512 512 --padColor "$BG" "$TMP/inner.png" --out public/maskable-icon-512x512.png >/dev/null

rm -rf "$TMP"
echo "Logo et icônes générés."
