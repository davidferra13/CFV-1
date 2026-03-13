#!/usr/bin/env bash
# Download all free pixel art assets for Pixel Kitchen
# All assets are free for commercial use. See CREDITS.md for attribution.
set -e

ASSETS_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ASSETS_DIR"

echo "Downloading Pixel Kitchen assets..."

# Kenney Pixel UI Pack (CC0)
echo "[1/4] Kenney Pixel UI Pack..."
curl -sL -o /tmp/kenney_ui.zip "https://kenney.nl/media/pages/assets/pixel-ui-pack/38633c7bb8-1677661508/kenney_pixel-ui-pack.zip"
unzip -qo /tmp/kenney_ui.zip -d ui/

# Kenney Pixel Food Expansion (CC0)
echo "[2/4] Kenney Pixel Food Expansion..."
curl -sL -o /tmp/kenney_food.zip "https://kenney.nl/media/pages/assets/pixel-platformer-food-expansion/058b90cca3-1696596511/kenney_pixel-platformer-food-expansion.zip"
unzip -qo /tmp/kenney_food.zip -d sprites/food/

# Kenney Particle Pack (CC0)
echo "[3/4] Kenney Particle Pack..."
curl -sL -o /tmp/kenney_particles.zip "https://kenney.nl/media/pages/assets/particle-pack/1dd3d4cbe2-1677578741/kenney_particle-pack.zip"
unzip -qo /tmp/kenney_particles.zip -d effects/

# LPC Flames (CC-BY 3.0, Sharm)
echo "[4/4] LPC Flame Animation..."
curl -sL -o /tmp/flames.zip "https://opengameart.org/sites/default/files/flames_0.zip"
mkdir -p effects/flames
unzip -qo /tmp/flames.zip -d effects/flames/

# OpenGameArt InkMammoth Food Pack (GPL 2.0)
echo "[bonus] InkMammoth Food Pack..."
curl -sL -o /tmp/food_extra.zip "https://opengameart.org/sites/default/files/Food%20Pack%201%20-%20InkMammoth%20PW.zip"
mkdir -p sprites/food-extra
unzip -qo /tmp/food_extra.zip -d sprites/food-extra/

# Cleanup
rm -f /tmp/kenney_ui.zip /tmp/kenney_food.zip /tmp/kenney_particles.zip /tmp/flames.zip /tmp/food_extra.zip

echo "Done! $(find . -type f -name '*.png' | wc -l) PNG assets downloaded."
echo "See CREDITS.md for attribution details."
