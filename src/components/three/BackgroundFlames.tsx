"use client";

import dynamic from "next/dynamic";

const LatticeLamps = dynamic(() => import("./LatticeLamps"), { ssr: false });

/** Fixed layer just above the lattice backdrop and behind all content. */
export default function BackgroundFlames() {
  return (
    <div aria-hidden className="bg-flames pointer-events-none fixed inset-0 -z-10">
      <LatticeLamps />
    </div>
  );
}
