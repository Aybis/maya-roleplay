'use client';

import { useEffect, useState, type CSSProperties } from 'react';

export type TourStep = {
  selector: string;
  title: string;
  body: string;
  placement?: 'top' | 'bottom';
  /** Runs right before this step is measured/spotlighted — e.g. reveal the node it points at. */
  onEnter?: () => void;
};

const MARGIN = 8;

export default function Tour({ steps, onFinish }: { steps: TourStep[]; onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[index];

  useEffect(() => {
    // Deliberately don't reset rect to null here — keeping the previous value lets the
    // spotlight slide smoothly to the next target (via the CSS transition) instead of
    // flashing away, and it avoids a synchronous setState-in-effect lint violation.
    step.onEnter?.();

    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const el = document.querySelector(step.selector);
      if (!el) return;
      const nextRect = el.getBoundingClientRect();
      if (nextRect.width === 0 || nextRect.height === 0) return;
      setRect(nextRect);
    };

    const raf = requestAnimationFrame(() => {
      const el = document.querySelector(step.selector);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(measure, 260);
    });

    window.addEventListener('resize', measure);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, step.selector]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onFinish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!rect) return null;

  const spotlightStyle: CSSProperties = {
    top: rect.top - MARGIN,
    left: rect.left - MARGIN,
    width: rect.width + MARGIN * 2,
    height: rect.height + MARGIN * 2,
  };

  const placement = step.placement ?? (rect.top > window.innerHeight * 0.55 ? 'top' : 'bottom');
  const tooltipWidth = 300;
  const tooltipHeight = 210;
  const left = Math.min(Math.max(rect.left, 12), window.innerWidth - tooltipWidth - 12);
  const idealTop = placement === 'top' ? rect.top - MARGIN * 2 - tooltipHeight : rect.bottom + MARGIN * 2;
  const top = Math.min(Math.max(idealTop, 12), window.innerHeight - tooltipHeight - 12);
  const tooltipStyle: CSSProperties = { left, top };

  const isLast = index === steps.length - 1;

  return (
    <div className="tour-layer">
      <div className="tour-spotlight" style={spotlightStyle} />
      <div className="tour-tooltip" style={tooltipStyle}>
        <span className="tour-tooltip-count">
          {index + 1} / {steps.length}
        </span>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="tour-tooltip-actions">
          <button type="button" className="tour-skip" onClick={onFinish}>
            Skip
          </button>
          <div className="tour-tooltip-nav">
            {index > 0 && (
              <button type="button" className="tour-back" onClick={() => setIndex(index - 1)}>
                Back
              </button>
            )}
            <button type="button" className="tour-next" onClick={() => (isLast ? onFinish() : setIndex(index + 1))}>
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
