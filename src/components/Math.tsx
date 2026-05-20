import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathProps {
  math: string;
}

export function InlineMath({ math }: MathProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: false,
          throwOnError: false,
        });
      } catch (err) {
        console.error('KaTeX inline rendering error:', err);
      }
    }
  }, [math]);

  return <span ref={containerRef} className="inline-math font-mono" />;
}

export function BlockMath({ math }: MathProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: true,
          throwOnError: false,
        });
      } catch (err) {
        console.error('KaTeX block rendering error:', err);
      }
    }
  }, [math]);

  return <div ref={containerRef} className="block-math overflow-x-auto my-2 py-1 font-mono" />;
}
