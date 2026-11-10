// Keep the original four-mode equations unchanged; content after the story is not another mode.
export function getStoryProgress(
  scrollY: number,
  viewportHeight: number,
  contentTop = Number.POSITIVE_INFINITY,
) {
  const raw = scrollY / (viewportHeight || 1);
  return {
    progress: Math.min(3.45, Math.max(0, raw)),
    // #works anchors reserve 128px for navigation. Stop when it becomes the
    // reading surface, but never cut off the original Release transition.
    active: raw < 4 && !(raw >= 3.45 && contentTop <= 128),
  };
}
export function shouldUseStaticMotion(frames: number, elapsedMs: number) {
  return frames >= 6 && elapsedMs >= 6000 && frames / (elapsedMs / 1000) < 12;
}
