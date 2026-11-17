# About Hero — full-screen editorial revision

Replaces the previous card/panel visual treatment. Only `portrait.css` and the Reset button markup in `interactive-portrait.tsx` change application presentation. Renderer, shader, physics, moods, images, Home, Work, Header and Footer are unchanged.

The desktop Hero fills the viewport (minimum 48rem on short windows), with a 44/56 editorial grid and a larger Raleway headline closer to the portrait. The photo is bottom-aligned and shifted toward the centre. Its square canvas retains existing coordinate conversion and edge pinning. Mobile stacks introduction above a full-width portrait. Expertise remains below in a constrained content container.

Original background samples from face00: approximately RGB (179,174,173), (184,178,178), (186,181,180). Corresponding warm-grey tokens and a restrained vertical tonal adjustment extend the studio background across the Hero. Mobile uses a tone matching the upper photo backdrop. Shared side blending is restricted to the upper background and ends above the torso. There is no cutout, card border/radius/shadow, action bar, or bottom transparency/fade. Body cuts cleanly at the Hero bottom. Every expression uses the same CSS treatment.

Hint is a lightweight glass pill. Reset is a 44px icon button with accessible name. Their floating placement leaves canvas input available except on the Reset button.

Validation: typecheck, lint, build; 6 Portrait and 27 Gravity tests. Browser checks at 1440×900, 1024×768, 390×844, 1920×1080, 2560×1440 verify no horizontal overflow, zero portrait border/radius, and stage bottom equal to Hero bottom. Grimace, spring, changed mood and Reset pass at every size with no page errors. A separate real mouse drag verifies accurate input after reframing, release and icon Reset. Physics/shader/renderer/mood diffs are unchanged. Reduced motion inherits its unchanged implementation and passing numerical test. Physical-device/Safari hand-feel is not newly verified in this visual-only revision.

Screenshots and numeric results: `docs/validation/portrait-editorial/`.
