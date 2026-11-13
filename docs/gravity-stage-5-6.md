# Gravity Edition — Stage 5.6: Sphere Jitter & Physics Stability

Baseline: remote `feat/independent-foundation` at `3fd339979d24a25c121eb8a7d60e04c00d27ff85`. No layout, content, material, camera, geometry or presentation changes.

## Diagnosis before changing the solver

The seeded experiment starts the actual `createGravityWorld` with 96 desktop / 54 mobile spheres. It advances 600 Hero steps, selects progress 0 / 1 / 2.2, allows 1200 steps to settle, then records **180 consecutive 60 Hz simulation steps**. Seed 560 and a 900px container height are identical before and after. Each selected trace records position and velocity XYZ, the external velocity increment before damping, overlapping contact-pass count, signed mass-weighted pair correction XYZ, boundary contact and progress. Counts are solver contact visits, not unique impact events. Raw traces and statistics are in `docs/validation/gravity-stage-5-6-{before,after}.json`.

A high-frequency case means more than 30 full 3D displacement reversals in 180 steps; a reversal requires adjacent displacement dot product < −1e−10 to exclude floating point noise. This distinguishes small alternating movement from slow smooth turns. The metric is deliberately separate from total travel: slow Hero drift is desirable. It is a diagnostic definition, not a universal perceptual threshold.

The baseline reproduced category C (physical contact chatter) in all three modes. It is not merely category D (display transforms): position arrays change direction repeatedly even with a renderer stub. Repeated real presentation updates with fixed physical positions are also covered by a render-only regression. `meshGroup.position` copies the solver once per step; rolling rotation is derived from that displacement. `displayAnchor` and presentation are deterministic transforms of position, viewport and progress; their equations are unchanged.

The pair solver projects overlapping positions four times, but originally left velocities inconsistent with the projected positions. Attraction/gravity therefore pushed back into the same contacts on the next step, with full restitution impulses applied repeatedly. Heart reduced positional correction by 93% but did not similarly reduce collision impulses: target attraction and contact impulses kept competing. In Drop, the floor was applied only after all pair passes, undoing support relationships before the next step; gravity also triggered restitution for arbitrarily small downward speeds.

Controlled ablations confirmed the causes: velocity reconciliation removed Hero chatter, but leaving the floor outside the contact iterations left Drop chatter. Solving support in those iterations removed Drop chatter. Heart required blending impulses with the existing shape factor as well. Mass remains radius cubed; inverse-mass ratios were correct. Four passes are solver iterations, not four force integrations. The scene's single rAF accumulator still integrates external forces once per fixed 1/60 second, capped at three catch-up steps. No second update loop or rendering interpolation was added.

## Targeted stabilization and deviations from GetLayers

- Carry the net positional constraint correction back into velocity after the four contact passes. Reuse scratch vectors; there are no new per-frame particle allocations outside opt-in diagnostics.
- Include floor support in each existing contact iteration, then retain the final wall/floor guard. Preserve energetic floor impacts using the incoming velocity and original restitution.
- Apply sphere restitution only for approaching normal speeds above 0.02 world units/step; scale its impulse by `1 − shapeF`, matching Heart's intentionally softened contacts. Slow contacts still receive positional and velocity constraint corrections. No velocity vector is globally clamped to zero.
- At floor contact, use a 0.025 world units/step restitution cutoff (greater than one damped gravity step, about 0.0109). A low-energy downward floor-normal velocity is supported rather than bounced. This does not zero tangential or upward velocity, and does not sleep a particle.

These are explicit deviations from the original collision response and solve order. Numeric gravity 0.011, center attraction 0.0035 and anisotropic factors, spring 0.06, all damping blends, bounciness 0.02 for real impacts, floor restitution 0.30–0.65, mass ratios, collision positional scale 0.28 and its shape/release blend, pointer radius/force/momentum and floating forces remain unchanged. There is no scene-wide slowdown, sleep/wake state, target reassignment, canvas fade, renderer/mesh recreation or entrance replay. Pointer and mode changes continue to apply forces every step, including to resting spheres.

## Reproduction

Run `npm run test:gravity`, then `node scripts/gravity-stability-metrics.mjs /tmp/stability.json` for deterministic settled traces. Existing bounce, mass/momentum, pointer, reverse-mode, palette, canvas continuity, responsive framing and circular projection tests are retained. New tests cover all three settled modes at both widths, continued Hero drift, pointer/mode responsiveness and render-only invariance.

For browser validation, start `npm run dev -- --hostname 0.0.0.0 --port 3000`, then `node scripts/gravity-browser-stability.mjs after`. It uses the cloud-provided Playwright and Chromium (override their paths with `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` if needed), opts into `?gravity-debug=1` telemetry and selects Full motion so automatic low-FPS fallback cannot hide simulation. It observes Hero, Drop, Heart, Heart→Hero and a fast pointer sweep at both 1440×900 and 390×900. Each recording lasts at least 10 real seconds and includes 180 simulation steps. Browser records include transitions; the separate 1200-step warmup experiment above measures settled chatter. Software WebGL timing is slower than the 60 Hz simulation clock because the existing catch-up cap remains in place.

Browser JSON is written under `/tmp`; selected traces, continuity evidence and summaries are retained with the validation artifacts. Screenshots are taken at each stage. Physical GPU behavior and subjective collision feel still require human visual acceptance. SwiftShader is a real WebGL path, not verification of a physical GPU. The UI and rendering complexity have not been reduced for these checks (DPR 0.5 is a test device setting; production DPR behavior is unchanged).

## Settled solver results

All values below are measured, not display smoothing. Position is in world units and velocity in world units per 60 Hz step. The reference ID is held constant across the comparison.

| Width / mode | Reference ID | Jittering spheres | Reference reversals | Max step displacement | Max velocity change |
| --- | --- | --- | --- | --- | --- |
| 1440 hero | 21 | 94 → 0 | 173 → 0 | 4.167e-3 → 4.387e-3 | 9.684e-3 → 5.275e-4 |
| 1440 drop | 18 | 86 → 0 | 178 → 0 | 2.928e-3 → 1.861e-15 | 1.251e-2 → 9.810e-16 |
| 1440 heart | 32 | 95 → 0 | 153 → 0 | 2.600e-3 → 2.086e-15 | 5.002e-3 → 8.986e-16 |
| 390 hero | 7 | 53 → 0 | 133 → 0 | 4.958e-3 → 1.139e-3 | 1.081e-2 → 1.510e-5 |
| 390 drop | 27 | 51 → 0 | 171 → 0 | 4.781e-3 → 2.665e-15 | 5.658e-3 → 1.856e-15 |
| 390 heart | 16 | 37 → 0 | 170 → 0 | 1.692e-3 → 3.263e-16 | 3.365e-3 → 9.238e-17 |

Hero reference travel remains 0.2434 (desktop) / 0.1409 (mobile) over the measurement window: movement becomes smooth rather than disappearing. Heart motion settles to numerical precision. Floor/wall-supported contacts can retain nonzero internal velocity balanced by active constraints; this is not a sleeping flag. The artifacts retain these velocities rather than reporting them as zero. Pointer displacement and mode-transition displacement are positive in all six cases. Additional seeds 1, 42 and 5601 also yielded zero jitter-classified spheres in all 18 settled cases.

The six new settled-mode regressions fail on the instrumented original solver and pass after the fix. All 19 original tests remain; the final gravity suite has 27 passing tests. Typecheck, lint (zero warnings) and production build are checked separately.

## Performance scope

An alternating five-round solver benchmark used the same seed, 96 spheres, 600 warmup steps and 1800 measured steps through Hero/Drop/Heart, with diagnostics disabled in both versions. Median wall-clock solver time was 0.3024 ms/step before and 0.2884 ms/step after in this cloud instance (`gravity-stage-5-6-performance.json`). The browser was running on the same shared machine, so this is evidence against a material solver regression, not a claimed speedup or a physical-GPU frame-rate benchmark. Four O(n²) contact passes remain; the added support/reconciliation work is O(n), uses reused storage and adds no draw calls, meshes, textures or materials.

## Chromium WebGL results

All ten before/after recordings completed with 180 steps each, Full motion, no uncaught page errors and zero context losses. Mesh, material and geometry IDs remained identical; entrance count stayed 1 and resize count stayed 0. One shared geometry, two textures and three programs were reported throughout; the maximum measured projected axis ratio remained within 2e−14 of 1. Browser records include transition dynamics and are not interchangeable with the settled deterministic experiment above.

| Viewport / scenario | Jitter-classified spheres before → after | Recorded seconds before / after |
| --- | --- | --- |
| 1440 hero | 10 → 0 | 32.1 / 34.5 |
| 1440 drop | 15 → 0 | 35.6 / 36.4 |
| 1440 heart | 32 → 0 | 32.1 / 30.6 |
| 1440 reverse | 6 → 0 | 30.7 / 33.5 |
| 1440 pointer | 0 → 0 | 31.0 / 30.1 |
| 390 hero | 38 → 0 | 12.0 / 12.3 |
| 390 drop | 42 → 0 | 15.6 / 15.5 |
| 390 heart | 19 → 0 | 13.4 / 14.3 |
| 390 reverse | 29 → 0 | 11.8 / 12.2 |
| 390 pointer | 7 → 0 | 11.4 / 13.6 |

Screenshots for Hero and Heart at both widths are retained as `gravity-stage-5-6-{before,after}-{1440,390}-{hero,heart}.png`. They show the continuing Hero composition and retained Heart aggregation; screenshots alone do not prove temporal stability. That claim is supported by the step traces. Existing exact restitution/momentum tests validate real impact response; subjective bounce feel remains for human acceptance.

## Changed files

- `components/gravity/gravity-scene.tsx`
- `components/gravity/gravity-world.ts`
- `docs/gravity-stage-5-6.md`
- `docs/validation/gravity-stage-5-6-after-1440-heart.png`
- `docs/validation/gravity-stage-5-6-after-1440-hero.png`
- `docs/validation/gravity-stage-5-6-after-390-heart.png`
- `docs/validation/gravity-stage-5-6-after-390-hero.png`
- `docs/validation/gravity-stage-5-6-after.json`
- `docs/validation/gravity-stage-5-6-before-1440-heart.png`
- `docs/validation/gravity-stage-5-6-before-1440-hero.png`
- `docs/validation/gravity-stage-5-6-before-390-heart.png`
- `docs/validation/gravity-stage-5-6-before-390-hero.png`
- `docs/validation/gravity-stage-5-6-before.json`
- `docs/validation/gravity-stage-5-6-browser-after.json`
- `docs/validation/gravity-stage-5-6-browser-before.json`
- `docs/validation/gravity-stage-5-6-performance.json`
- `scripts/gravity-browser-stability.mjs`
- `scripts/gravity-stability-metrics.mjs`
- `tests/gravity-stability.test.mjs`
