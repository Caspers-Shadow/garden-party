# Garden Party

A quiet, illustrated botanical garden. Choose a specimen from the seed catalogue, plant a meadow, arrange the flowers, and save a botanical print.

## In the garden

- Fourteen illustrated specimens, with variations in petals, foliage, height, and orientation.
- Five garden atmospheres: day, moonlight, sunset, pastel, and antique herbarium.
- Permanent planting by default, plus an optional living mode.
- Automatic saving in the current browser on the current device.
- Move, resize, tilt, remove, and undo changes to your arrangement.
- High resolution PNG export on cream botanical paper or in your garden's colours.
- Optional planting music, gentle motion, and keyboard controls.
- Compact controls for phones and small screens.

## Open locally

Open `index.html` in a modern browser. There is no build step and no JavaScript dependency to install. The garden also runs as a static site on GitHub Pages. Web fonts use Google Fonts when an internet connection is available, with local serif fallbacks.

## Keyboard controls

Focus the meadow, use the arrow keys to position the planting marker, and press Space or Enter to plant. Press **P** for Plant or **E** for Arrange. In Arrange mode, Tab reaches individual specimens; Enter selects one, the arrow keys move it, and Delete removes it. Use **Ctrl/Command + Z** to undo. Size and tilt controls support the keyboard too.

## Saved arrangements

Arrangements and preferences are saved in browser local storage. They stay on the device where the garden was made. Clearing browser data removes the saved arrangement; exporting a print keeps an image copy.

## Project files

- `index.html` — scenery, catalogue, controls, and dialogs.
- `styles.css` and `garden.css` — garden themes, illustration treatment, and responsive layouts.
- `botanicals.js` — original SVG flower drawings and seeded specimen variations.
- `garden.js` — planting, editing, saving, accessibility, and image export.
- `sound.js` and `visitors.js` — optional planting notes and illustrated garden visitors.

## GitHub Pages

Publish the `main` branch from `/ (root)` in the repository's **Settings → Pages**. The `.nojekyll` file keeps the project as plain static files.
