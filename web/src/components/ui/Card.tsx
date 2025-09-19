import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-[var(--surface)] border border-[var(--border)] rounded-lg ${className}`}>
      {children}
    </div>
  );
}
