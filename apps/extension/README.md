# OrchOS Chrome Extension

A Chrome extension that opens OrchOS dashboard in a side panel.

## Installation (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `apps/extension` directory

## Configuration

Edit `sidepanel.js` to change the dashboard URL:

```javascript
// For local development:
const DEV_URL = "http://localhost:3000/dashboard";
// For production (update this after deploying):
const PROD_URL = "https://your-orchos-domain.com/dashboard";

// Change this to PROD_URL for production
const ORCHOS_URL = DEV_URL;
```

## Icons

The extension uses icons from `icons/` directory. To generate PNG icons from the SVG:

1. Install ImageMagick or use an online converter
2. Convert `icons/logo.svg` to PNG sizes: 16, 32, 48, 128
3. Save as `icons/icon-{size}.png`

Or use the favicon.ico provided.

## Usage

- Click the OrchOS icon in the toolbar to open the side panel
- The dashboard loads directly (no homepage)
- All web app features work in the side panel
