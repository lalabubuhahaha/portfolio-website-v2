export const PORTRAIT = {
  warpRadius: 0.32, dragLag: 19, maxDisplacement: 0.56,
  rubberBandThreshold: 0.4, rubberBandResistance: 0.16,
  springStiffness: 190, springDamping: 23, grimaceThreshold: 0.13,
  grimaceBlendDuration: 0.075, motionBlurStrength: 0.003, maxDPR: 1.5, maxRenderSize: 768,
} as const;
export type Phase = 'IDLE' | 'GRABBED' | 'DRAGGING' | 'GRIMACE' | 'RELEASING' | 'SETTLING';
export type Point = { x: number; y: number };
const MOOD_ORDER = [10, 8, 7, 6, 5, 4, 3, 1, 9];
export function resistance(p: Point): Point {
  const length = Math.hypot(p.x, p.y);
  if (!Number.isFinite(length) || length === 0) return { x: 0, y: 0 };
  const t = PORTRAIT.rubberBandThreshold;
  const d = Math.min(PORTRAIT.maxDisplacement, length <= t ? length : t + PORTRAIT.rubberBandResistance * (1 - Math.exp(-(length - t) / PORTRAIT.rubberBandResistance)));
  return { x: p.x * d / length, y: p.y * d / length };
}
export class PortraitPhysics {
  phase: Phase = 'IDLE'; grab: Point = { x: .55, y: .57 };
  displacement: Point = { x: 0, y: 0 }; velocity: Point = { x: 0, y: 0 };
  target: Point = { x: 0, y: 0 }; blend = 0; mood = 0; nextMood = 0;
  switched = false; successful = false; elapsed = 0; peakSpeed = 0;
  private bag = [...MOOD_ORDER]; private crossed = false;
  constructor(public reduced = false) {}
  reset() { this.bag = [...MOOD_ORDER]; this.successful = false; this.crossed = false; this.peakSpeed = 0; this.phase = 'IDLE'; this.displacement = { x: 0, y: 0 }; this.velocity = { x: 0, y: 0 }; this.target = { x: 0, y: 0 }; this.blend = 0; this.mood = 0; this.nextMood = 0; this.switched = false; this.elapsed = 0; }
  down(p: Point) {
    if (this.phase !== 'IDLE') return false;
    this.grab = p; this.phase = 'GRABBED'; this.successful = false; this.switched = false; this.crossed = false; this.peakSpeed = 0; return true;
  }
  move(p: Point) {
    if (!['GRABBED', 'DRAGGING', 'GRIMACE'].includes(this.phase)) return;
    this.target = resistance({ x: p.x - this.grab.x, y: p.y - this.grab.y });
    const intensity = Math.hypot(this.target.x, this.target.y);
    if (intensity > PORTRAIT.grimaceThreshold) this.successful = true;
    this.phase = intensity > PORTRAIT.grimaceThreshold || (this.phase === 'GRIMACE' && intensity > .09) ? 'GRIMACE' : 'DRAGGING';
  }
  up(cancel = false) {
    if (!['GRABBED', 'DRAGGING', 'GRIMACE'].includes(this.phase)) return;
    if (cancel) this.successful = false;
    this.nextMood = this.mood;
    if (this.successful) {
      const next = this.bag.shift()!; this.bag.push(next); this.nextMood = next;
    }
    this.elapsed = 0; this.phase = 'RELEASING';
  }
  step(delta: number) {
    if (!Number.isFinite(delta)) return;
    const dt = Math.min(Math.max(delta, 0), .05);
    if (this.phase === 'IDLE') return;
    if (['GRABBED', 'DRAGGING', 'GRIMACE'].includes(this.phase)) {
      const k = 1 - Math.exp(-PORTRAIT.dragLag * dt);
      for (const axis of ['x', 'y'] as const) {
        const old = this.displacement[axis];
        this.displacement[axis] += (this.target[axis] - old) * k;
        this.velocity[axis] = dt ? (this.displacement[axis] - old) / dt : 0;
      }
      const targetBlend = this.phase === 'GRIMACE' ? 1 : 0;
      this.blend += (targetBlend - this.blend) * (1 - Math.exp(-dt / PORTRAIT.grimaceBlendDuration));
      return;
    }
    this.elapsed += dt;
    let switchedThisFrame = false;
    // Keep the cover opaque before changing the hidden underlying texture.
    if (this.successful && !this.switched) {
      this.blend = Math.min(1, this.blend + dt / .035);
      if (this.blend >= .999) { this.blend = 1; this.mood = this.nextMood; this.switched = true; switchedThisFrame = true; }
    }
    const steps = Math.max(1, Math.ceil(dt / (1 / 240))); const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const before = this.displacement.x * this.grabDirection().x + this.displacement.y * this.grabDirection().y;
      for (const axis of ['x', 'y'] as const) {
        const damping = this.reduced ? 30 : PORTRAIT.springDamping;
        this.velocity[axis] += (-PORTRAIT.springStiffness * this.displacement[axis] - damping * this.velocity[axis]) * h;
        this.displacement[axis] += this.velocity[axis] * h;
      }
      const after = this.displacement.x * this.grabDirection().x + this.displacement.y * this.grabDirection().y;
      if (before > 0 && after <= 0) this.crossed = true;
      if (this.crossed && before < 0 && after >= 0) { this.displacement = { x: 0, y: 0 }; this.velocity = { x: 0, y: 0 }; }
    }
    const speed = Math.hypot(this.velocity.x, this.velocity.y); this.peakSpeed = Math.max(speed, this.peakSpeed);
    if (!switchedThisFrame && (!this.successful || this.switched) && (speed > .55 || this.elapsed > .16)) this.blend = Math.max(0, this.blend - dt / .11);
    if (this.elapsed > .12) this.phase = 'SETTLING';
    if ((Math.hypot(this.displacement.x, this.displacement.y) < .0008 && speed < .012 && this.blend === 0) || this.elapsed > .8) {
      this.displacement = { x: 0, y: 0 }; this.velocity = { x: 0, y: 0 }; this.blend = 0; this.phase = 'IDLE';
    }
  }
  private grabDirection() { const n = Math.hypot(this.target.x, this.target.y) || 1; return { x: this.target.x / n, y: this.target.y / n }; }
}
// Shared UV boundary for the shader and its CPU reference. It follows the
// underside of the jaw and rises toward the shoulders, pinning the clothing.
export const WARP_BOUNDARY = { chinX: .58, chinY: .415, shoulderRise: .17, shoulderRun: .15, collarStart: .525, collarRun: .075, collarRise: .075, feather: .14 };
function smoothRamp(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function headWeight({ x, y }: Point) {
  const { chinX, chinY, shoulderRise, shoulderRun, collarStart, collarRun, collarRise, feather } = WARP_BOUNDARY;
  const floor = chinY + shoulderRise * smoothRamp(Math.abs(x - chinX) / shoulderRun)
    + collarRise * smoothRamp((x - collarStart) / collarRun);
  return smoothRamp((y - floor) / feather) * smoothRamp((x - .26) / .13) * smoothRamp((.85 - x) / .14);
}

// CPU reference of the shader field for numerical regression tests.
export function inverseWarp(point: Point, grab: Point, drag: Point): Point {
  const smooth = (v: number) => smoothRamp(v / .16);
  const field = (p: Point) => {
    const local = Math.exp(-1.5 * (((p.x - grab.x) / PORTRAIT.warpRadius) ** 2 + ((p.y - grab.y) / PORTRAIT.warpRadius) ** 2));
    const weight = local * headWeight(p) * smooth(p.x) * smooth(p.y) * smooth(1 - p.x) * smooth(1 - p.y);
    return { x: drag.x * weight, y: drag.y * weight };
  };
  const p = { ...point }; const h = 1 / 12;
  for (let i = 0; i < 12; i++) { const k = field(p); const m = field({ x: p.x - .5 * h * k.x, y: p.y - .5 * h * k.y }); p.x -= h * m.x; p.y -= h * m.y; }
  return p;
}
