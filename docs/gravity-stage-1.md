# Lala Portfolio — Gravity Edition, Stage 1

## Scope and source

Built from the user-supplied complete “Gravity — Digital Studio” GetLayers specification (A), with the user's Next.js / Lala Stage 1 instructions (B) taking precedence for architecture, content and scope. This is not a single HTML recreation. No Stage 2–5 scroll effects, heart shape, fly-away, palette drawer, global loader, smooth-scroll interception, footer redesign, Supabase or Admin are included.

The original repository is unchanged. Stage 0 data queries, records, images and roadmap remain unchanged. Original AGENTS.md rules are retained; Next.js dev automatically appended its version-specific agent guidance. `/work` and its URL filters are retained. `/work/[slug]` is still unimplemented as in Stage 0; Next.js prefetches of those card destinations return 404. About links to an explicitly marked introduction placeholder on the homepage, not a new About page.

## Files and ownership

- `components/gravity/gravity-hero.tsx`: client shell, `next/dynamic` with `ssr: false`, accessible HTML content and inline static SVG fallback. Recreates the scene only when crossing the mobile breakpoint.
- `components/gravity/gravity-scene.tsx`: one effect owns renderer/canvas, fixed-step rAF, pointer data, resize/intersection observers, visibility/reduced-motion handling and teardown. Pointer updates do not use React state. Every listener and observer is removed; geometry/materials/shadow map/renderer/context are disposed on teardown.
- `components/gravity/gravity-world.ts`: Three.js scene setup and the original Hero physics math, isolated from React.
- `components/site-header.tsx`: LALA, Work and About; no fictional studio navigation or inactive palette controls.
- `app/globals.css`: design tokens, Royal Blue radial background, glass navigation, responsive Hero, staged content entrance and reduced-motion rules.
- `app/layout.tsx`, `app/page.tsx`: shared header, metadata, self-hosted fonts and Hero integration; existing featured-work cards retained below the Hero.
- `package.json`, `package-lock.json`: official `three@0.160.1`, matching `@types/three`, and self-hosted variable Raleway / JetBrains Mono / Space Grotesk fonts. No animation library, CDN importmap, runtime Google Fonts request or external tracking.
- `tests/gravity-world.test.mjs`: physical geometry/material/mass, desktop/mobile counts, convergence, finite simulation and pointer-impulse regression test.

## Fidelity and deliberate Stage 1 adaptations

Camera FOV 38, position (0,0,11), ACESFilmic tone mapping, exposure 1.15, DPR capped at 2. Original hemisphere, key, rim, front and bounce lights retained, including 2048 shadow map and PCFSoft shadows. Shared SphereGeometry(1,48,48); 96 desktop / 54 mobile spheres. Radii follow 30% small, 50% medium and 20% large distributions; mass is radius cubed. Glass probability is 0.22; matte palette split is 25% pearl, 30% light, 30% royal, 15% deep. All specified physical material settings are retained, including glass transmission 0.95, IOR 1.485 and thickness 2.2.

The original scatter, 2.2-second attraction boost 7.5→1, anisotropic center forces, damping 0.91, weak floating, four pairwise collision passes and wall response are retained. Hero mode is fixed to `heroF=1`; later-stage branches are omitted. Mouse projection uses the actual canvas container, radius 4.4, force 0.05, speed boost 1+speed×3.2 (speed capped at 3); pointer-down multiplies radius by 1.4 and force by 1.7. Touch press/move can interact, but content never depends on hover.

Differences from the full single-page specification:

- Warm the scene, then trigger scatter immediately; no PageLoader.
- The canvas is contained within the Hero's upper visual band rather than fixed across future sections. This reserves the bottom text band on desktop and mobile and prevents the new Hero from covering the retained work listing.
- Delay wall containment until the 2.2-second entrance finishes so far-scattered positions are not immediately clamped to viewport walls. Retain the specified boundary response afterward.
- Run the supplied per-frame physics at fixed 60Hz, with at most three catch-up steps per frame; pause offscreen or when the document is hidden. On a slow GPU the simulation deliberately slows rather than performing unbounded catch-up work.
- Reduced Motion pre-settles the physical scene and renders a static WebGL frame, without perpetual rAF or pointer repulsion. Without WebGL, after context loss, or before client startup, show an inline static SVG. The SVG is only the fallback, not the primary sphere renderer.
- Mobile retains 54 spheres and the full geometry/glass/shadow quality. No unmeasured adaptive quality downgrade is applied.
- Header uses only LALA, Work and About. Personal copy is explicitly labelled as an introduction placeholder; no invented clients or results.

## Validation

Commands: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:gravity`.

Chromium with SwiftShader was used for actual WebGL checks at 1440×900 and 390×844. Verified scene readiness, counts 96/54, one mounted canvas, no horizontal overflow, visual band separated from text, material rendering in screenshots, visible pointer repulsion, Reduced Motion stopping the recurring rAF, static fallback with WebGL disabled, working `/work` URL categories, and repeated homepage/work navigation removing/recreating the canvas. No hydration or uncaught JavaScript errors were observed. Expected Stage 0 detail-link prefetch 404s remain distinct from those errors.

Development Strict Mode and responsive breakpoint reinitialization 96→54→96 passed with one canvas and no page errors. An instrumented navigation check confirmed zero pending rAF callbacks and zero retained Gravity window pointer/breakpoint listeners after leaving the homepage. Browser tests use temporary external Playwright tooling; it is not added to application dependencies.

Limitations: software rendering validates behavior and layout, not actual phone GPU throughput, battery use, thermal behavior, or a 60fps guarantee. Physical-device performance testing is still required. Fidelity is assessed against the supplied written specification; no original rendered reference site was provided. Stage 2 remains unimplemented.
