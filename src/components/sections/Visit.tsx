"use client";

import Image from "next/image";
import { ArrowUpRight } from "@phosphor-icons/react";
import jebenaSet from "../../../public/img/jebena-set.jpg";
import cups from "../../../public/img/cups.jpg";
import { openingHours, restaurant } from "@/lib/data";
import Embers from "../motion/Embers";
import { Ambient, CinematicImage, GoldButton, Heading, Rise } from "../ui/primitives";
import { AksumFrame } from "../heritage/Ornaments";
import EthiopianNow from "../heritage/EthiopianNow";

export default function Visit() {
  const rows = [
    { term: "Geöffnet", value: `${openingHours[0].day}, ${openingHours[0].time}` },
    { term: "Telefon", value: restaurant.phone, href: restaurant.phoneHref },
    { term: "Service", value: "Vor Ort, Abholung, Lieferung" },
  ];

  return (
    <section id="besuch" className="relative overflow-hidden py-32 md:py-44 [content-visibility:auto] [contain-intrinsic-size:auto_900px]">
      <Ambient src={jebenaSet} className="-left-[20%] top-[10%] h-[80%] w-[60%]" opacity={0.45} />
      <Ambient src={cups} className="-right-[15%] top-[30%] h-[70%] w-[60%]" opacity={0.3} />
      <Embers count={12} />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <Heading label="Anfahrt" title="Theaterstraße 6," em="Würzburg." size="md" />

        <div className="mt-16 grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Arch photo with the facts */}
          <div className="grid grid-cols-1 items-end gap-8 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:col-span-5 lg:grid-cols-1">
            <AksumFrame>
              <CinematicImage
                src={jebenaSet}
                alt="Jebena und Tassen für die Kaffeezeremonie"
                className="aspect-[4/5] lg:aspect-[5/4]"
                sizes="(min-width: 1024px) 35vw, 45vw"
              />
            </AksumFrame>
            <dl className="space-y-5">
              {rows.map((r, i) => (
                <Rise key={r.term} delay={i * 0.08}>
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-gold">{r.term}</dt>
                  <dd className="mt-1 font-display text-xl text-cream md:text-2xl">
                    {r.href ? (
                      <a href={r.href} className="transition-colors duration-500 hover:text-gold-soft">
                        {r.value}
                      </a>
                    ) : (
                      r.value
                    )}
                  </dd>
                </Rise>
              ))}
              <Rise delay={0.25} className="border-t border-gold/20 pt-6">
                <EthiopianNow />
              </Rise>
              <Rise delay={0.3} className="pt-2">
                <GoldButton href={restaurant.mapsUrl} external>
                  Route planen
                </GoldButton>
              </Rise>
            </dl>
          </div>

          {/* Framed map */}
          <Rise className="lg:col-span-7" delay={0.15}>
            <AksumFrame className="h-full shadow-[0_60px_140px_-40px_rgba(201,162,74,0.28)]" inner="h-full">
              <div className="relative h-full">
                <iframe
                  title="Karte: Yetenbi, Theaterstraße 6, Würzburg"
                  src={restaurant.mapsEmbed}
                  className="block h-[420px] w-full [filter:invert(0.92)_hue-rotate(180deg)_saturate(0.3)_sepia(0.35)] lg:h-full lg:min-h-[600px]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <a
                  href={restaurant.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group absolute bottom-4 left-4 flex items-center gap-3 border border-gold/40 bg-ink/90 py-2 pl-2 pr-4"
                >
                  <span className="relative h-12 w-12 overflow-hidden">
                    <Image src={cups} alt="" fill sizes="48px" className="object-cover" />
                  </span>
                  <span>
                    <span className="block font-display text-lg leading-tight text-cream">Yetenbi</span>
                    <span className="text-xs text-cream/68">Nahe Mainfranken Theater</span>
                  </span>
                  <ArrowUpRight size={16} className="text-gold-soft transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              </div>
            </AksumFrame>
          </Rise>
        </div>
      </div>
    </section>
  );
}
