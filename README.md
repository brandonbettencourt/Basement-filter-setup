# Basement-filter-setup
# Basement filtration viewer

An interactive Three.js model of a Pentair Everpure QC7I twin-manifold installation with a three-valve bypass.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Drag to orbit, right-drag or use two fingers to pan, and scroll or pinch to zoom. The camera buttons reset the view and the Dimensions button toggles measurement lines. Normal service starts at 58 PSI. Bypass / filter swap opens the bypass bridge, isolates the loop, and animates pressure relief through the flush valve before settling at 0 PSI. Pressure and flow are illustrative.

The manifold ports are modeled at 48 inches above the floor. The bypass bridge is 60 inches above the floor. The 3-inch callout marks the cartridge removal envelope. Hardware profiles, thread detail, and cartridge graphics were created from the supplied description. Confirm physical fitting lengths and manifold port offsets on the actual hardware before using the rendering for fabrication.

## Deploy

For **GitHub Pages**, put this project at the root of a repository on the main branch and select **GitHub Actions** under **Settings → Pages → Build and deployment**. Run the included workflow from the Actions tab or push to main.

For **Cloudflare Pages**, use `npm run build` as the build command and `dist` as the output directory, or upload the built directory directly. The build uses relative assets and requires no backend.
