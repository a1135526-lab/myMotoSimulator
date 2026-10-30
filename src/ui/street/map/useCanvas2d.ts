import { useEffect, useRef, useState } from 'react';

/**
 * A 2D canvas sized to its box at the device pixel ratio. Returns the ref,
 * the context (null where canvas isn't available, e.g. tests) and the CSS size.
 */
export function useCanvas2d() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let context: CanvasRenderingContext2D | null = null;
    // The map is drawn with Path2D; without it (jsdom) there's nothing to draw.
    if (typeof Path2D !== 'undefined') {
      try {
        context = canvas.getContext('2d');
      } catch {
        context = null;
      }
    }
    setCtx(context);
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context?.setTransform(dpr, 0, 0, dpr, 0, 0);
      setSize({ width, height });
    };
    fit();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  return { ref, ctx, size };
}
