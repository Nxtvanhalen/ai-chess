'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: Variant;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const baseStyles =
  'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#9B7ED1] focus:ring-offset-2 focus:ring-offset-black';

const variants: Record<Variant, string> = {
  primary:
    'bg-[#9B7ED1] text-white hover:bg-[#7a5fbf] shadow-lg shadow-[#9B7ED1]/20 hover:shadow-[#9B7ED1]/40',
  secondary:
    'border border-[#9B7ED1]/40 text-[#9B7ED1] hover:bg-[#9B7ED1]/10 hover:border-[#9B7ED1]/60',
  ghost: 'text-[#888888] hover:text-[#E8E8E8]',
};

const sizes: Record<string, string> = {
  sm: 'px-4 py-2 text-sm rounded-lg',
  md: 'px-6 py-3 text-base rounded-xl',
  lg: 'px-8 py-4 text-lg rounded-xl',
};

export default function Button({
  children,
  href,
  onClick,
  variant = 'primary',
  className = '',
  size = 'md',
}: ButtonProps) {
  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    return (
      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
        <Link href={href} className={classes}>
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={classes}
    >
      {children}
    </motion.button>
  );
}
