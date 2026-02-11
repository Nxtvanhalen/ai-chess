'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { staggerChildVariant } from '../animations/StaggerChildren';

interface CardProps {
  children: ReactNode;
  className?: string;
  highlight?: boolean;
}

export default function Card({ children, className = '', highlight = false }: CardProps) {
  return (
    <motion.div
      variants={staggerChildVariant}
      whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(155, 126, 209, 0.15)' }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl border p-6 transition-colors ${
        highlight
          ? 'border-[#9B7ED1]/50 bg-[#9B7ED1]/5'
          : 'border-[#1e1a2e] bg-[#0a0a0a]'
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}
