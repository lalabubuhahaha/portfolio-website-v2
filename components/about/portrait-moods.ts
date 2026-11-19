const expressions = ['Natural, relaxed', 'One eye narrowed', 'Tense teeth-baring grimace', 'Skeptical frown', 'Concerned, parted lips', 'Pressed lips', 'Narrow-eyed doubtful', 'Stern gaze, pressed lips', 'Wide-eyed surprise', 'Raised brows, parted lips', 'Quiet, closed lips'];
// All exported textures use the same 1254px UV frame. The replacement PNGs
// were registered to the neutral pupils and their studio backdrop matched
// before WebP export. The shader samples the resulting textures as-is.
const replacementImages: Partial<Record<number, string>> = { 7: 'face07a.webp', 9: 'face09a.webp' };
export const moods = expressions.map((expression, id) => ({
  id, image: `/images/about/faces/${replacementImages[id] ?? `face${String(id).padStart(2, '0')}.webp`}`, expression,
  role: id === 0 ? 'neutral' : id === 2 ? 'grimace' : 'mood',
  alignment: { scale: 1, rotation: 0, translation: [0, 0] as const, eyeLine: .345, faceCenter: [.546, .413] as const },
}));
export const GRIMACE = 2;
