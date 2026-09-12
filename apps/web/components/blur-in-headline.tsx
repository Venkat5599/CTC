"use client";

import { useRef, useEffect, useState } from "react";
import type { ReactNode } from "react";

/**
 * The thesis, in one sentence, because this is the only paragraph on the
 * marketing page a visitor is guaranteed to read to the end -- the words blur
 * in one at a time as they scroll, so they cannot skim it.
 *
 * It must survive the reader asking "compared to what?" at every clause, which
 * is why it names the alternative (an operator's word) before naming us.
 */
const headline =
  "An operator's attestation is a claim you have to trust. Vouch proves the transaction on the chain it happened on, checks that the proof means what it claims, and writes the fact to Creditcoin once — where every lender reads it for free, forever.";

export function BlurInHeadline(): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const words = headline.split(" ");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        const startOffset = windowHeight * 0.9;
        const endOffset = windowHeight * 0.25;

        const progress = Math.min(
          1,
          Math.max(0, (startOffset - rect.top) / (startOffset - endOffset))
        );

        setScrollProgress(progress);
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section ref={containerRef} className="bg-background w-full px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <p className="text-foreground text-left text-3xl leading-snug font-medium tracking-tight sm:text-4xl lg:text-5xl lg:leading-snug">
          {words.map((word, index) => {
            const wordStart = index / words.length;
            const wordEnd = wordStart + 1 / words.length;

            const wordProgress = Math.min(
              1,
              Math.max(0, (scrollProgress - wordStart) / (wordEnd - wordStart))
            );
            const opacity = 0.15 + wordProgress * 0.85;
            const blur = (1 - wordProgress) * 8;

            return (
              <span
                key={index}
                className="mr-2 inline-block lg:mr-3"
                style={{
                  opacity,
                  filter: `blur(${blur}px)`,
                  transition: "opacity 75ms, filter 75ms",
                }}
              >
                {word}
              </span>
            );
          })}
        </p>
      </div>
    </section>
  );
}
