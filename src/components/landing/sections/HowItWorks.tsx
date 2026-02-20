'use client';

import { motion } from 'framer-motion';
import ScrollReveal from '../animations/ScrollReveal';
import StaggerChildren, { staggerChildVariant } from '../animations/StaggerChildren';
import Section from '../ui/Section';

const steps = [
  {
    emoji: '♟️',
    title: 'Make Your Move',
    description:
      'Play white against an adaptive AI engine. It matches your skill level — the better you get, the harder it plays.',
  },
  {
    emoji: '💬',
    title: 'Chester Reacts',
    description:
      'Your AI buddy watches every move and drops real-time commentary. Sometimes helpful, sometimes sarcastic — always honest.',
  },
  {
    emoji: '📈',
    title: 'Get Better',
    description:
      'Your Elo rating tracks your progress. Chester remembers your play style and adapts his coaching as you improve.',
  },
];

export default function HowItWorks() {
  return (
    <Section id="how-it-works">
      <ScrollReveal>
        <h2 className="text-3xl md:text-5xl font-bold text-[#E8E8E8] text-center mb-4">
          How It Works
        </h2>
        <p className="text-[#888888] text-center max-w-[500px] mx-auto mb-16">
          Three steps. Zero setup. Just you, a chessboard, and an AI with opinions.
        </p>
      </ScrollReveal>

      <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {steps.map((step, i) => (
          <motion.div key={step.title} variants={staggerChildVariant} className="text-center">
            <div className="text-5xl mb-5">{step.emoji}</div>
            <div className="text-[#9B7ED1] text-sm font-semibold mb-2">Step {i + 1}</div>
            <h3 className="text-xl font-bold text-[#E8E8E8] mb-3">{step.title}</h3>
            <p className="text-[#888888] leading-relaxed text-[15px]">{step.description}</p>
          </motion.div>
        ))}
      </StaggerChildren>
    </Section>
  );
}
