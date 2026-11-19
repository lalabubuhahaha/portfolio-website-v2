'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import './portrait.css';
import { PortraitCursor } from './portrait-cursor';
export function InteractivePortrait() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const controls = useRef<{ dispose(): void; reset(): void } | null>(null);
  const [ready, setReady] = useState(false); const [played, setPlayed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const abort = new AbortController();
    const element = canvas.current;
    const frame = stage.current;
    if (!element || !frame) return;
    void import('./portrait-renderer').then(({ mountPortrait }) => cancelled ? null : mountPortrait(element, frame, value => { if (!cancelled) setReady(value); }, () => { if (!cancelled) setPlayed(true); }, abort.signal)).then(instance => {
      if (!instance) return;
      if (cancelled) instance.dispose(); else controls.current = instance;
    }).catch((error: unknown) => { console.error("Portrait initialization failed", error); if (!cancelled) setReady(false); });
    return () => { cancelled = true; abort.abort(); controls.current?.dispose(); controls.current = null; };
  }, []);
  return <figure className="about-portrait" aria-label="Interactive portrait of Lala" draggable={false} onDragStart={event => event.preventDefault()}>
    <div ref={stage} className="about-portrait-stage" draggable={false}>
      <div className="about-portrait-image" draggable={false}>
        <Image src="/images/about/faces/face00.webp" alt="Lala in a black shirt, looking towards the camera with a natural expression" fill draggable={false} sizes="(max-width: 479px) calc(122vw - 78px), (max-width: 767px) 508px, (max-width: 800px) 488px, (max-width: 1432px) 64.05vw, 918px" priority className="about-portrait-still" />
        <canvas ref={canvas} draggable={false} className="about-portrait-canvas" data-ready={ready} tabIndex={ready ? 0 : -1} role="img" aria-label="Lala’s elastic portrait. Hold an arrow key to pull; release to spring back. Escape resets." />
      </div>
    </div>
    {ready && <PortraitCursor canvas={canvas} />}
    <figcaption className="about-portrait-controls">
      <span className="about-portrait-hint" data-played={played}>{ready ? 'Drag to play.' : 'A little more about me.'}</span>
      {ready && <button type="button" aria-label="Reset portrait" title="Reset portrait" onClick={() => controls.current?.reset()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 10a8 8 0 1 1 1.4 6.5M4 4v6h6" /></svg></button>}
    </figcaption>
    <span className="sr-only">Drag the portrait to stretch it. Release to reveal another expression. Reset portrait restores the original expression. Reduced motion removes bounce and blur.</span>
  </figure>;
}
