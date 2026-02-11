import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-[#1e1a2e] py-12 px-6">
      <div className="max-w-[1024px] mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-xl">&#9818;</span>
            <span className="text-[#E8E8E8] font-bold">Chester AI Chess</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/play"
              className="text-[#666666] hover:text-[#E8E8E8] transition-colors"
            >
              Play
            </Link>
            <Link
              href="/pricing"
              className="text-[#666666] hover:text-[#E8E8E8] transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/legal/privacy"
              className="text-[#666666] hover:text-[#E8E8E8] transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/legal/terms"
              className="text-[#666666] hover:text-[#E8E8E8] transition-colors"
            >
              Terms
            </Link>
          </nav>

          {/* Copyright */}
          <p className="text-[#666666] text-sm">
            &copy; {new Date().getFullYear()} Chester AI Chess
          </p>
        </div>
      </div>
    </footer>
  );
}
