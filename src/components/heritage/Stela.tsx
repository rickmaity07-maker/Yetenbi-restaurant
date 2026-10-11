"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

/*
  An Aksumite stela, drawn in detail after the great stelae of Aksum:
  - a rounded crown with the carved crescent-and-disc emblem,
  - storeys separated by double timber beams with rows of round "monkey-head" beam ends,
  - recessed false windows with sills, lintels and mullions, flanked by a recessed vertical panel,
  - a false door with frame, lock and studs, standing on a stepped base platform.
  `lit` warms the windows of the lowest N storeys (bottom first), `draw` traces the lines in.
*/
export const STELA_FLOORS = 6;
const W = 160;
const L = 22; // left face
const R = W - 22; // right face
const FLOOR = 70;
const TOP = 74;
const SHAFT = TOP + 56; // crown meets shaft
const BASE = SHAFT + STELA_FLOORS * FLOOR; // door storey starts here
const H = BASE + 150;

export default function Stela({
  className = "",
  lit = 0,
  draw = false,
  delay = 0,
  glow = true,
  stagger = 0,
}: {
  className?: string;
  lit?: number;
  draw?: boolean;
  delay?: number;
  glow?: boolean;
  /** seconds between storeys lighting up, bottom first */
  stagger?: number;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const animateLines = draw && !reduce;
  const line = (i: number) =>
    animateLines
      ? {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { duration: 1.8, delay: delay + i * 0.05, ease: [0.65, 0, 0.35, 1] as const },
        }
      : {};

  // top y of each storey, listed bottom first
  const floors = Array.from({ length: STELA_FLOORS }, (_, k) => BASE - (k + 1) * FLOOR);
  const beamEnds = (y: number) =>
    Array.from({ length: 11 }, (_, j) => ({ cx: L + 9 + j * ((R - L - 18) / 10), cy: y }));
  const crownR = (R - L) / 2;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden
    >
      <defs>
        <radialGradient id={`lamp-${uid}`} cx="50%" cy="60%" r="70%">
          <stop offset="0" stopColor="#ffe2a0" stopOpacity="0.85" />
          <stop offset="0.55" stopColor="#e9963a" stopOpacity="0.42" />
          <stop offset="1" stopColor="#7a2e10" stopOpacity="0.08" />
        </radialGradient>
        {/* stone body: lit from the left, falling into shadow on the right */}
        <linearGradient id={`stone-${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#e7cd8a" stopOpacity="0.16" />
          <stop offset="0.45" stopColor="#c9a24a" stopOpacity="0.07" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* body fill */}
      <path
        d={`M${L} ${SHAFT} V ${TOP + 26} A ${crownR} ${crownR} 0 0 1 ${R} ${TOP + 26} V ${BASE + 118} H ${L} Z`}
        fill={`url(#stone-${uid})`}
        stroke="none"
      />

      {/* crown with crescent and disc */}
      <motion.path
        d={`M${L} ${SHAFT} V ${TOP + 26} A ${crownR} ${crownR} 0 0 1 ${R} ${TOP + 26} V ${SHAFT}`}
        strokeWidth="1.8"
        {...line(0)}
      />
      <motion.path
        d={`M${L + 12} ${SHAFT - 2} V ${TOP + 32} A ${crownR - 12} ${crownR - 12} 0 0 1 ${R - 12} ${TOP + 32} V ${SHAFT - 2}`}
        strokeOpacity="0.6"
        {...line(1)}
      />
      <motion.circle cx={W / 2} cy={TOP + 14} r="6.5" {...line(1)} />
      <motion.path
        d={`M${W / 2 - 11} ${TOP + 20} A 11 11 0 0 0 ${W / 2 + 11} ${TOP + 20}`}
        strokeOpacity="0.85"
        {...line(2)}
      />

      {/* faces and recessed edges */}
      <motion.path d={`M${L} ${SHAFT} V ${BASE + 118} M${R} ${SHAFT} V ${BASE + 118}`} strokeWidth="1.8" {...line(2)} />
      <motion.path
        d={`M${L + 5} ${SHAFT} V ${BASE + 118} M${R - 5} ${SHAFT} V ${BASE + 118}`}
        strokeOpacity="0.35"
        strokeWidth="1"
        {...line(3)}
      />

      {floors.map((y, k) => {
        const on = k < lit;
        const wy = y + 30; // window top
        return (
          <g key={k}>
            {/* double timber beam with a row of monkey-head beam ends */}
            <motion.path
              d={`M${L} ${y} H ${R} M${L} ${y + 4} H ${R}`}
              strokeOpacity="0.7"
              strokeWidth="1.1"
              {...line(3 + k)}
            />
            {beamEnds(y + 12).map((b, j) => (
              <g key={j}>
                <motion.circle cx={b.cx} cy={b.cy} r="3.6" strokeWidth="1.2" {...line(3 + k)} />
                <circle cx={b.cx} cy={b.cy} r="1.1" fill="currentColor" stroke="none" opacity="0.7" />
              </g>
            ))}
            <motion.path d={`M${L} ${y + 20} H ${R}`} strokeOpacity="0.7" strokeWidth="1.1" {...line(3 + k)} />

            {/* central recessed panel between the windows */}
            <motion.path
              d={`M${W / 2 - 3} ${wy - 2} V ${y + FLOOR - 4} M${W / 2 + 3} ${wy - 2} V ${y + FLOOR - 4}`}
              strokeOpacity="0.3"
              strokeWidth="1"
              {...line(4 + k)}
            />

            {/* two false windows */}
            {[L + 14, W / 2 + 8].map((x) => (
              <g key={x}>
                {glow && (
                  <rect
                    x={x + 4}
                    y={wy + 4}
                    width="30"
                    height="28"
                    fill={`url(#lamp-${uid})`}
                    stroke="none"
                    className="transition-opacity duration-1000"
                    style={{ opacity: on ? 1 : 0, transitionDelay: on ? `${k * stagger}s` : "0s" }}
                  />
                )}
                {/* lintel with projecting ends, frame, recess, mullions, sill */}
                <motion.path d={`M${x - 4} ${wy - 3} H ${x + 42}`} strokeWidth="1.3" {...line(4 + k)} />
                <motion.rect x={x} y={wy} width="38" height="36" strokeWidth="1.5" {...line(4 + k)} />
                <motion.rect
                  x={x + 4}
                  y={wy + 4}
                  width="30"
                  height="28"
                  strokeOpacity="0.6"
                  strokeWidth="1"
                  {...line(5 + k)}
                />
                <motion.path
                  d={`M${x + 19} ${wy + 4} V ${wy + 32} M${x + 4} ${wy + 18} H ${x + 34}`}
                  strokeOpacity="0.45"
                  strokeWidth="0.9"
                  {...line(5 + k)}
                />
                <motion.path d={`M${x - 4} ${wy + 39} H ${x + 42}`} strokeWidth="1.3" {...line(5 + k)} />
              </g>
            ))}
          </g>
        );
      })}

      {/* door storey: beam row, false door with frame, lock and studs */}
      <motion.path
        d={`M${L} ${BASE} H ${R} M${L} ${BASE + 4} H ${R}`}
        strokeOpacity="0.7"
        strokeWidth="1.1"
        {...line(10)}
      />
      {beamEnds(BASE + 12).map((b, j) => (
        <g key={j}>
          <motion.circle cx={b.cx} cy={b.cy} r="3.6" strokeWidth="1.2" {...line(10)} />
          <circle cx={b.cx} cy={b.cy} r="1.1" fill="currentColor" stroke="none" opacity="0.7" />
        </g>
      ))}
      <motion.path d={`M${L} ${BASE + 20} H ${R}`} strokeOpacity="0.7" strokeWidth="1.1" {...line(10)} />
      <motion.path d={`M${W / 2 - 34} ${BASE + 30} H ${W / 2 + 34}`} strokeWidth="1.4" {...line(11)} />
      <motion.rect x={W / 2 - 28} y={BASE + 34} width="56" height="84" strokeWidth="1.7" {...line(11)} />
      <motion.rect
        x={W / 2 - 22}
        y={BASE + 40}
        width="44"
        height="78"
        strokeOpacity="0.6"
        strokeWidth="1"
        {...line(11)}
      />
      <motion.path d={`M${W / 2} ${BASE + 40} V ${BASE + 118}`} strokeOpacity="0.35" strokeWidth="0.9" {...line(12)} />
      <motion.circle cx={W / 2 + 12} cy={BASE + 80} r="3.2" strokeWidth="1.3" {...line(12)} />
      {[BASE + 54, BASE + 100].flatMap((sy) =>
        [W / 2 - 14, W / 2 - 6, W / 2 + 6, W / 2 + 14].map((sx) => (
          <circle key={`${sx}-${sy}`} cx={sx} cy={sy} r="1" fill="currentColor" stroke="none" opacity="0.6" />
        )),
      )}

      {/* stepped base platform */}
      <motion.path
        d={`M${L - 8} ${BASE + 118} H ${R + 8} V ${BASE + 127} H ${L - 16} V ${BASE + 136} H ${R + 16} V ${BASE + 145} H ${L - 24} V ${BASE + 136} M${L - 16} ${BASE + 127} V ${BASE + 118} M${R + 8} ${BASE + 118} V ${BASE + 127} M${R + 16} ${BASE + 136} V ${BASE + 145}`}
        strokeWidth="1.5"
        {...line(13)}
      />
    </svg>
  );
}
