'use client';

import ScrollReveal from '../animations/ScrollReveal';
import StaggerChildren from '../animations/StaggerChildren';
import Card from '../ui/Card';
import Section from '../ui/Section';

const features = [
  {
    emoji: '🧠',
    title: 'AI That Adapts to You',
    description:
      'Elo-rated difficulty that scales automatically. Below 1000? Easy mode. Climbing past 1400? Chester brings the heat.',
  },
  {
    emoji: '🗣️',
    title: 'Real Personality',
    description:
      "Chester isn't a generic chatbot. He's dry, witty, and occasionally roasts your blunders. \"That's... a choice.\"",
  },
  {
    emoji: '📊',
    title: 'Live Move Analysis',
    description:
      'Every move gets evaluated in real time. Chester explains what happened, what you missed, and what to watch for.',
  },
  {
    emoji: '🎨',
    title: '8 Board Themes',
    description:
      'From classic wood grain to volcanic Obsidian. Your choice syncs across all your devices.',
  },
  {
    emoji: '📱',
    title: 'Play Anywhere',
    description:
      'Full PWA — install on your phone like a native app. Start a game on desktop, pick it up on mobile.',
  },
  {
    emoji: '🧬',
    title: 'Game Memory',
    description:
      'Chester remembers your play style across games. He tracks patterns, adapts commentary, and builds rapport over time.',
  },
];

export default function Features() {
  return (
    <Section id="features">
      <ScrollReveal>
        <h2 className="text-3xl md:text-5xl font-bold text-[#E8E8E8] text-center mb-4">
          Not Your Average Chess App
        </h2>
        <p className="text-[#888888] text-center max-w-[500px] mx-auto mb-16">
          Built for players who want more than a silent opponent.
        </p>
      </ScrollReveal>

      <StaggerChildren className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f) => (
          <Card key={f.title}>
            <div className="text-3xl mb-4">{f.emoji}</div>
            <h3 className="text-lg font-bold text-[#E8E8E8] mb-2">{f.title}</h3>
            <p className="text-[#888888] text-[15px] leading-relaxed">{f.description}</p>
          </Card>
        ))}
      </StaggerChildren>
    </Section>
  );
}
