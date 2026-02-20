'use client';

import { motion } from 'framer-motion';
import FadeIn from '../animations/FadeIn';
import Button from '../ui/Button';

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-6 pt-16 overflow-hidden">
      {/* Radial purple glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(155, 126, 209, 0.07) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-[1024px] mx-auto text-center relative z-10">
        <FadeIn delay={0.1}>
          <p className="text-[#9B7ED1] text-sm font-semibold tracking-widest uppercase mb-6">
            AI-Powered Chess Companion
          </p>
        </FadeIn>

        <FadeIn delay={0.2}>
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-[84px] font-bold text-[#E8E8E8] leading-[1.1] mb-6">
            Play Chess with a
            <br />
            <span className="text-[#9B7ED1]">Witty AI Buddy</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.35}>
          <p className="text-[#888888] text-lg md:text-xl max-w-[600px] mx-auto mb-10 leading-relaxed">
            Chester watches your games, drops sarcastic commentary, and quietly makes you a better
            player. No lectures. No boring tutorials. Just chess with personality.
          </p>
        </FadeIn>

        <FadeIn delay={0.5}>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button href="/play" size="lg">
              Start Playing — It&apos;s Free
            </Button>
            <Button href="#how-it-works" variant="secondary" size="lg">
              See How It Works
            </Button>
          </div>
        </FadeIn>

        {/* Floating chess pieces */}
        <div className="relative mt-16 select-none" aria-hidden="true">
          {['♔', '♕', '♗', '♘', '♖'].map((piece, i) => (
            <motion.span
              key={i}
              className="absolute text-4xl md:text-5xl opacity-[0.06]"
              style={{
                left: `${15 + i * 17}%`,
                top: `${Math.sin(i * 1.5) * 20}px`,
              }}
              animate={{
                y: [0, -12, 0],
                rotate: [0, i % 2 === 0 ? 5 : -5, 0],
              }}
              transition={{
                duration: 4 + i * 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.3,
              }}
            >
              {piece}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
