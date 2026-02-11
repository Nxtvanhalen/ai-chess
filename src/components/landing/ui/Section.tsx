import type { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export default function Section({ children, className = '', id }: SectionProps) {
  return (
    <section id={id} className={`py-20 md:py-28 px-6 ${className}`}>
      <div className="max-w-[1024px] mx-auto">{children}</div>
    </section>
  );
}
