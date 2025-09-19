import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  className = '' 
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {icon && (
        <div className="mb-4 text-[var(--text-subtle)]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--text)] mb-2">{title}</h3>
      {description && (
        <p className="text-[var(--text-muted)] mb-6 max-w-md">{description}</p>
      )}
      {action && action}
    </div>
  );
}
