'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function ScrollReveal({
  children,
  stagger = false,
  delay = 0,
  y = 28,
  start = 'top 85%',
  className,
}: {
  children: React.ReactNode;
  stagger?: boolean;
  delay?: number;
  y?: number;
  start?: string;
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
          duration: 0.7,
          delay,
          ease: 'power3.out',
          stagger: stagger ? 0.08 : 0,
          scrollTrigger: {
            trigger: ref.current,
            start,
            toggleActions: 'play none none reverse',
          },
        },
      );
    }, ref);

    return () => ctx.revert();
  }, [stagger, delay, y, start]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
