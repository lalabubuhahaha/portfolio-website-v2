'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import './portrait.css';
export function InteractivePortrait() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const controls = useRef<{ dispose(): void; reset(): void } | null>(null);
  const [ready, setReady] = useState(false); const [played, setPlayed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const abort = new AbortController();
    if (!canvas.current) return;
    const element = canvas.current;
    void import('./portrait-renderer').then(({ mountPortrait }) => cancelled ? null : mountPortrait(element, value => { if (!cancelled) setReady(value); }, () => { if (!cancelled) setPlayed(true); }, abort.signal)).then(instance => {
      if (!instance) return;
      if (cancelled) instance.dispose(); else controls.current = instance;
    }).catch((error: unknown) => { console.error("Portrait initialization failed", error); if (!cancelled) setReady(false); });
    return () => { cancelled = true; abort.abort(); controls.current?.dispose(); controls.current = null; };
  }, []);
  return <figure className="about-portrait" aria-label="Interactive portrait of Lala">
    <div className="about-portrait-stage">
      <Image src="/images/about/faces/face00.webp" alt="Lala in a black shirt, looking towards the camera with a natural expression" fill sizes="(max-width: 767px) 100vw, 60vw" priority className="about-portrait-still" />
      <canvas ref={canvas} className="about-portrait-canvas" data-ready={ready} tabIndex={ready ? 0 : -1} role="img" aria-label="Lala’s elastic portrait. Hold an arrow key to pull; release to spring back. Escape resets." />
    </div>
    <figcaption className="about-portrait-controls">
      <span className="about-portrait-hint" data-played={played}>{ready ? 'Drag to play.' : 'A little more about me.'}</span>
      {ready && <button type="button" onClick={() => controls.current?.reset()}>Reset portrait <span aria-hidden="true">↺</span></button>}
    </figcaption>
    <span className="sr-only">Drag the portrait to stretch it. Release to reveal another expression. Reset portrait restores the original expression. Reduced motion removes bounce and blur.</span>
  </figure>;
}
