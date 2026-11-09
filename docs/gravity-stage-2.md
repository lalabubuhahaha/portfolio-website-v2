# Gravity Edition — Stage 2

## Source and scope

The complete supplied GetLayers “Gravity — Digital Studio” specification is the mathematical source, especially scroll progress, gradient stages, palettes, heart targets, scatter, simulation, collision/wall response, resize and fixed parameters. Stage 1 remains the foundation. No new dependencies, loader, drawer, modal, footer redesign, Supabase, Admin, detail pages or Stage 3 work is included.

## One persistent scene

`GravityStory` owns four 100svh sections and one sticky viewport. `GravityScene` is dynamically loaded without SSR once. The same renderer, camera, geometry, materials and ball array span Hero → Drop → Shape → Release. The viewport stays pinned inside the story, then scrolls away before the retained About placeholder / featured listing. The header, LALA Hero copy and clear text band are retained; the same canvas smoothly expands from the Hero visual band to the full viewport using the Hero factor, with ResizeObserver updating its projection and bounds. This changes framing, not the physics equations or mesh identities. The Hero's scroll cue now targets Drop.

`control = { progress, started }` belongs to the Three.js controller, not React state. Passive scroll/resize events schedule one rAF to set `progress = window.scrollY / (window.innerHeight || 1)` and the background stage. The entrance starts once after scene warmup; changing scroll, viewport size or motion preference does not replay scatter or recreate the renderer. ResizeObserver updates the camera, renderer and heart targets. Initial count is 96 desktop / 54 mobile; the existing array is intentionally retained across later breakpoint changes.

The original mode equations and thresholds are used unchanged:

- Hero: `1 - smoothstep(0.30, 0.80, progress)`.
- Drop: `smoothstep(0.40, 0.95, progress) * (1 - smoothstep(1.25, 1.75, progress))`.
- Shape: `smoothstep(1.40, 2.05, progress) * (1 - smoothstep(2.55, 3.0, progress))`.
- Release: `smoothstep(2.7, 3.45, progress)`.

The solver keeps the original order: blended acceleration / velocity damping / position integration / color, opacity and visual scale / four pairwise collision passes / walls and floor / mesh transforms. Drop gravity is `0.011 * dropF`, floor restitution `0.30 + 0.35 * dropF`, base damping 0.91, rebound −0.3 and bounciness 0.02. The full original damping blends, collision scale and wall release thresholds are retained.

Heart targets use rejection sampling of `(x²+y²−1)³−x²y³ <= 0`, original S/baseCY/shapeScale and random Z depth; targets are reassigned on resize. Individual spheres remain physical and respond to the pointer. Soft collisions mean settled spheres need not exactly coincide with their targets.

Release uses the original per-ball golden-ratio stagger, forward/outward acceleration and camera-depth opacity. There is no canvas opacity fade. Palette roles remain separate, with `THREE.Color.lerp` using the original lime and pink smoothsteps; physical glass/matte properties remain intact. Blue/lime/pink backgrounds use the exact gradients and >0.7 / >1.55 boundaries. Three gradient layers crossfade over the specified 1.2s easing, because native gradient-to-gradient background interpolation is not reliably smooth.

## Stability and accessibility adaptations

- Retain Stage 1's fixed 60Hz physics with bounded catch-up, and its 2.2-second entrance containment delay. This allows actual far-offscreen entry instead of an immediate wall clamp.
- Fully faded particles past `cameraZ + 3`, with release active and no competing attraction, stop accelerating. This prevents unbounded invisible coordinates during long holds; original forces/walls resume when returning to earlier modes. No particle is replaced and no second entrance is triggered.
- Reduced Motion shows settled static poses for the nearest phase. It computes a bounded offline settling pass on phase/preference/size changes, then draws once. No perpetual rAF, pointer repulsion or gradient transition runs in this mode. This is intentionally a static alternative rather than a flight animation.
- The static SVG remains available before JS, without WebGL and after context loss. Native scrolling is retained; no wheel interception or smooth-scroll dependency is added.
- Main simulation pauses outside the story or when the page is hidden. Both animation and scroll-update rAFs, observers, event listeners, shadow map, materials, geometry, renderer and context are cleaned up on unmount.

## Checks

Run `npm run typecheck`, `npm run lint`, `npm run test:gravity`, `npm run build`.

The physics tests cover Hero convergence/repulsion, 1440px and 390px four-phase sequences, falling/settling, implicit heart targets and convergence, material color changes, per-particle forward flight/fade, a long release hold, reverse heart/Hero recovery, unchanged particle/material/geometry identities during resize, and exact floor restitution.

Browser verification uses actual Chromium WebGL with SwiftShader, not a mocked renderer. Desktop and mobile tests check all phases and upward recovery, gradient stages, a single unchanged canvas/context across scrolling and resizing, no overflow, Reduced Motion stopping recurring frames, normal access to featured work, `/work` filtering, route teardown and WebGL-unavailable fallback. Software rendering is not a physical-device performance benchmark; real phone GPU/thermal/battery behavior and a 60fps guarantee remain unverified. Existing Stage 0 detail-link prefetch 404s remain; detail pages are out of scope.
