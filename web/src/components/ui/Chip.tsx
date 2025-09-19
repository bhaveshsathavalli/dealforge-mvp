import { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Chip({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className = '' 
}: ChipProps) {
  const baseClasses = 'inline-flex items-center rounded-full font-medium';
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const variantClasses = {
    default: 'bg-[var(--surface)] text-[var(--text)] border border-[var(--border)]',
    primary: 'bg-[var(--primary)] text-[var(--text)]',
    success: 'bg-[var(--success)] text-white',
    warning: 'bg-[var(--warning)] text-white',
    danger: 'bg-[var(--danger)] text-white'
  };

  return (
    <span className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
