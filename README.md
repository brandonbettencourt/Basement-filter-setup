# Basement-filter-setup
# Basement filtration viewer

Interactive Three.js models for two separate areas of the basement water filtration system:

- **Drinking loop (`index.html`)**: Pentair Everpure QC7I twin-manifold installation with a three-valve bypass on ¾″ Type L copper.
- **Whole-house POE (`whole-house.html`)**: Full-flow 1.25″ point-of-entry system with a 3-valve "H" bypass, wall-mounted Pentek 150235 20″ Big Blue sediment pre-filter (DGD-5005-20 on Pentair 150061 L-bracket), floor-standing IPW WS 1.25 (13″×54″ catalytic carbon tank + Clack WS1.25 valve), dual 0–100 PSI gauges, 1/2″ boiler drain sample port, 30″ straight future UV space, and ceiling-routed PEX backwash drain into an Eco-Tech DLA-G20 air gap atop a 2″ trapped and vented PVC standpipe.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Use the top navigation bar to switch between **Drinking loop** and **Whole-house POE**. Drag to orbit, right-drag or use two fingers to pan, and scroll or pinch to zoom. The camera buttons reset the view and the Dimensions button toggles measurement lines and clearance envelopes. Pressure and flow animations are illustrative.

Confirm physical fitting lengths, valve dimensions, and manifold port offsets on the actual hardware before using the renderings for fabrication.

## Deploy

For **GitHub Pages**, put this project at the root of a repository on the main branch and select **GitHub Actions** under **Settings → Pages → Build and deployment**. Run the included workflow from the Actions tab or push to main.

For **Cloudflare Pages**, use `npm run build` as the build command and `dist` as the output directory, or upload the built directory directly. The build uses relative assets and requires no backend.
