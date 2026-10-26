# Protecting Our Planet — NGO Website

An immersive, nature-inspired redesign of the **Protecting Our Planet** NGO micro-project site. It began as a diploma project built with HTML, CSS and Bootstrap; this version keeps the original content while rebuilding the visual experience.

The original purpose, organisation identity, mission and vision, eight ongoing projects, ten ways to get involved, updates, volunteer form and donation link have been preserved. The visual layer has been rebuilt around a living forest: a scroll-linked Three.js scene, an editorial horizontal project journey, organic hover motion and a clear path to taking action.

**Live site:** https://salunkhesmit.github.io/ngoweb/

## Run locally

The site is static — there is no build step and no package installation required.

```bash
python3 -m http.server 4173
```

Then open <http://127.0.0.1:4173>. A local server is needed because the JavaScript is loaded as native ES modules.

## Structure

```text
index.html                 All page content and project stories
css/styles.css             Design system, layout, motion and responsive rules
js/main.js                 Navigation, reveals, counters, horizontal scrolling, dialogs
js/forest-scene.js         Three.js forest scene and scroll-linked camera
assets/fonts/              Self-hosted Fraunces and Manrope (SIL Open Font License)
assets/images/             Optimised WebP photography
assets/vendor/             Vendored Three.js module build and MIT licence
```

## Implementation notes

- **Hero:** a procedural low-poly pine forest with fog, sunlight, floating dust and pointer parallax. The camera moves through the scene with scroll progress. The renderer pauses when the hero is off screen or the tab is hidden.
- **Fallbacks:** a forest photograph sits behind the canvas and remains visible if WebGL is unavailable. Scroll reveals are applied only after the observer is attached, so content stays visible without JavaScript. A small `noscript` layout keeps the project journey readable without scripting.
- **Horizontal projects:** desktop uses a pinned track translated by vertical scroll; tablet and mobile fall back to a native horizontal scroll area with snap points. The pinned layout is also disabled for `prefers-reduced-motion`.
- **Project stories:** each panel opens a native `<dialog>` with the full original description, close button, Escape support and focus restoration.
- **Interaction:** pointer tilt on images, organic image masks, animated navigation underlines, button wipes and scroll-triggered reveals. Hover-only effects have non-hover equivalents or are decorative.
- **Accessibility:** skip link, keyboard-accessible navigation and dialogs, labelled controls, decorative SVGs hidden from assistive technology, readable contrast and reduced-motion support.
- **Content discipline:** no new impact figures, testimonials or partnerships were invented. The displayed “8 projects / 10 ways / 1 mission” figures are counts of the existing content.

## Existing integrations

These are the original destinations, unchanged:

- Volunteer sign-up: Google Forms
- Donate: PayPal (`hosted_button_id=PROTECTING_OUR_PLANET`)
- Updates: rewild.org press links

The PayPal campaign can only be verified up to the destination URL; completing a donation was not tested.

## Credits

- Forest scene: [Three.js](https://threejs.org/), MIT licensed (see `assets/vendor/THREE-LICENSE.txt`).
- Typefaces: [Fraunces](https://fonts.google.com/specimen/Fraunces) and [Manrope](https://fonts.google.com/specimen/Manrope), SIL Open Font License (see `assets/fonts`).
- Photography: Unsplash contributors, used under the Unsplash licence.
