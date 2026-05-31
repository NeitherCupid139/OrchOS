#!/bin/bash

# Generate PNG icons from logo.svg
# Requires ImageMagick (brew install imagemagick on macOS)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}]" && pwd)"
SVG_FILE="$SCRIPT_DIR/icons/logo.svg"
ICON_DIR="$SCRIPT_DIR/icons"

if [ ! -f "$SVG_FILE" ]; then
  echo "Error: $SVG_FILE not found"
  exit 1
fi

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
  echo "ImageMagick not found. Install it with:"
  echo "  macOS: brew install imagemagick"
  echo "  Ubuntu: sudo apt-get install imagemagick"
  echo ""
  echo "Or use an online SVG to PNG converter."
  exit 1
fi

# Generate icons
for size in 16 32 48 128; do
  echo "Generating icon-${size}.png..."
  convert -background none -resize ${size}x${size} "$SVG_FILE" "$ICON_DIR/icon-${size}.png"
done

echo "Done! Icons generated in $ICON_DIR"
