'use client';

import { motion } from 'framer-motion';
import ScrollReveal from '../animations/ScrollReveal';
import StaggerChildren, { staggerChildVariant } from '../animations/StaggerChildren';
import Section from '../ui/Section';

const quotes = [
  { move: 'You blunder your queen', chester: "That's... a choice." },
  { move: 'You play a brilliant fork', chester: 'Saw that. Nice.' },
  { move: 'You castle early', chester: 'Smart. Safety first.' },
  { move: 'You move your king to the center', chester: 'Bold. Very bold.' },
];

export default function ChesterPersonality() {
  return (
    <Section>
      <ScrollReveal>
        <h2 className="text-3xl md:text-5xl font-bold text-[#E8E8E8] text-center mb-4">
          Meet Chester
        </h2>
        <p className="text-[#888888] text-center max-w-[500px] mx-auto mb-16">
          He&apos;s not a coach. He&apos;s the friend watching your game who can&apos;t help but
          comment.
        </p>
      </ScrollReveal>

      <StaggerChildren className="max-w-[520px] mx-auto space-y-4">
        {quotes.map((q) => (
          <motion.div key={q.move} variants={staggerChildVariant}>
            {/* Player move */}
            <div className="flex justify-end mb-2">
              <div className="bg-[#1e1a2e] border border-[#1e1a2e] rounded-xl rounded-br-sm px-4 py-2.5 max-w-[80%]">
                <p className="text-[#888888] text-sm italic">{q.move}</p>
              </div>
            </div>
            {/* Chester response */}
            <div className="flex justify-start">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#9B7ED1]/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm">&#9818;</span>
                </div>
                <div className="bg-[#0a0a0a] border border-[#1e1a2e] rounded-xl rounded-bl-sm px-4 py-2.5">
                  <p className="text-[#E8E8E8] text-[15px]">{q.chester}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </StaggerChildren>
    </Section>
  );
}
