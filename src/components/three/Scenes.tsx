"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { useNearViewport } from "./useInView";

// WebGL only exists in the browser; the scene's code (and three.js) is fetched only once it is about to be seen.
const Jebena3DScene = dynamic(() => import("./Jebena3D"), { ssr: false });

export function Jebena3D({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useNearViewport(ref, "600px");
  return (
    <div ref={ref} className={className}>
      {near && <Jebena3DScene className="h-full w-full" />}
    </div>
  );
}
