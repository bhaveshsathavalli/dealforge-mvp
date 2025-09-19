import { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}

export function SectionHeader({ title, subtitle, children, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between mb-6 ${className}`}>
      <div>
        <h2 className="text-xl font-semibold text-[var(--text)]">{title}</h2>
        {subtitle && (
          <p className="text-[var(--text-muted)] mt-1">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
