'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function Reveal({
  children,
  stagger = false,
  delay = 0,
  y = 18,
  className,
}: {
  children: React.ReactNode;
  stagger?: boolean;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const targets = stagger ? Array.from(ref.current.children) : ref.current;
    if (stagger && (targets as Element[]).length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.65,
          delay,
          ease: 'power3.out',
          stagger: stagger ? 0.06 : 0,
        },
      );
    }, ref);

    return () => ctx.revert();
  }, [stagger, delay, y]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
