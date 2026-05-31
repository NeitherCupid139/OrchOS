#!/usr/bin/env node

/**
 * Generate PNG icons from logo.svg using sharp
 * Run: node generate-icons.mjs
 */

import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SVG_FILE = join(__dirname, "icons/logo.svg");
const ICON_DIR = join(__dirname, "icons");

async function generateIcons() {
  try {
    // Try to use sharp if available
    const sharp = (await import("sharp")).default;

    const sizes = [16, 32, 48, 128];

    for (const size of sizes) {
      console.log(`Generating icon-${size}.png...`);
      await sharp(SVG_FILE)
        .resize(size, size)
        .png()
        .toFile(join(ICON_DIR, `icon-${size}.png`));
    }

    console.log("Done! Icons generated in", ICON_DIR);
  } catch (error) {
    if (error.code === "ERR_MODULE_NOT_FOUND") {
      console.log("sharp not found. Install it with: npm install sharp");
      console.log("Or use the shell script: ./generate-icons.sh");
    } else {
      console.error("Error:", error.message);
    }
  }
}

generateIcons();
