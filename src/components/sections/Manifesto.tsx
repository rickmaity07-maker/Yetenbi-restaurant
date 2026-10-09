"use client";

import Image, { type StaticImageData } from "next/image";
import { motion, useMotionValue, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import baskets from "../../../public/img/baskets.jpg";
import platter from "../../../public/img/platter.jpg";
import pour from "../../../public/img/jebena-pour.jpg";
import Embers from "../motion/Embers";
import { Ambient, Label } from "../ui/primitives";

type Token = { word: string; gold?: boolean } | { img: StaticImageData; alt: string };

const words = (s: string, gold = false): Token[] => s.split(" ").map((word) => ({ word, gold }));

const tokens: Token[] = [
  ...words("Bei uns isst man mit den Händen"),
  { img: baskets, alt: "Injera im geflochtenen Korb" },
  ...words("von"),
  ...words("einer Platte,", true),
  { img: platter, alt: "Äthiopische Gerichte auf Injera" },
  ...words("und trinkt Kaffee, der"),
  ...words("dreimal", true),
  ...words("eingeschenkt wird"),
  { img: pour, alt: "Kaffee aus der Jebena" },
  ...words("Äthiopisch, mitten in Würzburg."),
];

function Word({ token, range, progress }: { token: Extract<Token, { word: string }>; range: [number, number]; progress: MotionValue<number> }) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className={`mr-[0.24em] inline-block ${token.gold ? "italic text-gold-soft" : ""}`}>
      {token.word}
    </motion.span>
  );
}

function Pill({ token, range, progress }: { token: Extract<Token, { img: StaticImageData }>; range: [number, number]; progress: MotionValue<number> }) {
  const scale = useTransform(progress, range, [0.3, 1]);
  const opacity = useTransform(progress, range, [0, 1]);
  return (
    <motion.span
      style={{ scale, opacity }}
      className="relative mr-[0.24em] inline-block h-[0.8em] w-[1.9em] overflow-hidden rounded-full align-[-0.06em] ring-1 ring-gold/40"
    >
      <Image src={token.img} alt={token.alt} fill sizes="180px" className="object-cover" />
    </motion.span>
  );
}

/** The house in one sentence: words light up in turn as it scrolls past, with photographs set into the type. */
export default function Manifesto() {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 45%"] });
  const lit = useMotionValue(1);
  const progress = reduce ? lit : scrollYProgress;

  return (
    <section id="willkommen" className="relative overflow-hidden py-32 md:py-48">
      <Ambient src={baskets} className="-right-[15%] top-0 h-full w-[70%]" opacity={0.4} />
      <Embers count={12} />
      <div className="relative z-10 mx-auto max-w-6xl px-5 md:px-8">
        <Label am="እንኳን ደህና መጡ">Willkommen bei Yetenbi</Label>
        <p
          ref={ref}
          aria-label="Bei uns isst man mit den Händen von einer Platte, und trinkt Kaffee, der dreimal eingeschenkt wird. Äthiopisch, mitten in Würzburg."
          className="mt-10 font-display text-[clamp(2.2rem,5vw,4.6rem)] font-medium leading-[1.14] tracking-tight text-cream"
        >
          {tokens.map((t, i) => {
            const range: [number, number] = [i / tokens.length, Math.min(1, (i + 1.5) / tokens.length)];
            return "img" in t ? (
              <Pill key={i} token={t} range={range} progress={progress} />
            ) : (
              <Word key={i} token={t} range={range} progress={progress} />
            );
          })}
        </p>
      </div>
    </section>
  );
}
