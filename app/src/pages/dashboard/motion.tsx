import { useEffect, useRef, useState, type ReactNode } from 'react';

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** True once the element has scrolled into view (stays true). */
export function useInView<T extends Element>(margin = '0px 0px -10% 0px') {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (!('IntersectionObserver' in window)) return setInView(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [inView, margin]);
  return { ref, inView };
}

/** Fades and lifts its children in when they scroll into view. */
export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal ${inView ? 'is-visible' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** Counts up to `value` when it scrolls into view, then glides to new values (instant with reduced motion). */
export function CountUp({ value, decimals = 0, duration = 1400 }: { value: number; decimals?: number; duration?: number }) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (!inView) return;
    if (reducedMotion()) {
      from.current = value;
      return setShown(value);
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration);
      const v = origin + (value - origin) * (1 - Math.pow(1 - k, 4)); // ease-out
      from.current = v;
      setShown(v);
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration]);
  return <span ref={ref}>{shown.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
}
