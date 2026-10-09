import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Intro from "@/components/intro/Intro";
import ScrollProgress from "@/components/motion/ScrollProgress";
import SideRail from "@/components/SideRail";
import Manifesto from "@/components/sections/Manifesto";
import Platte from "@/components/sections/Platte";
import MenuCard from "@/components/sections/MenuCard";
import Buna from "@/components/sections/Buna";
import Info from "@/components/sections/Info";
import ProverbBand from "@/components/sections/ProverbBand";
import Amharisch from "@/components/sections/Amharisch";
import Visit from "@/components/sections/Visit";
import Reservation from "@/components/sections/Reservation";
import Footer from "@/components/sections/Footer";
import StructuredData from "@/components/StructuredData";

export default function Home() {
  return (
    <>
      <StructuredData />
      <Intro />
      <ScrollProgress />
      <SideRail />
      <Header />
      {/* overflow-x-clip (not hidden) so the pinned platter and coffee rounds keep working */}
      <main id="main" className="w-full max-w-full flex-1 overflow-x-clip">
        <Hero />
        <Manifesto />
        <Platte />
        <MenuCard />
        <Buna />
        <ProverbBand />
        <Info />
        <Amharisch />
        <Visit />
        <Reservation />
      </main>
      <Footer />
    </>
  );
}
