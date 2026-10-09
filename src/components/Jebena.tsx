"use client";

import { motion } from "motion/react";

type Props = { className?: string; steam?: boolean; draw?: boolean };

const paths = [
  "M25 18 h14 l-2.5 -5 h-9 z",
  "M28.5 18 L27.5 46 M35.5 18 L36.5 46",
  "M27.5 46 C10 50 8 70 14 80 C20 92 44 92 50 80 C56 70 54 50 36.5 46",
  "M15 58 C9 52 8 44 11 36",
  "M36 24 C50 25 53 38 49 52",
  "M17 70 h30",
  "M22 92 h20",
];

/** Traditional Ethiopian clay coffee pot as a line icon; `draw` traces the strokes in when scrolled into view. */
export default function Jebena({ className, steam = false, draw = false }: Props) {
  return (
    <svg viewBox="0 0 64 100" className={className} aria-hidden="true">
      {steam && (
        <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7">
          <path className="steam" d="M10 32 q-3 -5 0 -10" />
          <path className="steam" style={{ animationDelay: "1.1s" }} d="M14 30 q3 -6 0 -12" />
        </g>
      )}
      <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
        {paths.map((d, i) =>
          draw ? (
            <motion.path
              key={i}
              d={d}
              opacity={i === 5 ? 0.55 : 1}
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.6, delay: i * 0.15, ease: [0.65, 0, 0.35, 1] }}
            />
          ) : (
            <path key={i} d={d} opacity={i === 5 ? 0.55 : 1} />
          ),
        )}
      </g>
    </svg>
  );
}
