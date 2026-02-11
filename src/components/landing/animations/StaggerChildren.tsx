'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface StaggerChildrenProps {
  children: ReactNode;
  className?: string;
  stagger?: number;
}

const container = {
  hidden: {},
  visible: (stagger: number) => ({
    transition: {
      staggerChildren: stagger,
    },
  }),
};

const child = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number],
    },
  },
};

export { child as staggerChildVariant };

export default function StaggerChildren({
  children,
  className = '',
  stagger = 0.12,
}: StaggerChildrenProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      custom={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}
