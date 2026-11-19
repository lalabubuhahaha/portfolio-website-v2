import * as THREE from 'three';
import { GRIMACE, moods } from './portrait-moods';
import { PORTRAIT, PortraitPhysics, type Point } from './portrait-physics';
import { vertexShader, fragmentShader } from './portrait-shaders';
export interface PortraitSimulation {
  down(x: number, y: number): void; move(x: number, y: number): void;
  up(cancel?: boolean): void; step(seconds: number): void; reset(): void;
  state(): { phase: string; mood: number; blend: number; displacement: Point; velocity: Point; switched: boolean };
  loseContext(): void; restoreContext(): void;
}
declare global { interface Window { __sim?: PortraitSimulation } }
export async function mountPortrait(canvas: HTMLCanvasElement, onReady: (ready: boolean) => void, onDrag: () => void, signal?: AbortSignal) {
  let disposed = false; let lost = false; let raf = 0; let previous = 0; let activePointer: number | null = null;
  const recording = process.env.NODE_ENV !== 'production' && new URLSearchParams(location.search).has('rec');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const physics = new PortraitPhysics(media.matches);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, PORTRAIT.maxDPR));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const contextControl = renderer.getContext().getExtension('WEBGL_lose_context');
  const textures: THREE.Texture[] = [];
  let material: THREE.ShaderMaterial | undefined;
  const geometry = new THREE.PlaneGeometry(2, 2); const scene = new THREE.Scene(); const camera = new THREE.Camera();
  const resize = () => { renderer.setPixelRatio(Math.min(devicePixelRatio || 1, PORTRAIT.maxDPR, PORTRAIT.maxRenderSize / Math.max(1, canvas.clientWidth, canvas.clientHeight))); renderer.setSize(Math.max(1, canvas.clientWidth), Math.max(1, canvas.clientHeight), false); draw(); };
  const draw = () => {
    if (disposed || lost || !material) return;
    material.uniforms.moodTexture.value = textures[physics.mood];
    material.uniforms.blend.value = physics.blend;
    material.uniforms.fullFrameMood.value = moods[physics.mood].fullFrame;
    material.uniforms.grab.value.set(physics.grab.x, physics.grab.y);
    material.uniforms.displacement.value.set(physics.displacement.x, physics.displacement.y);
    material.uniforms.velocity.value.set(physics.velocity.x, physics.velocity.y);
    material.uniforms.blur.value = !physics.reduced && ['RELEASING', 'SETTLING'].includes(physics.phase) ? PORTRAIT.motionBlurStrength : 0;
    renderer.render(scene, camera);
    canvas.dataset.phase = physics.phase; canvas.dataset.mood = String(physics.mood);
  };
  const tick = (now: number) => {
    raf = 0;
    if (disposed || lost || document.hidden) return;
    physics.step(previous ? (now - previous) / 1000 : 1 / 60); previous = now; draw();
    if (physics.phase !== 'IDLE') raf = requestAnimationFrame(tick);
  };
  const wake = () => { if (!raf && !recording && !lost && !disposed && !document.hidden) { previous = 0; raf = requestAnimationFrame(tick); } };
  const point = (event: PointerEvent): Point => { const r = canvas.getBoundingClientRect(); return { x: (event.clientX - r.left) / r.width, y: 1 - (event.clientY - r.top) / r.height }; };
  const down = (event: PointerEvent) => {
    if (lost || !material || activePointer !== null || event.button !== 0) return;
    if (!physics.down(point(event))) return;
    activePointer = event.pointerId; canvas.setPointerCapture(event.pointerId); canvas.dataset.dragging = 'true'; wake();
  };
  const move = (event: PointerEvent) => { if (activePointer !== event.pointerId) return; physics.move(point(event)); if (Math.hypot(physics.target.x, physics.target.y) > .025) onDrag(); wake(); };
  const release = (event: PointerEvent) => {
    if (activePointer !== event.pointerId) return;
    activePointer = null; physics.up(event.type !== 'pointerup'); canvas.dataset.dragging = 'false';
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); wake();
  };
  const contextLost = (event: Event) => { event.preventDefault(); lost = true; cancelAnimationFrame(raf); raf = 0; if (activePointer !== null && canvas.hasPointerCapture(activePointer)) canvas.releasePointerCapture(activePointer); activePointer = null; physics.reset(); canvas.dataset.dragging = 'false'; onReady(false); };
  const contextRestored = () => { if (disposed) return; lost = false; for (const t of textures) t.needsUpdate = true; if (material) material.needsUpdate = true; physics.reset(); resize(); onReady(true); };
  const visibility = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; if (activePointer !== null) { const id = activePointer; activePointer = null; if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id); physics.up(true); canvas.dataset.dragging = 'false'; } } else wake(); };
  const reduced = () => { physics.reduced = media.matches; };
  const keyboardDown = (event: KeyboardEvent) => {
    const direction: Record<string, Point> = { ArrowLeft: {x:-.3,y:0}, ArrowRight: {x:.3,y:0}, ArrowUp: {x:0,y:.3}, ArrowDown: {x:0,y:-.3} };
    if (event.key === 'Escape') { reset(); return; }
    const d = direction[event.key]; if (!d || lost) return; event.preventDefault();
    if (physics.phase === 'IDLE') physics.down({x:.55,y:.59});
    physics.move({x:.55+d.x,y:.59+d.y}); onDrag(); wake();
  };
  const keyboardUp = (event: KeyboardEvent) => { if (event.key.startsWith('Arrow')) { event.preventDefault(); physics.up(); wake(); } };
  canvas.addEventListener('keydown', keyboardDown); canvas.addEventListener('keyup', keyboardUp);
  canvas.addEventListener('blur', resetOnBlur);
  function resetOnBlur() { physics.up(true); wake(); }
  canvas.addEventListener('webglcontextlost', contextLost); canvas.addEventListener('webglcontextrestored', contextRestored);
  const reset = () => { if (activePointer !== null && canvas.hasPointerCapture(activePointer)) canvas.releasePointerCapture(activePointer); activePointer = null; physics.reset(); canvas.dataset.dragging = 'false'; draw(); };
  const sim: PortraitSimulation = {
    down: (x, y) => { if (!lost) physics.down({ x, y }); wake(); }, move: (x, y) => { if (!lost) physics.move({ x, y }); onDrag(); wake(); },
    up: (cancel = false) => { physics.up(cancel); wake(); }, step: (seconds) => { physics.step(seconds); draw(); }, reset,
    state: () => ({ phase: physics.phase, mood: physics.mood, blend: physics.blend, displacement: { ...physics.displacement }, velocity: { ...physics.velocity }, switched: physics.switched }),
    loseContext: () => contextControl?.loseContext(),
    restoreContext: () => contextControl?.restoreContext(),
  };
  const observer = new ResizeObserver(resize);
  const dispose = () => {
    if (disposed) return;
    signal?.removeEventListener("abort", dispose);
    disposed = true; cancelAnimationFrame(raf); observer.disconnect();
    if (activePointer !== null && canvas.hasPointerCapture(activePointer)) canvas.releasePointerCapture(activePointer);
    for (const [name, listener] of [['pointerdown', down], ['pointermove', move], ['pointerup', release], ['pointercancel', release], ['lostpointercapture', release]] as const) canvas.removeEventListener(name, listener);
    canvas.removeEventListener('keydown', keyboardDown); canvas.removeEventListener('keyup', keyboardUp); canvas.removeEventListener('blur', resetOnBlur);
    canvas.removeEventListener('webglcontextlost', contextLost); canvas.removeEventListener('webglcontextrestored', contextRestored);
    document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', reduced);
    textures.forEach(t => t.dispose()); material?.dispose(); geometry.dispose(); renderer.dispose();
    if (window.__sim === sim) delete window.__sim;
  };
  signal?.addEventListener("abort", dispose, { once: true });
  if (signal?.aborted) { dispose(); return { dispose, reset }; }
  try {
    const loader = new THREE.TextureLoader();
    // allSettled ensures successful loads are released even if another image fails.
    const loaded = await Promise.allSettled(moods.map(async mood => {
      const t = await loader.loadAsync(mood.image); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; textures[mood.id] = t; if (disposed) t.dispose(); return t;
    }));
    if (disposed) return { dispose, reset };
    if (loaded.some(result => result.status === 'rejected')) throw new Error('Portrait texture preload failed');
    material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms: {
      baseTexture: { value: textures[0] }, moodTexture: { value: textures[0] }, grimaceTexture: { value: textures[GRIMACE] },
      grab: { value: new THREE.Vector2() }, displacement: { value: new THREE.Vector2() }, velocity: { value: new THREE.Vector2() },
      blend: { value: 0 }, fullFrameMood: { value: false }, radius: { value: PORTRAIT.warpRadius }, blur: { value: 0 },
    } });
    scene.add(new THREE.Mesh(geometry, material)); resize(); observer.observe(canvas);
    for (const [name, listener] of [['pointerdown', down], ['pointermove', move], ['pointerup', release], ['pointercancel', release], ['lostpointercapture', release]] as const) canvas.addEventListener(name, listener);
    document.addEventListener('visibilitychange', visibility); media.addEventListener('change', reduced);
    if (recording) window.__sim = sim;
    onReady(!lost); return { dispose, reset };
  } catch (error) { dispose(); throw error; }
}
