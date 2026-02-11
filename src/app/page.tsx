'use client';

import Nav from '@/components/landing/sections/Nav';
import Hero from '@/components/landing/sections/Hero';
import HowItWorks from '@/components/landing/sections/HowItWorks';
import Features from '@/components/landing/sections/Features';
import ChesterPersonality from '@/components/landing/sections/ChesterPersonality';
import Pricing from '@/components/landing/sections/Pricing';
import Footer from '@/components/landing/sections/Footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-[#E8E8E8]" style={{ fontSize: 15, lineHeight: 1.7 }}>
      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-[#9B7ED1] focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:outline-none"
      >
        Skip to content
      </a>

      <Nav />

      <main id="main">
        <Hero />
        <HowItWorks />
        <ChesterPersonality />
        <Features />
        <Pricing />
      </main>

      <Footer />
    </div>
  );
}
