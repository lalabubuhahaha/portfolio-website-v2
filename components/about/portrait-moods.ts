const expressions = ['Natural, relaxed', 'One eye narrowed', 'Tense teeth-baring grimace', 'Skeptical frown', 'Concerned, parted lips', 'Pressed lips', 'Narrow-eyed doubtful', 'Pursed lips', 'Wide-eyed surprise', 'Open-mouth astonishment', 'Quiet, closed lips'];
// All supplied images share a 1254px square frame. Eye-line anchors are
// manually inspected; small expression-specific shifts stay inside the face mask.
export const moods = expressions.map((expression, id) => ({
  id, image: `/images/about/faces/face${String(id).padStart(2, '0')}.webp`, expression,
  role: id === 0 ? 'neutral' : id === 2 ? 'grimace' : 'mood',
  alignment: { scale: 1, rotation: 0, translation: [0, 0] as const, eyeLine: .345, faceCenter: [.546, .413] as const },
}));
export const GRIMACE = 2;
