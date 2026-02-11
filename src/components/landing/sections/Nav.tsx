'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Nav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-[#1e1a2e] bg-black/70 backdrop-blur-xl"
    >
      <div className="max-w-[1024px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">&#9818;</span>
          <span className="text-[#E8E8E8] font-bold text-lg group-hover:text-[#9B7ED1] transition-colors">
            Chester
          </span>
        </Link>

        {/* Nav links (hidden mobile) */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            className="text-[#888888] hover:text-[#E8E8E8] transition-colors text-sm"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-[#888888] hover:text-[#E8E8E8] transition-colors text-sm"
          >
            How It Works
          </a>
          <a
            href="#pricing"
            className="text-[#888888] hover:text-[#E8E8E8] transition-colors text-sm"
          >
            Pricing
          </a>
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-[#888888] hover:text-[#E8E8E8] transition-colors text-sm hidden sm:inline"
          >
            Log In
          </Link>
          <Link
            href="/play"
            className="bg-[#9B7ED1] hover:bg-[#7a5fbf] text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors shadow-lg shadow-[#9B7ED1]/20"
          >
            Play Free
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
