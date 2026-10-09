import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit, Noto_Sans_Ethiopic } from "next/font/google";
import SmoothScroll from "@/components/motion/SmoothScroll";
import { IntroProvider } from "@/components/intro/IntroState";
import BackgroundFlames from "@/components/three/BackgroundFlames";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const ethiopic = Noto_Sans_Ethiopic({
  variable: "--font-noto-ethiopic",
  subsets: ["ethiopic"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Yetenbi | Äthiopisches Restaurant & Café in Würzburg",
  description:
    "Authentisch äthiopische Küche und traditionelle Kaffeezeremonie in der Theaterstraße 6, Würzburg. Kitfo, Tibs, Wot, vegane Beyaynetu und frische Jebena Buna.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${cormorant.variable} ${outfit.variable} ${ethiopic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[110] focus:rounded-full focus:bg-gold focus:px-5 focus:py-2.5 focus:text-ink"
        >
          Zum Inhalt springen
        </a>
        <div aria-hidden className="site-bg pointer-events-none fixed inset-0 -z-10 will-change-transform" />
        <BackgroundFlames />
        <SmoothScroll>
          <IntroProvider>{children}</IntroProvider>
        </SmoothScroll>
        <div aria-hidden className="grain pointer-events-none fixed inset-0 z-[90] hidden opacity-[0.035] md:block" />
      </body>
    </html>
  );
}
