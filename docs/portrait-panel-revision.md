# About portrait panel — visual revision

Supersedes the visual treatment in the initial Stage 6 report; interaction physics and mood logic are unchanged.

- Strategy A: a complete softly rounded photo panel, with a separate integrated bottom action bar. No cutout, CSS masks or bottom fade remain.
- Original studio background stays in both WebGL and the static fallback. Removed only the shader's luminance/chroma matte and its unused page-colour uniform; inverse warp, blur, texture blending and physics remain unchanged.
- Page and controls use existing cool light background, royal blue labels and subtle edge tokens. The original slightly warmer grey studio background provides a quiet contrast.
- Both canvas and fallback share a 128% square image frame, cropped at left −14% and top −8%. This enlarges the actual person by 28% without resampling or changing input coordinates. Desktop panel ratio is 1.1:1; mobile is square. Headroom stays visible; the lower torso is deliberately cropped at a clean edge.
- The common centered max-width grid uses 0.85fr / 1.15fr (42.5% / 57.5%), with vertical centering. Mobile stacks text above the portrait.
- At 1440×900, the stage is 642px tall and the figure ends at y=884 including controls. The visible person is approximately 75% of the 772px hero height. At 1024×768 and 390×844, the complete panel/action row also fits the screenshot; no horizontal overflow.

Validation: typecheck, lint, build, 6 Portrait tests and 27 Gravity tests passed. Browser checks at all three sizes verified grimace, spring settling, new mood and Reset. A real browser mouse drag separately verified the enlarged canvas coordinate mapping and release/mood transition. The original physics file, mood manifest and homepage code have no changes in this revision.

Screenshots and numeric checks: `docs/validation/portrait-panel/{1440.png,1024.png,390.png,results.json}`.
