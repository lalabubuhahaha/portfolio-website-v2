# Stage 6 — Interactive Elastic Portrait

## Scope and reference

About-only portrait, based on remote `b9058b01b5e6bda5e44b0da77c6d45dbe35d2b14` on `feat/independent-foundation`. Header, footer, home Gravity code, Work and content layer are unchanged. No new dependencies or external services.

The supplied MOV is the interaction reference, and the supplied public English description is partial design/technical documentation, not original source code. The reference was decoded across its complete timeline into sequential frames. It shows localized horizontal, vertical and diagonal pulls, tightly pinned framing, a strained expression during deformation, a short spring recovery and a changed resting expression. Its black product page, violet glow, typography and product copy are deliberately excluded from this About implementation.

## Supplied image manifest

All eleven named source PNGs are 1254×1254. `public/images/about/faces/face00.png` is a byte-for-byte copy of the supplied original; WebP copies use quality 90. No additional faces were generated.

| ID | Actual expression | Role |
| --- | --- | --- |
| face00 | Natural, relaxed, closed lips | Initial / reset / fallback |
| face01 | One eye narrowed | Mood |
| face02 | Tense, teeth showing | Main grimace |
| face03 | Skeptical frown | Mood |
| face04 | Concerned, lips parted | Mood |
| face05 | Lips pressed together | Mood |
| face06 | Narrow-eyed, doubtful | Mood |
| face07 | Pursed lips | Mood |
| face08 | Wide-eyed surprise | Mood |
| face09 | Open-mouth astonishment | Mood |
| face10 | Quiet, closed lips | Mood |

The machine-readable manifest is `components/about/portrait-moods.ts`. It includes image path, expression, role and alignment data. Inspection of full frames and enlarged facial crops found a shared framing/eye-line; identity scale/rotation/translation is retained rather than changing the natural expression geometry. This is manual registration, not automated facial landmark fitting. All textures use the same square UV frame. A feathered elliptical face mask centered at UV (0.548, 0.584), radii (0.157, 0.195), limits changes to the face. The original image remains the fixed background, hair and clothing base, reducing shoulder/hair jumps. The face textures can still contain small differences in lighting and jaw shape.

A shared luminance/chroma matte lifts the low-chroma studio grey toward the existing page background while preserving dark hair/clothes and skin colour. This is a conservative shader matte, not a generated cutout. A common soft edge mask blends the frame into the page; fine hair halos remain a visual-review item. The no-WebGL fallback retains the original image and edge feathering without shader background correction.

## Inverse warp and pinning

The fragment shader integrates a smooth stationary velocity field backward for each output pixel (12 midpoint steps). The associated forward flow is the forward deformation; reversing the field gives the inverse texture lookup. A Gaussian around the actual grab coordinate multiplies the drag vector. Four smooth boundary ramps reduce the field to exactly zero on frame edges. A bounded vector and smooth flow avoid the holes and repeated features associated with forward splatting and coarse vertex displacement. The render plane is just a full-screen quad; deformation happens in fragment UV lookup.

The portrait is always square, so normalized coordinates have equal horizontal/vertical scale. All pointer coordinates are converted using its actual DOM rectangle and inverted Y. Sampling is bounded to the texture; the shader emits opaque pixels. Numerical tests check positive inverse-map Jacobians across interior grid points, extreme vectors, near-edge grabs, and exact boundary pinning. These are useful stability checks, not a formal proof for every floating-point driver.

## Physics, switching and performance

Tunable constants live in `portrait-physics.ts`:

- Radius 0.32 of frame width; drag-follow rate 19/s.
- Linear drag to 0.40, then continuous exponential rubber band with 0.16 tail, asymptotically bounded at 0.56.
- Spring stiffness 190; damping 23; reduced-motion damping 30.
- Spring substeps at most 1/240s; frame delta capped at 0.05s after stalls.
- At most one small overshoot; settling thresholds 0.0008 displacement and 0.012 speed, hard stop at 0.8 simulation seconds.
- Grimace enters above 0.13 drag and exits below 0.09 (hysteresis); blend time constant 0.075s.
- Release first makes the grimace fully opaque, changes the hidden mood, then fades the cover over 0.11s while speed exceeds 0.55, or after 0.16s as a safety bound.
- Directional blur strength 0.003, three taps only during return; no blur or overshoot with reduced motion.
- DPR capped at 1.5; longest rendered dimension capped at 768 pixels. All eleven textures preload once and are reused. Idle rendering stops; hidden tabs pause.

State flow: IDLE → GRABBED → DRAGGING ↔ GRIMACE → RELEASING → SETTLING → IDLE. Small taps/cancel keep the current mood. A deterministic rotating bag visits every non-grimace mood without immediate repeats. Face00 is initial/reset/fallback, not forced after each pull. A texture change occurs behind an opaque grimace without resetting warp, then the new mood emerges during return.

Renderer lifecycle is independent from the home scene. The module loads dynamically in a client effect; cancelled effects do not create competing renderers. Context loss reveals the static image and resets physics. The cached context-control extension supports a real loss/restore test; restoration reuploads textures and refreshes the material. Route exit releases renderer, textures, material, geometry, observers, event listeners and animation callbacks. A failed preload disposes successful partial loads and keeps the static portrait.

## Layout and interaction

Desktop uses the existing light Editorial design with a shared 40/60 grid, Raleway heading and mono labels; portrait height adapts to short screens. Mobile stacks text above a nearly full-width square portrait. Existing About/Expertise remains below. Only the canvas consumes touch gestures; surrounding content can scroll. Pointer capture handles movement outside the image, cancel and lost capture. Arrow keys pull; release springs back; Escape and Reset restore face00. The first meaningful drag hides the hint.

## Reproducing validation

Use Node.js 24 and `npm ci`. Start development with `npm run dev -- --hostname localhost --port 3000`; use the matching `http://localhost:3000` origin for browser tests. A mismatched `127.0.0.1` dev origin is rejected by this Next.js version's HMR protection.

`/about?rec` exposes `window.__sim` in development only: `down(x,y)`, `move(x,y)`, `up(cancel)`, `step(seconds)`, `state()`, `reset()`, `loseContext()`, `restoreContext()`. In recording mode the normal animation clock is disabled; fixed steps drive exactly the same physics and rendering. Production does not expose this interface even with `?rec`. There is no debug UI.

Browser scripts accept `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, `PORTRAIT_ORIGIN`; the recording script also accepts `PORTRAIT_OUTPUT`. Defaults match this cloud image's existing browser tools. Playwright's recorder needs ffmpeg. This run used the system `/usr/bin/ffmpeg` via a local Playwright ffmpeg path, not an additional repository dependency:

```sh
mkdir -p /workspace/.portrait-playwright/ffmpeg-1011
ln -sf /usr/bin/ffmpeg /workspace/.portrait-playwright/ffmpeg-1011/ffmpeg-linux
PLAYWRIGHT_BROWSERS_PATH=/workspace/.portrait-playwright node scripts/portrait-browser.mjs
node scripts/portrait-interaction-checks.mjs
```

The recording includes fixed-step horizontal, vertical and diagonal interactions, followed by three real browser mouse drags. These are browser-automated pointer inputs, not a human usability study. The additional script sends actual CDP touch events, tests cancel, outside scrolling, keyboard, texture failure and measures active-drag rAF timing. Screenshots, recordings and JSON results accompany this report.

## Differences and remaining review

This is an independently implemented smooth-flow warp, not the original unknown shader. The supplied Lala portrait has a three-quarter pose and long hair; the reference is frontal with short hair. Our fixed face blending intentionally moves less background/hair during expression changes. The backdrop is light and softly keyed; fallback has the original grey backdrop. The deterministic bag uses nine resting moods and one dedicated grimace instead of ten interchangeable moods. Motion blur is intentionally subtle and spring constants are project choices, not claimed original values.

Software WebGL capture timing is not representative of a hardware GPU. Physical iOS/Android devices, Safari/WebKit, and a human's subjective hand-feel still require manual acceptance. No claim of universal 60 FPS or pixel-identical Nocelle timing is made.

## Recorded validation results

- `npm run typecheck`, `npm run lint`, `npm run build`: passed.
- `npm run test:gravity`: 27 passed, 0 failed, 0 skipped.
- `npm run test:portrait`: 6 passed, 0 failed, 0 skipped.
- Browser recording suite: 15 completed checks, zero captured console/page errors. Includes real context loss/restore and all six requested viewports.
- Additional interaction suite: real touch/cancel, outside scroll, keyboard pull, route exit and texture failure fallback passed.
- Production smoke: About WebGL initializes, Reset works, `/`, `/work`, `/about` return 200, and `?rec` does not expose `window.__sim`.
- Active-drag software WebGL sample: 59 measured rAF intervals, mean 80.8ms, p95 150ms (approximately 12.4 FPS from mean interval). This cloud software-rendering result is a performance limitation, not a hardware/mobile benchmark.
- Saved MP4 was decoded and inspected as sequential frames; the 31-second MP4 also played to completion in Chromium without media errors. Video contains real browser output, not an animation mockup or still-image substitute.

Artifacts: [interaction recording](validation/portrait-stage-6/interaction.mp4), [desktop](validation/portrait-stage-6/layout-1440.png), [mobile](validation/portrait-stage-6/layout-390.png), [browser results](validation/portrait-stage-6/browser-results.json), [additional checks and timing](validation/portrait-stage-6/interaction-checks.json).

Changed files: `app/about/page.tsx`; `package.json` (test command only); `components/about/{interactive-portrait.tsx,portrait-renderer.ts,portrait-shaders.ts,portrait-physics.ts,portrait-moods.ts,portrait.css}`; `public/images/about/faces/` (11 WebP images plus preserved face00 PNG); `tests/portrait.test.mjs`; `scripts/portrait-browser.mjs`; `scripts/portrait-interaction-checks.mjs`; this report and `docs/validation/portrait-stage-6/` artifacts.

Client-side navigation during delayed texture preload was checked: the active portrait/controller is removed when leaving About and the cached route can reactivate. Next.js may retain hidden route DOM; absence of a canvas node is therefore not used as the only cleanup criterion.
