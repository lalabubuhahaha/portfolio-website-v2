const expressions = ['Natural, relaxed', 'One eye narrowed', 'Tense teeth-baring grimace', 'Skeptical frown', 'Concerned, parted lips', 'Pressed lips', 'Narrow-eyed doubtful', 'Stern gaze, pressed lips', 'Wide-eyed surprise', 'Raised brows, parted lips', 'Quiet, closed lips'];
// All exported textures use the same 1254px UV frame. The replacement PNGs
// keep the source framing, with their studio backdrop matched before export.
// They are shown as whole portraits so their chin, neck, and collar stay together.
const replacementImages: Partial<Record<number, string>> = { 7: 'face07a.webp?v=2', 9: 'face09a.webp?v=2' };
export const moods = expressions.map((expression, id) => ({
  id, image: `/images/about/faces/${replacementImages[id] ?? `face${String(id).padStart(2, '0')}.webp`}`, expression,
  fullFrame: replacementImages[id] !== undefined,
  role: id === 0 ? 'neutral' : id === 2 ? 'grimace' : 'mood',
  alignment: { scale: 1, rotation: 0, translation: [0, 0] as const, eyeLine: .345, faceCenter: [.546, .413] as const },
}));
export const GRIMACE = 2;
